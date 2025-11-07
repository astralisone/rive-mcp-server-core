# Configuration and Storage System Documentation

## Overview

A comprehensive configuration and storage system has been created for the Rive MCP Server, providing flexible backend storage options and environment-based configuration management.

## Architecture

### Type System (`libs/types/`)

Three new type definition files provide the foundation:

1. **`manifest.d.ts`** - Rive component and library manifest types
   - `RiveComponentManifest`: Complete component metadata including state machines, data bindings, and asset references
   - `RiveLibraryManifest`: Library grouping and organization
   - `ManifestIndex`: Central index of all components and libraries
   - `StateMachineDefinition`: State machine inputs, events, and metadata
   - `DataBindingDefinition`: Data binding schemas and requirements

2. **`config.d.ts`** - Configuration types
   - `ServerConfig`: Main server configuration structure
   - `StorageConfig`: Storage backend configuration (local, S3, remote)
   - `RiveRuntimeConfig`: Rive canvas and performance settings
   - `IndexingConfig`: Manifest indexing and caching options
   - `EnvironmentConfig`: Environment variable mappings

3. **`storage.d.ts`** - Storage interface types
   - `IStorageBackend`: Abstract storage interface
   - `ICache`: Caching interface
   - `StorageReadOptions`, `StorageWriteOptions`, `StorageListOptions`: Operation options
   - `StorageMetadata`: File metadata structure

### Configuration System (`packages/mcp-server/src/config/`)

**`loader.ts`** - Configuration loading and merging
- `loadEnvironmentConfig()`: Load from environment variables
- `loadConfigFile()`: Load from JSON file
- `getDefaultConfig()`: Get default configuration
- `mergeConfig()`: Deep merge configuration objects
- `loadConfig()`: Load and merge all configuration sources
- `validateConfig()`: Validate configuration integrity

**`index.ts`** - Configuration management singleton
- `ConfigManager`: Singleton configuration manager
- `initializeConfig()`: Initialize configuration
- `getConfig()`: Get current configuration

### Storage System (`packages/mcp-server/src/storage/`)

**`cache.ts`** - In-memory caching
- `MemoryCache`: TTL-based in-memory cache
- Cache statistics and cleanup methods
- Automatic expiration handling

**`base.ts`** - Base storage implementation
- `BaseStorage`: Abstract base class with common functionality
- JSON read/write with caching
- Manifest read/write operations
- Asset read/write operations
- Index management and updates

**`local.ts`** - Local filesystem storage
- `LocalStorage`: Filesystem-based storage implementation
- Directory structure management
- File operations with proper error handling
- Content type detection

**`s3.ts`** - Amazon S3 storage
- `S3Storage`: S3-based storage implementation
- Support for S3-compatible services (MinIO, DigitalOcean Spaces)
- Streaming read/write operations
- S3 metadata handling

**`remote.ts`** - Remote HTTP/HTTPS storage
- `RemoteStorage`: Read-only remote storage
- HTTP/HTTPS fetch with timeout
- Redirect handling
- HEAD request metadata retrieval

**`factory.ts`** - Storage factory
- `StorageFactory`: Create storage backends from configuration
- Automatic backend selection
- Initialization handling

**`index.ts`** - Storage management singleton
- `StorageManager`: Singleton storage manager
- `initializeStorage()`: Initialize storage
- `getStorage()`: Get current storage backend

## Configuration Files

### Environment Configuration (`.env.example`)
- Comprehensive environment variable examples
- All storage backends covered
- Runtime, indexing, and logging options

### JSON Configuration Examples
1. **`config.example.json`** - Local storage configuration
2. **`config.s3.example.json`** - S3 storage configuration
3. **`config.remote.example.json`** - Remote storage configuration

## Key Features

### Multi-Backend Support
- **Local Filesystem**: Development and self-hosted deployments
- **Amazon S3**: Production cloud storage with high availability
- **Remote HTTP/HTTPS**: CDN integration for read-only access

### Flexible Configuration
- Three-layer configuration merging (defaults → file → environment)
- Environment variable overrides for all settings
- Validation with clear error messages

### Intelligent Caching
- TTL-based in-memory cache
- Automatic cache invalidation
- Per-operation cache control
- Cache statistics and cleanup

### Type Safety
- Complete TypeScript type definitions
- Exported types for external use
- Strong typing throughout the codebase

### Extensibility
- Abstract interfaces for custom implementations
- Factory pattern for backend creation
- Singleton managers for global access

## Directory Structure

```
/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/
├── libs/
│   └── types/
│       ├── index.d.ts          # Main type exports
│       ├── manifest.d.ts       # Manifest types
│       ├── config.d.ts         # Configuration types
│       └── storage.d.ts        # Storage interface types
├── packages/
│   └── mcp-server/
│       ├── src/
│       │   ├── config/
│       │   │   ├── index.ts    # Configuration manager
│       │   │   └── loader.ts   # Configuration loader
│       │   └── storage/
│       │       ├── index.ts    # Storage manager
│       │       ├── base.ts     # Base storage class
│       │       ├── cache.ts    # Memory cache
│       │       ├── factory.ts  # Storage factory
│       │       ├── local.ts    # Local storage
│       │       ├── s3.ts       # S3 storage
│       │       └── remote.ts   # Remote storage
│       ├── package.json        # Dependencies
│       ├── tsconfig.json       # TypeScript config
│       └── CONFIGURATION.md    # Usage documentation
├── .env.example                # Environment variables
├── config.example.json         # Local config example
├── config.s3.example.json      # S3 config example
└── config.remote.example.json  # Remote config example
```

## Dependencies Added

The following dependencies have been added to `packages/mcp-server/package.json`:

### Production Dependencies
- `@rive-app/canvas` (^2.17.0): Rive runtime integration
- `@aws-sdk/client-s3` (^3.523.0): S3 storage support
- `dotenv` (^16.4.5): Environment variable loading
- `@modelcontextprotocol/sdk` (^0.5.0): MCP SDK

### Development Dependencies
- TypeScript and type definitions
- ESLint for code quality
- Jest for testing

## Usage Examples

### Basic Initialization

```typescript
import { initializeConfig, getConfig } from './config';
import { initializeStorage, getStorage } from './storage';

// Initialize configuration
const config = await initializeConfig();

// Initialize storage
const storage = await initializeStorage(config);

// Read component manifest
const component = await storage.readComponentManifest('my-component');

// Write component manifest
await storage.writeComponentManifest(component, { updateIndex: true });
```

### Using Different Storage Backends

```typescript
// Local storage
process.env.STORAGE_BACKEND = 'local';
process.env.LOCAL_BASE_PATH = './data';

// S3 storage
process.env.STORAGE_BACKEND = 's3';
process.env.S3_BUCKET = 'my-bucket';
process.env.S3_REGION = 'us-east-1';

// Remote storage
process.env.STORAGE_BACKEND = 'remote';
process.env.REMOTE_MANIFEST_URL = 'https://cdn.example.com/manifests';
```

### Cache Control

```typescript
// Read with cache
const component = await storage.readComponentManifest('my-component');

// Read without cache
const fresh = await storage.readComponentManifest('my-component', {
  useCache: false,
});

// Clear cache
await storage.clearCache();
```

## Next Steps

1. **Integration**: Integrate configuration and storage into existing MCP server tools
2. **Testing**: Create comprehensive test suites for all storage backends
3. **Monitoring**: Add metrics and logging for storage operations
4. **Documentation**: Update main README with configuration instructions
5. **Migration**: Create migration utilities for existing data structures

## Benefits

1. **Flexibility**: Support for multiple deployment scenarios
2. **Scalability**: Cloud storage for production deployments
3. **Performance**: Intelligent caching reduces storage access
4. **Type Safety**: Complete TypeScript types prevent errors
5. **Maintainability**: Clean abstractions and separation of concerns
6. **Extensibility**: Easy to add new storage backends
7. **Developer Experience**: Clear documentation and examples
