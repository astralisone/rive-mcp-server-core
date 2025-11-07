/**
 * Base storage implementation with common functionality
 */

import {
  IStorageBackend,
  ICache,
  StorageReadOptions,
  StorageWriteOptions,
  StorageListOptions,
  StorageMetadata,
  RiveComponentManifest,
  RiveLibraryManifest,
  ManifestIndex,
} from '../../../../libs/types';
import { MemoryCache } from './cache';

export abstract class BaseStorage implements IStorageBackend {
  protected cache: ICache;
  protected cacheEnabled: boolean;
  protected cacheTTL: number;

  constructor(cacheEnabled: boolean = true, cacheTTL: number = 300) {
    this.cache = new MemoryCache(cacheTTL);
    this.cacheEnabled = cacheEnabled;
    this.cacheTTL = cacheTTL;
  }

  abstract initialize(): Promise<void>;
  abstract getBackendType(): 'local' | 's3' | 'remote';

  // Abstract methods that must be implemented by subclasses
  protected abstract readRaw(path: string): Promise<Buffer>;
  protected abstract writeRaw(path: string, data: Buffer): Promise<void>;
  protected abstract listRaw(prefix: string, options?: StorageListOptions): Promise<string[]>;
  protected abstract getMetadataRaw(path: string): Promise<StorageMetadata>;
  protected abstract existsRaw(path: string): Promise<boolean>;
  protected abstract deleteRaw(path: string): Promise<void>;

  /**
   * Read JSON data with caching support
   */
  protected async readJSON<T>(path: string, options?: StorageReadOptions): Promise<T> {
    const cacheKey = `json:${path}`;

    // Check cache first
    if (this.cacheEnabled && options?.useCache !== false) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    // Read from storage
    const buffer = await this.readRaw(path);
    const data = JSON.parse(buffer.toString('utf-8')) as T;

    // Cache the result
    if (this.cacheEnabled) {
      await this.cache.set(cacheKey, data);
    }

    return data;
  }

  /**
   * Write JSON data
   */
  protected async writeJSON<T>(path: string, data: T, options?: StorageWriteOptions): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(json, 'utf-8');
    await this.writeRaw(path, buffer);

    // Update cache
    if (this.cacheEnabled) {
      const cacheKey = `json:${path}`;
      await this.cache.set(cacheKey, data);
    }
  }

  /**
   * Read the manifest index
   */
  async readIndex(options?: StorageReadOptions): Promise<ManifestIndex> {
    return this.readJSON<ManifestIndex>('index.json', options);
  }

  /**
   * Write the manifest index
   */
  async writeIndex(index: ManifestIndex, options?: StorageWriteOptions): Promise<void> {
    index.lastUpdated = new Date().toISOString();
    await this.writeJSON('index.json', index, options);
  }

  /**
   * Read a component manifest
   */
  async readComponentManifest(componentId: string, options?: StorageReadOptions): Promise<RiveComponentManifest> {
    const path = `components/${componentId}/manifest.json`;
    return this.readJSON<RiveComponentManifest>(path, options);
  }

  /**
   * Write a component manifest
   */
  async writeComponentManifest(manifest: RiveComponentManifest, options?: StorageWriteOptions): Promise<void> {
    const path = `components/${manifest.id}/manifest.json`;
    manifest.updatedAt = new Date().toISOString();
    await this.writeJSON(path, manifest, options);

    // Update index if requested
    if (options?.updateIndex) {
      await this.updateIndexWithComponent(manifest);
    }
  }

  /**
   * Read a library manifest
   */
  async readLibraryManifest(libraryId: string, options?: StorageReadOptions): Promise<RiveLibraryManifest> {
    const path = `libraries/${libraryId}/manifest.json`;
    return this.readJSON<RiveLibraryManifest>(path, options);
  }

  /**
   * Write a library manifest
   */
  async writeLibraryManifest(manifest: RiveLibraryManifest, options?: StorageWriteOptions): Promise<void> {
    const path = `libraries/${manifest.id}/manifest.json`;
    manifest.updatedAt = new Date().toISOString();
    await this.writeJSON(path, manifest, options);

    // Update index if requested
    if (options?.updateIndex) {
      await this.updateIndexWithLibrary(manifest);
    }
  }

  /**
   * Read a Rive asset file
   */
  async readAsset(assetPath: string, options?: StorageReadOptions): Promise<Buffer> {
    const cacheKey = `asset:${assetPath}`;

    // Check cache first
    if (this.cacheEnabled && options?.useCache !== false) {
      const cached = await this.cache.get<Buffer>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    // Read from storage
    const buffer = await this.readRaw(assetPath);

    // Cache the result
    if (this.cacheEnabled) {
      await this.cache.set(cacheKey, buffer);
    }

    return buffer;
  }

  /**
   * Write a Rive asset file
   */
  async writeAsset(assetPath: string, data: Buffer, options?: StorageWriteOptions): Promise<void> {
    await this.writeRaw(assetPath, data);

    // Update cache
    if (this.cacheEnabled) {
      const cacheKey = `asset:${assetPath}`;
      await this.cache.set(cacheKey, data);
    }
  }

  /**
   * List all components
   */
  async listComponents(options?: StorageListOptions): Promise<string[]> {
    return this.listRaw('components/', options);
  }

  /**
   * List all libraries
   */
  async listLibraries(options?: StorageListOptions): Promise<string[]> {
    return this.listRaw('libraries/', options);
  }

  /**
   * Get storage metadata for a file
   */
  async getMetadata(path: string): Promise<StorageMetadata> {
    return this.getMetadataRaw(path);
  }

  /**
   * Check if a file exists
   */
  async exists(path: string): Promise<boolean> {
    return this.existsRaw(path);
  }

  /**
   * Delete a file
   */
  async delete(path: string): Promise<void> {
    await this.deleteRaw(path);

    // Remove from cache
    const jsonCacheKey = `json:${path}`;
    const assetCacheKey = `asset:${path}`;
    await this.cache.delete(jsonCacheKey);
    await this.cache.delete(assetCacheKey);
  }

  /**
   * Update index with a component
   */
  private async updateIndexWithComponent(component: RiveComponentManifest): Promise<void> {
    try {
      const index = await this.readIndex({ useCache: false });
      index.components[component.id] = component;
      await this.writeIndex(index);
    } catch (error) {
      // If index doesn't exist, create a new one
      const index: ManifestIndex = {
        libraries: {},
        components: { [component.id]: component },
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };
      await this.writeIndex(index);
    }
  }

  /**
   * Update index with a library
   */
  private async updateIndexWithLibrary(library: RiveLibraryManifest): Promise<void> {
    try {
      const index = await this.readIndex({ useCache: false });
      index.libraries[library.id] = library;
      await this.writeIndex(index);
    } catch (error) {
      // If index doesn't exist, create a new one
      const index: ManifestIndex = {
        libraries: { [library.id]: library },
        components: {},
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };
      await this.writeIndex(index);
    }
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}
