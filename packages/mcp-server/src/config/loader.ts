/**
 * Configuration Loader
 * Loads configuration from environment variables, config files, and defaults
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { ServerConfig, StorageBackend } from '../../../../libs/types';

/**
 * Load configuration from environment variables
 */
export function loadEnvironmentConfig(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {
    storage: {
      backend: (process.env.STORAGE_BACKEND as StorageBackend) || 'local',
    },
    server: {
      name: process.env.SERVER_NAME || 'astralismotion-rive-mcp',
      version: process.env.SERVER_VERSION || '0.1.0',
      port: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : undefined,
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'text',
    },
  };

  // Local storage configuration
  if (process.env.LOCAL_BASE_PATH) {
    config.storage!.local = {
      basePath: process.env.LOCAL_BASE_PATH,
      manifestPath: process.env.LOCAL_MANIFEST_PATH,
      assetsPath: process.env.LOCAL_ASSETS_PATH,
      cachePath: process.env.LOCAL_CACHE_PATH,
    };
  }

  // S3 storage configuration
  if (process.env.S3_BUCKET) {
    config.storage!.s3 = {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
      manifestPrefix: process.env.S3_MANIFEST_PREFIX,
      assetsPrefix: process.env.S3_ASSETS_PREFIX,
    };
  }

  // Remote storage configuration
  if (process.env.REMOTE_MANIFEST_URL) {
    config.storage!.remote = {
      manifestUrl: process.env.REMOTE_MANIFEST_URL,
      assetBaseUrl: process.env.REMOTE_ASSET_BASE_URL,
      timeout: process.env.REMOTE_TIMEOUT ? parseInt(process.env.REMOTE_TIMEOUT, 10) : undefined,
    };
  }

  // Runtime configuration
  if (process.env.RIVE_RUNTIME_VERSION) {
    config.runtime = {
      version: process.env.RIVE_RUNTIME_VERSION,
    };
  }

  // Indexing configuration
  if (process.env.AUTO_INDEX !== undefined) {
    config.indexing = {
      autoIndex: process.env.AUTO_INDEX === 'true',
      indexInterval: process.env.INDEX_INTERVAL ? parseInt(process.env.INDEX_INTERVAL, 10) : undefined,
      enableCache: process.env.ENABLE_CACHE === 'true',
      cacheTTL: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : undefined,
    };
  }

  return config;
}

/**
 * Load configuration from a JSON file
 */
export async function loadConfigFile(configPath: string): Promise<Partial<ServerConfig>> {
  try {
    const fileContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Config file doesn't exist, return empty config
      return {};
    }
    throw new Error(`Failed to load config file: ${error}`);
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): ServerConfig {
  return {
    storage: {
      backend: 'local',
      local: {
        basePath: path.join(process.cwd(), 'data'),
        manifestPath: 'manifests',
        assetsPath: 'assets',
        cachePath: '.cache',
      },
    },
    runtime: {
      version: 'latest',
      canvas: {
        antialias: true,
        powerPreference: 'default',
        premultipliedAlpha: true,
      },
      performance: {
        maxInstances: 100,
        enableCaching: true,
        cacheSize: 50 * 1024 * 1024, // 50 MB
      },
    },
    indexing: {
      autoIndex: true,
      indexInterval: 60000, // 1 minute
      scanDepth: 10,
      includePatterns: ['**/*.riv'],
      excludePatterns: ['**/node_modules/**', '**/.git/**'],
      enableCache: true,
      cacheTTL: 300, // 5 minutes
    },
    server: {
      name: 'astralismotion-rive-mcp',
      version: '0.1.0',
    },
    logging: {
      level: 'info',
      format: 'text',
    },
  };
}

/**
 * Merge configuration objects with deep merge
 */
export function mergeConfig(base: Partial<ServerConfig>, override: Partial<ServerConfig>): ServerConfig {
  const merged = { ...base } as any;

  for (const key in override) {
    if (override.hasOwnProperty(key)) {
      const overrideValue = (override as any)[key];
      if (overrideValue !== undefined && overrideValue !== null) {
        if (typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
          merged[key] = mergeConfig(merged[key] || {}, overrideValue);
        } else {
          merged[key] = overrideValue;
        }
      }
    }
  }

  return merged as ServerConfig;
}

/**
 * Load and merge all configuration sources
 */
export async function loadConfig(configPath?: string): Promise<ServerConfig> {
  // Start with defaults
  let config = getDefaultConfig();

  // Load from config file if provided
  if (configPath) {
    const fileConfig = await loadConfigFile(configPath);
    config = mergeConfig(config, fileConfig);
  }

  // Override with environment variables
  const envConfig = loadEnvironmentConfig();
  config = mergeConfig(config, envConfig);

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): void {
  // Validate storage backend
  if (!config.storage || !config.storage.backend) {
    throw new Error('Storage backend must be specified');
  }

  const backend = config.storage.backend;

  // Validate backend-specific configuration
  switch (backend) {
    case 'local':
      if (!config.storage.local?.basePath) {
        throw new Error('Local storage requires basePath configuration');
      }
      break;

    case 's3':
      if (!config.storage.s3?.bucket) {
        throw new Error('S3 storage requires bucket configuration');
      }
      if (!config.storage.s3?.region) {
        throw new Error('S3 storage requires region configuration');
      }
      break;

    case 'remote':
      if (!config.storage.remote?.manifestUrl) {
        throw new Error('Remote storage requires manifestUrl configuration');
      }
      break;

    default:
      throw new Error(`Unknown storage backend: ${backend}`);
  }
}
