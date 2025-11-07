/**
 * Local filesystem storage implementation
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageConfig, StorageListOptions, StorageMetadata } from '../../../../libs/types';
import { BaseStorage } from './base';

export class LocalStorage extends BaseStorage {
  private basePath: string;
  private manifestPath: string;
  private assetsPath: string;

  constructor(config: StorageConfig['local'], cacheEnabled: boolean = true, cacheTTL: number = 300) {
    super(cacheEnabled, cacheTTL);

    if (!config?.basePath) {
      throw new Error('Local storage requires basePath configuration');
    }

    this.basePath = config.basePath;
    this.manifestPath = config.manifestPath || 'manifests';
    this.assetsPath = config.assetsPath || 'assets';
  }

  async initialize(): Promise<void> {
    // Create base directories if they don't exist
    await this.ensureDirectory(this.basePath);
    await this.ensureDirectory(path.join(this.basePath, this.manifestPath));
    await this.ensureDirectory(path.join(this.basePath, this.assetsPath));
    await this.ensureDirectory(path.join(this.basePath, this.manifestPath, 'components'));
    await this.ensureDirectory(path.join(this.basePath, this.manifestPath, 'libraries'));
  }

  getBackendType(): 'local' {
    return 'local';
  }

  /**
   * Resolve a path relative to the base path
   */
  private resolvePath(relativePath: string): string {
    // Check if it's a manifest or asset path
    if (relativePath.startsWith('components/') || relativePath.startsWith('libraries/') || relativePath === 'index.json') {
      return path.join(this.basePath, this.manifestPath, relativePath);
    }
    return path.join(this.basePath, this.assetsPath, relativePath);
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Read raw data from filesystem
   */
  protected async readRaw(relativePath: string): Promise<Buffer> {
    const fullPath = this.resolvePath(relativePath);
    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`Failed to read file ${relativePath}: ${error}`);
    }
  }

  /**
   * Write raw data to filesystem
   */
  protected async writeRaw(relativePath: string, data: Buffer): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await this.ensureDirectory(dir);

    try {
      await fs.writeFile(fullPath, data);
    } catch (error) {
      throw new Error(`Failed to write file ${relativePath}: ${error}`);
    }
  }

  /**
   * List files in a directory
   */
  protected async listRaw(prefix: string, options?: StorageListOptions): Promise<string[]> {
    const fullPath = this.resolvePath(prefix);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const items: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const relativePath = path.join(prefix, entry.name);
          items.push(relativePath);

          // Recursively list subdirectories if needed
          if (!options?.maxResults || items.length < options.maxResults) {
            const subItems = await this.listRaw(relativePath + '/', options);
            items.push(...subItems);
          }
        }
      }

      return items.slice(0, options?.maxResults);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list directory ${prefix}: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  protected async getMetadataRaw(relativePath: string): Promise<StorageMetadata> {
    const fullPath = this.resolvePath(relativePath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        contentType: this.getContentType(relativePath),
      };
    } catch (error) {
      throw new Error(`Failed to get metadata for ${relativePath}: ${error}`);
    }
  }

  /**
   * Check if a file exists
   */
  protected async existsRaw(relativePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(relativePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  protected async deleteRaw(relativePath: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete file ${relativePath}: ${error}`);
      }
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.json': 'application/json',
      '.riv': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}
