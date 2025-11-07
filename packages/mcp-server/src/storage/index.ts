/**
 * Storage Module
 * Main entry point for storage management
 */

import { IStorageBackend, ServerConfig } from '../../../../libs/types';
import { StorageFactory } from './factory';

export * from './cache';
export * from './base';
export * from './local';
export * from './s3';
export * from './remote';
export * from './factory';

/**
 * Singleton storage manager
 */
class StorageManager {
  private static instance: StorageManager;
  private storage: IStorageBackend | null = null;

  private constructor() {}

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Initialize storage from configuration
   */
  public async initialize(config: ServerConfig): Promise<IStorageBackend> {
    this.storage = await StorageFactory.createAndInitialize(config.storage);
    return this.storage;
  }

  /**
   * Get current storage backend
   */
  public getStorage(): IStorageBackend {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Check if storage is initialized
   */
  public isInitialized(): boolean {
    return this.storage !== null;
  }

  /**
   * Reset storage (mainly for testing)
   */
  public reset(): void {
    this.storage = null;
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();

/**
 * Initialize and get storage backend
 */
export async function initializeStorage(config: ServerConfig): Promise<IStorageBackend> {
  return storageManager.initialize(config);
}

/**
 * Get current storage backend
 */
export function getStorage(): IStorageBackend {
  return storageManager.getStorage();
}
