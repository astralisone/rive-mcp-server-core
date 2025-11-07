/**
 * S3 storage implementation
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageConfig, StorageListOptions, StorageMetadata } from '../../../../libs/types';
import { BaseStorage } from './base';

export class S3Storage extends BaseStorage {
  private client: S3Client;
  private bucket: string;
  private manifestPrefix: string;
  private assetsPrefix: string;

  constructor(config: StorageConfig['s3'], cacheEnabled: boolean = true, cacheTTL: number = 300) {
    super(cacheEnabled, cacheTTL);

    if (!config?.bucket) {
      throw new Error('S3 storage requires bucket configuration');
    }

    const clientConfig: any = {
      region: config.region || 'us-east-1',
    };

    // Add credentials if provided
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    // Add custom endpoint if provided (for S3-compatible services)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
    this.bucket = config.bucket;
    this.manifestPrefix = config.manifestPrefix || 'manifests';
    this.assetsPrefix = config.assetsPrefix || 'assets';
  }

  async initialize(): Promise<void> {
    // Verify bucket access by attempting to list objects
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        })
      );
    } catch (error) {
      throw new Error(`Failed to access S3 bucket ${this.bucket}: ${error}`);
    }
  }

  getBackendType(): 's3' {
    return 's3';
  }

  /**
   * Resolve S3 key from relative path
   */
  private resolveKey(relativePath: string): string {
    // Check if it's a manifest or asset path
    if (relativePath.startsWith('components/') || relativePath.startsWith('libraries/') || relativePath === 'index.json') {
      return `${this.manifestPrefix}/${relativePath}`;
    }
    return `${this.assetsPrefix}/${relativePath}`;
  }

  /**
   * Read raw data from S3
   */
  protected async readRaw(relativePath: string): Promise<Buffer> {
    const key = this.resolveKey(relativePath);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to read S3 object ${key}: ${error}`);
    }
  }

  /**
   * Write raw data to S3
   */
  protected async writeRaw(relativePath: string, data: Buffer): Promise<void> {
    const key = this.resolveKey(relativePath);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: this.getContentType(relativePath),
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to write S3 object ${key}: ${error}`);
    }
  }

  /**
   * List objects in S3
   */
  protected async listRaw(prefix: string, options?: StorageListOptions): Promise<string[]> {
    const key = this.resolveKey(prefix);

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: key,
        MaxKeys: options?.maxResults || 1000,
      });

      const response = await this.client.send(command);
      const items: string[] = [];

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            // Remove prefix to get relative path
            const relativePath = item.Key.replace(key, '');
            if (relativePath) {
              items.push(relativePath);
            }
          }
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to list S3 objects with prefix ${key}: ${error}`);
    }
  }

  /**
   * Get S3 object metadata
   */
  protected async getMetadataRaw(relativePath: string): Promise<StorageMetadata> {
    const key = this.resolveKey(relativePath);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        etag: response.ETag,
        customMetadata: response.Metadata,
      };
    } catch (error) {
      throw new Error(`Failed to get metadata for S3 object ${key}: ${error}`);
    }
  }

  /**
   * Check if S3 object exists
   */
  protected async existsRaw(relativePath: string): Promise<boolean> {
    try {
      await this.getMetadataRaw(relativePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete S3 object
   */
  protected async deleteRaw(relativePath: string): Promise<void> {
    const key = this.resolveKey(relativePath);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete S3 object ${key}: ${error}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      riv: 'application/octet-stream',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}
