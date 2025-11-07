/**
 * Remote HTTP/HTTPS storage implementation
 * Read-only storage for fetching manifests and assets from remote URLs
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { StorageConfig, StorageListOptions, StorageMetadata } from '../../../../libs/types';
import { BaseStorage } from './base';

export class RemoteStorage extends BaseStorage {
  private manifestUrl: string;
  private assetBaseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: StorageConfig['remote'], cacheEnabled: boolean = true, cacheTTL: number = 300) {
    super(cacheEnabled, cacheTTL);

    if (!config?.manifestUrl) {
      throw new Error('Remote storage requires manifestUrl configuration');
    }

    this.manifestUrl = config.manifestUrl;
    this.assetBaseUrl = config.assetBaseUrl || config.manifestUrl;
    this.headers = config.headers || {};
    this.timeout = config.timeout || 30000;
  }

  async initialize(): Promise<void> {
    // Verify remote access by fetching the index
    try {
      await this.readIndex();
    } catch (error) {
      throw new Error(`Failed to access remote manifest at ${this.manifestUrl}: ${error}`);
    }
  }

  getBackendType(): 'remote' {
    return 'remote';
  }

  /**
   * Resolve URL from relative path
   */
  private resolveUrl(relativePath: string): string {
    // For index and manifest paths
    if (relativePath.startsWith('components/') || relativePath.startsWith('libraries/') || relativePath === 'index.json') {
      const baseUrl = this.manifestUrl.endsWith('/') ? this.manifestUrl : `${this.manifestUrl}/`;
      return `${baseUrl}${relativePath}`;
    }

    // For asset paths
    const baseUrl = this.assetBaseUrl.endsWith('/') ? this.assetBaseUrl : `${this.assetBaseUrl}/`;
    return `${baseUrl}${relativePath}`;
  }

  /**
   * Fetch data from remote URL
   */
  private async fetch(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        method: 'GET',
        headers: this.headers,
        timeout: this.timeout,
      };

      const req = client.get(url, options, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            return this.fetch(redirectUrl).then(resolve).catch(reject);
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        res.on('error', reject);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });
    });
  }

  /**
   * Read raw data from remote URL
   */
  protected async readRaw(relativePath: string): Promise<Buffer> {
    const url = this.resolveUrl(relativePath);

    try {
      return await this.fetch(url);
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error}`);
    }
  }

  /**
   * Write operations are not supported for remote storage
   */
  protected async writeRaw(_relativePath: string, _data: Buffer): Promise<void> {
    throw new Error('Write operations are not supported for remote storage');
  }

  /**
   * List operations require the index for remote storage
   */
  protected async listRaw(prefix: string, options?: StorageListOptions): Promise<string[]> {
    try {
      const index = await this.readIndex();
      const items: string[] = [];

      if (prefix.startsWith('components/')) {
        items.push(...Object.keys(index.components));
      } else if (prefix.startsWith('libraries/')) {
        items.push(...Object.keys(index.libraries));
      }

      return items.slice(0, options?.maxResults);
    } catch (error) {
      throw new Error(`Failed to list remote items with prefix ${prefix}: ${error}`);
    }
  }

  /**
   * Get metadata by making a HEAD request
   */
  protected async getMetadataRaw(relativePath: string): Promise<StorageMetadata> {
    const url = this.resolveUrl(relativePath);

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        method: 'HEAD',
        headers: this.headers,
        timeout: this.timeout,
      };

      const req = client.request(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        const lastModified = res.headers['last-modified']
          ? new Date(res.headers['last-modified'])
          : new Date();

        resolve({
          size: contentLength,
          lastModified,
          contentType: res.headers['content-type'],
          etag: res.headers['etag'],
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.end();
    });
  }

  /**
   * Check if remote resource exists
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
   * Delete operations are not supported for remote storage
   */
  protected async deleteRaw(_relativePath: string): Promise<void> {
    throw new Error('Delete operations are not supported for remote storage');
  }
}
