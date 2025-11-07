/**
 * Storage factory for creating storage backends
 */

import { IStorageBackend, StorageConfig } from '../../../../libs/types';
import { LocalStorage } from './local';
import { S3Storage } from './s3';
import { RemoteStorage } from './remote';

export class StorageFactory {
  /**
   * Create a storage backend based on configuration
   */
  static createStorage(config: StorageConfig): IStorageBackend {
    const backend = config.backend;

    switch (backend) {
      case 'local':
        if (!config.local) {
          throw new Error('Local storage configuration is required');
        }
        return new LocalStorage(config.local);

      case 's3':
        if (!config.s3) {
          throw new Error('S3 storage configuration is required');
        }
        return new S3Storage(config.s3);

      case 'remote':
        if (!config.remote) {
          throw new Error('Remote storage configuration is required');
        }
        return new RemoteStorage(config.remote);

      default:
        throw new Error(`Unknown storage backend: ${backend}`);
    }
  }

  /**
   * Create and initialize a storage backend
   */
  static async createAndInitialize(config: StorageConfig): Promise<IStorageBackend> {
    const storage = StorageFactory.createStorage(config);
    await storage.initialize();
    return storage;
  }
}
