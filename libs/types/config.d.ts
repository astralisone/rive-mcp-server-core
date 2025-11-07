/**
 * Configuration Type Definitions
 */

export type StorageBackend = 'local' | 's3' | 'remote';

export interface StorageConfig {
  backend: StorageBackend;

  // Local filesystem configuration
  local?: {
    basePath: string;
    manifestPath?: string;
    assetsPath?: string;
    cachePath?: string;
  };

  // S3 configuration
  s3?: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string; // For S3-compatible services
    manifestPrefix?: string;
    assetsPrefix?: string;
  };

  // Remote URL configuration
  remote?: {
    manifestUrl: string;
    assetBaseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };
}

export interface RiveRuntimeConfig {
  // Rive runtime version
  version?: string;

  // Canvas settings
  canvas?: {
    antialias?: boolean;
    powerPreference?: 'low-power' | 'high-performance' | 'default';
    premultipliedAlpha?: boolean;
  };

  // Performance settings
  performance?: {
    maxInstances?: number;
    enableCaching?: boolean;
    cacheSize?: number;
  };
}

export interface IndexingConfig {
  // Auto-indexing settings
  autoIndex?: boolean;
  indexInterval?: number; // milliseconds

  // Indexing options
  scanDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];

  // Cache settings
  enableCache?: boolean;
  cacheTTL?: number; // seconds
}

export interface ServerConfig {
  // Storage configuration
  storage: StorageConfig;

  // Rive runtime configuration
  runtime?: RiveRuntimeConfig;

  // Indexing configuration
  indexing?: IndexingConfig;

  // Server settings
  server?: {
    name?: string;
    version?: string;
    port?: number;
  };

  // Logging
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    format?: 'json' | 'text';
  };
}

export interface EnvironmentConfig {
  // Environment variables
  NODE_ENV?: 'development' | 'production' | 'test';

  // Storage backend selection
  STORAGE_BACKEND?: StorageBackend;

  // Local storage
  LOCAL_BASE_PATH?: string;
  LOCAL_MANIFEST_PATH?: string;
  LOCAL_ASSETS_PATH?: string;
  LOCAL_CACHE_PATH?: string;

  // S3 storage
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_MANIFEST_PREFIX?: string;
  S3_ASSETS_PREFIX?: string;

  // Remote storage
  REMOTE_MANIFEST_URL?: string;
  REMOTE_ASSET_BASE_URL?: string;

  // Runtime
  RIVE_RUNTIME_VERSION?: string;

  // Indexing
  AUTO_INDEX?: string; // 'true' | 'false'
  INDEX_INTERVAL?: string; // milliseconds
  ENABLE_CACHE?: string; // 'true' | 'false'
  CACHE_TTL?: string; // seconds

  // Logging
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  LOG_FORMAT?: 'json' | 'text';
}
