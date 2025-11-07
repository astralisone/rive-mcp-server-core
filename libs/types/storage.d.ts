/**
 * Storage Interface Type Definitions
 */

import { RiveComponentManifest, RiveLibraryManifest, ManifestIndex } from './manifest';

export interface StorageReadOptions {
  useCache?: boolean;
  timeout?: number;
}

export interface StorageWriteOptions {
  overwrite?: boolean;
  updateIndex?: boolean;
}

export interface StorageListOptions {
  prefix?: string;
  maxResults?: number;
  includeMetadata?: boolean;
}

export interface StorageMetadata {
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Abstract storage interface for manifest and asset management
 */
export interface IStorageBackend {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<void>;

  /**
   * Read the manifest index
   */
  readIndex(options?: StorageReadOptions): Promise<ManifestIndex>;

  /**
   * Write the manifest index
   */
  writeIndex(index: ManifestIndex, options?: StorageWriteOptions): Promise<void>;

  /**
   * Read a component manifest
   */
  readComponentManifest(componentId: string, options?: StorageReadOptions): Promise<RiveComponentManifest>;

  /**
   * Write a component manifest
   */
  writeComponentManifest(manifest: RiveComponentManifest, options?: StorageWriteOptions): Promise<void>;

  /**
   * Read a library manifest
   */
  readLibraryManifest(libraryId: string, options?: StorageReadOptions): Promise<RiveLibraryManifest>;

  /**
   * Write a library manifest
   */
  writeLibraryManifest(manifest: RiveLibraryManifest, options?: StorageWriteOptions): Promise<void>;

  /**
   * Read a Rive asset file
   */
  readAsset(assetPath: string, options?: StorageReadOptions): Promise<Buffer>;

  /**
   * Write a Rive asset file
   */
  writeAsset(assetPath: string, data: Buffer, options?: StorageWriteOptions): Promise<void>;

  /**
   * List all components
   */
  listComponents(options?: StorageListOptions): Promise<string[]>;

  /**
   * List all libraries
   */
  listLibraries(options?: StorageListOptions): Promise<string[]>;

  /**
   * Get storage metadata for a file
   */
  getMetadata(path: string): Promise<StorageMetadata>;

  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete a file
   */
  delete(path: string): Promise<void>;

  /**
   * Get the backend type
   */
  getBackendType(): 'local' | 's3' | 'remote';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

export interface ICache {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, data: T, etag?: string): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  isExpired(entry: CacheEntry<any>, ttl: number): boolean;
}
