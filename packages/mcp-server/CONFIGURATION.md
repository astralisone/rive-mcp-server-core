# Configuration and Storage System

This document describes the configuration and storage system for the Rive MCP Server.

## Overview

The Rive MCP Server provides a flexible configuration and storage system that supports multiple backend storage options:

- **Local Filesystem**: Store manifests and assets on the local filesystem
- **Amazon S3**: Store manifests and assets in S3 or S3-compatible storage
- **Remote HTTP/HTTPS**: Fetch manifests and assets from remote URLs (read-only)

## Configuration

Configuration can be provided through multiple sources, which are merged in the following order:

1. Default configuration (built-in)
2. Configuration file (JSON)
3. Environment variables

### Configuration File

Create a `config.json` file in your project root:

```json
{
  "storage": {
    "backend": "local",
    "local": {
      "basePath": "./data",
      "manifestPath": "manifests",
      "assetsPath": "assets"
    }
  },
  "runtime": {
    "version": "latest"
  },
  "indexing": {
    "autoIndex": true,
    "enableCache": true,
    "cacheTTL": 300
  }
}
```

See `config.example.json`, `config.s3.example.json`, and `config.remote.example.json` for complete examples.

### Environment Variables

Create a `.env` file in your project root:

```bash
STORAGE_BACKEND=local
LOCAL_BASE_PATH=./data
AUTO_INDEX=true
ENABLE_CACHE=true
```

See `.env.example` for a complete list of available environment variables.

## Storage Backends

### Local Filesystem Storage

Store manifests and assets on the local filesystem.

**Configuration:**

```json
{
  "storage": {
    "backend": "local",
    "local": {
      "basePath": "./data",
      "manifestPath": "manifests",
      "assetsPath": "assets",
      "cachePath": ".cache"
    }
  }
}
```

**Directory Structure:**

```
data/
├── manifests/
│   ├── index.json
│   ├── components/
│   │   └── component-id/
│   │       └── manifest.json
│   └── libraries/
│       └── library-id/
│           └── manifest.json
└── assets/
    └── component-id.riv
```

### Amazon S3 Storage

Store manifests and assets in Amazon S3 or S3-compatible storage (MinIO, DigitalOcean Spaces, etc.).

**Configuration:**

```json
{
  "storage": {
    "backend": "s3",
    "s3": {
      "bucket": "my-rive-bucket",
      "region": "us-east-1",
      "accessKeyId": "your-access-key",
      "secretAccessKey": "your-secret-key",
      "manifestPrefix": "manifests",
      "assetsPrefix": "assets"
    }
  }
}
```

**S3 Structure:**

```
my-rive-bucket/
├── manifests/
│   ├── index.json
│   ├── components/
│   │   └── component-id/
│   │       └── manifest.json
│   └── libraries/
│       └── library-id/
│           └── manifest.json
└── assets/
    └── component-id.riv
```

**S3-Compatible Services:**

For MinIO, DigitalOcean Spaces, or other S3-compatible services:

```json
{
  "storage": {
    "backend": "s3",
    "s3": {
      "bucket": "my-bucket",
      "region": "us-east-1",
      "endpoint": "https://nyc3.digitaloceanspaces.com",
      "accessKeyId": "your-key",
      "secretAccessKey": "your-secret"
    }
  }
}
```

### Remote HTTP/HTTPS Storage

Fetch manifests and assets from remote URLs. This is read-only storage.

**Configuration:**

```json
{
  "storage": {
    "backend": "remote",
    "remote": {
      "manifestUrl": "https://cdn.example.com/rive/manifests",
      "assetBaseUrl": "https://cdn.example.com/rive/assets",
      "timeout": 30000,
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```

## Runtime Configuration

Configure Rive runtime settings:

```json
{
  "runtime": {
    "version": "latest",
    "canvas": {
      "antialias": true,
      "powerPreference": "high-performance",
      "premultipliedAlpha": true
    },
    "performance": {
      "maxInstances": 100,
      "enableCaching": true,
      "cacheSize": 52428800
    }
  }
}
```

## Indexing Configuration

Configure manifest indexing and caching:

```json
{
  "indexing": {
    "autoIndex": true,
    "indexInterval": 60000,
    "scanDepth": 10,
    "includePatterns": ["**/*.riv"],
    "excludePatterns": ["**/node_modules/**"],
    "enableCache": true,
    "cacheTTL": 300
  }
}
```

## Usage

### Initialize Configuration

```typescript
import { initializeConfig, getConfig } from './config';

// Initialize with default config file path
const config = await initializeConfig();

// Or specify a custom config file
const config = await initializeConfig('./my-config.json');

// Get configuration after initialization
const config = getConfig();
```

### Initialize Storage

```typescript
import { initializeStorage, getStorage } from './storage';
import { initializeConfig } from './config';

// Initialize configuration first
const config = await initializeConfig();

// Initialize storage
const storage = await initializeStorage(config);

// Get storage after initialization
const storage = getStorage();
```

### Read Manifests

```typescript
import { getStorage } from './storage';

const storage = getStorage();

// Read index
const index = await storage.readIndex();

// Read component manifest
const component = await storage.readComponentManifest('component-id');

// Read library manifest
const library = await storage.readLibraryManifest('library-id');

// Read asset
const assetBuffer = await storage.readAsset('component-id.riv');
```

### Write Manifests (Local/S3 only)

```typescript
import { getStorage } from './storage';

const storage = getStorage();

// Write component manifest
await storage.writeComponentManifest({
  id: 'my-component',
  name: 'My Component',
  version: '1.0.0',
  // ... other fields
});

// Write with index update
await storage.writeComponentManifest(component, { updateIndex: true });
```

### Cache Management

```typescript
import { getStorage } from './storage';

const storage = getStorage();

// Clear cache
await storage.clearCache();

// Read with cache disabled
const component = await storage.readComponentManifest('component-id', {
  useCache: false,
});
```

## Type Definitions

All types are available from `libs/types`:

```typescript
import {
  ServerConfig,
  StorageConfig,
  RiveComponentManifest,
  RiveLibraryManifest,
  ManifestIndex,
  IStorageBackend,
} from '../../../../libs/types';
```

## Best Practices

1. **Always initialize configuration before storage**
2. **Use environment variables for sensitive data** (API keys, secrets)
3. **Enable caching for production** to reduce storage access
4. **Use read-only remote storage** for CDN-hosted assets
5. **Keep manifest index updated** when writing manifests
6. **Set appropriate cache TTL** based on your update frequency

## Error Handling

```typescript
try {
  const storage = await initializeStorage(config);
  const component = await storage.readComponentManifest('component-id');
} catch (error) {
  console.error('Storage error:', error);
}
```

## Testing

Example test setup:

```typescript
import { initializeConfig, initializeStorage } from './src';

describe('Storage Tests', () => {
  let storage: IStorageBackend;

  beforeAll(async () => {
    const config = await initializeConfig('./test-config.json');
    storage = await initializeStorage(config);
  });

  it('should read component manifest', async () => {
    const component = await storage.readComponentManifest('test-component');
    expect(component.id).toBe('test-component');
  });
});
```
