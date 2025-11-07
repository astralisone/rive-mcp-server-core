# Configuration and Storage System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server Application                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─────────────────────────────────┐
                                 │                                 │
                    ┌────────────▼──────────┐      ┌──────────────▼─────────┐
                    │  Configuration System  │      │    Storage System      │
                    │  (src/config/)        │      │    (src/storage/)      │
                    └────────────┬──────────┘      └──────────────┬─────────┘
                                 │                                 │
                    ┌────────────▼──────────┐      ┌──────────────▼─────────┐
                    │   ConfigManager       │      │   StorageManager       │
                    │   - Singleton         │      │   - Singleton          │
                    │   - Validation        │      │   - Factory Pattern    │
                    │   - Multi-source      │      │   - Backend Agnostic   │
                    └────────────┬──────────┘      └──────────────┬─────────┘
                                 │                                 │
                    ┌────────────▼──────────┐      ┌──────────────▼─────────┐
                    │   Configuration       │      │   Storage Backends     │
                    │   Sources:            │      │   Implementations:     │
                    │   1. Defaults         │      │   - LocalStorage       │
                    │   2. JSON File        │      │   - S3Storage          │
                    │   3. Environment      │      │   - RemoteStorage      │
                    └───────────────────────┘      └────────────────────────┘
```

## Type System Architecture

```
libs/types/
├── index.d.ts          # Main exports
├── manifest.d.ts       # Rive component/library manifests
├── config.d.ts         # Configuration structures
└── storage.d.ts        # Storage interfaces

Export Structure:
┌──────────────────────────────────────────────────────┐
│                    libs/types                        │
├──────────────────────────────────────────────────────┤
│ Manifest Types:                                      │
│  - RiveComponentManifest                             │
│  - RiveLibraryManifest                               │
│  - ManifestIndex                                     │
│  - StateMachineDefinition                            │
│  - DataBindingDefinition                             │
├──────────────────────────────────────────────────────┤
│ Configuration Types:                                 │
│  - ServerConfig                                      │
│  - StorageConfig                                     │
│  - RiveRuntimeConfig                                 │
│  - IndexingConfig                                    │
│  - EnvironmentConfig                                 │
├──────────────────────────────────────────────────────┤
│ Storage Types:                                       │
│  - IStorageBackend                                   │
│  - ICache                                            │
│  - StorageOptions (Read/Write/List)                  │
│  - StorageMetadata                                   │
└──────────────────────────────────────────────────────┘
```

## Configuration System Flow

```
Application Start
       │
       ▼
┌─────────────────┐
│ initializeConfig│
└────────┬────────┘
         │
         ├──► Load Defaults (getDefaultConfig)
         │      │
         │      ├─► Local storage config
         │      ├─► Runtime settings
         │      ├─► Indexing options
         │      └─► Server metadata
         │
         ├──► Load Config File (loadConfigFile)
         │      │
         │      └─► Parse JSON
         │          └─► Merge with defaults
         │
         ├──► Load Environment (loadEnvironmentConfig)
         │      │
         │      ├─► STORAGE_BACKEND
         │      ├─► LOCAL_*, S3_*, REMOTE_*
         │      ├─► RIVE_RUNTIME_VERSION
         │      ├─► AUTO_INDEX, ENABLE_CACHE
         │      └─► LOG_LEVEL, LOG_FORMAT
         │
         ├──► Merge All Configs (mergeConfig)
         │      │
         │      └─► Deep merge strategy
         │          (Env > File > Defaults)
         │
         └──► Validate Config (validateConfig)
                │
                ├─► Check required fields
                ├─► Validate backend config
                └─► Return validated config
```

## Storage System Architecture

```
Storage Initialization
         │
         ▼
┌─────────────────────┐
│ initializeStorage   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  StorageFactory     │
│  createAndInitialize│
└──────────┬──────────┘
           │
           ├──► Determine Backend
           │      │
           │      ├─► local  ──► LocalStorage
           │      ├─► s3     ──► S3Storage
           │      └─► remote ──► RemoteStorage
           │
           ▼
┌─────────────────────┐
│   BaseStorage       │
│   (Abstract Base)   │
└──────────┬──────────┘
           │
           ├─► Cache Management (MemoryCache)
           ├─► JSON Read/Write
           ├─► Manifest Operations
           ├─► Asset Operations
           └─► Index Management
```

## Storage Backend Implementations

### Local Filesystem Storage
```
LocalStorage
    │
    ├─► Initialize
    │   └─► Create directory structure
    │       ├─► manifests/
    │       │   ├─── components/
    │       │   └─── libraries/
    │       └─► assets/
    │
    ├─► Read Operations
    │   ├─► readRaw(path) ──► fs.readFile()
    │   └─► Cache result
    │
    └─► Write Operations
        ├─► writeRaw(path, data) ──► fs.writeFile()
        └─► Update cache
```

### Amazon S3 Storage
```
S3Storage
    │
    ├─► Initialize
    │   ├─► Create S3Client
    │   └─► Verify bucket access
    │
    ├─► Read Operations
    │   ├─► GetObjectCommand
    │   ├─── Stream to Buffer
    │   └─── Cache result
    │
    └─► Write Operations
        ├─► PutObjectCommand
        ├─── Set Content-Type
        └─── Update cache
```

### Remote HTTP/HTTPS Storage
```
RemoteStorage (Read-Only)
    │
    ├─► Initialize
    │   └─► Verify remote access
    │
    ├─► Read Operations
    │   ├─► HTTP GET request
    │   ├─── Handle redirects
    │   ├─── Timeout handling
    │   └─── Cache result
    │
    └─► Metadata Operations
        └─► HTTP HEAD request
```

## Cache System Flow

```
Storage Request
      │
      ▼
┌───────────────┐
│ Check Cache   │──── Enabled? ───► No ──► Direct Storage Access
└───────┬───────┘
        │
      Yes
        │
        ▼
┌───────────────┐
│ Cache Hit?    │──── No ──┐
└───────┬───────┘          │
        │                  │
      Yes                  │
        │                  │
        ▼                  ▼
┌───────────────┐   ┌──────────────┐
│ Check TTL     │   │ Read Storage │
└───────┬───────┘   └──────┬───────┘
        │                  │
    Expired?               │
        │                  │
    No  │  Yes             │
        │   │              │
        │   └──────────────┤
        │                  │
        ▼                  ▼
┌───────────────┐   ┌──────────────┐
│ Return Cached │   │ Update Cache │
└───────────────┘   └──────┬───────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Return Data  │
                    └──────────────┘
```

## Data Flow Example

### Reading a Component Manifest

```
Application
    │
    │ getStorage().readComponentManifest('my-component')
    ▼
StorageManager
    │
    │ getStorage()
    ▼
Storage Backend (e.g., LocalStorage)
    │
    │ readComponentManifest('my-component')
    ▼
BaseStorage
    │
    │ readJSON('components/my-component/manifest.json')
    ├─► Check cache ('json:components/my-component/manifest.json')
    │   └─► Cache hit? ──► Return cached data
    │
    └─► readRaw('components/my-component/manifest.json')
        └─► LocalStorage.readRaw()
            └─► fs.readFile('/data/manifests/components/my-component/manifest.json')
                │
                ▼
            Parse JSON
                │
                ▼
            Store in cache
                │
                ▼
            Return manifest
```

### Writing with Index Update

```
Application
    │
    │ storage.writeComponentManifest(manifest, { updateIndex: true })
    ▼
Storage Backend
    │
    │ writeComponentManifest(manifest, options)
    ▼
BaseStorage
    │
    ├─► Set updatedAt timestamp
    │
    ├─► writeJSON('components/[id]/manifest.json', manifest)
    │   ├─► Stringify JSON
    │   ├─► writeRaw() ──► fs.writeFile()
    │   └─► Update cache
    │
    └─► updateIndex? ──► Yes
        │
        └─► Read current index
            │
            ├─► Update index.components[id] = manifest
            │
            └─► Write updated index
                └─► writeIndex(index)
```

## File Structure

```
rive-mcp-server-core/
│
├── libs/types/                      # Type Definitions
│   ├── index.d.ts                   # Main exports
│   ├── manifest.d.ts                # 93 lines
│   ├── config.d.ts                  # 101 lines
│   └── storage.d.ts                 # 99 lines
│
├── packages/mcp-server/
│   ├── src/
│   │   ├── config/                  # Configuration System
│   │   │   ├── index.ts             # Config manager (49 lines)
│   │   │   └── loader.ts            # Config loader (183 lines)
│   │   │
│   │   └── storage/                 # Storage System
│   │       ├── index.ts             # Storage manager (55 lines)
│   │       ├── cache.ts             # Memory cache (73 lines)
│   │       ├── base.ts              # Base storage (237 lines)
│   │       ├── factory.ts           # Factory (28 lines)
│   │       ├── local.ts             # Local storage (150 lines)
│   │       ├── s3.ts                # S3 storage (192 lines)
│   │       └── remote.ts            # Remote storage (177 lines)
│   │
│   ├── package.json                 # Dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── CONFIGURATION.md             # Usage documentation
│
├── docs/
│   ├── CONFIGURATION_STORAGE_SYSTEM.md  # System overview
│   └── SYSTEM_ARCHITECTURE.md           # Architecture diagrams
│
├── .env.example                     # Environment template
├── config.example.json              # Local config
├── config.s3.example.json           # S3 config
└── config.remote.example.json       # Remote config
```

## Component Summary

### Total Lines of Code

- Type Definitions: ~293 lines
- Configuration System: ~232 lines
- Storage System: ~912 lines
- Documentation: ~500+ lines
- Examples: 4 files

**Total: ~1,937 lines of production code + documentation**

### Key Components

1. **7 TypeScript Implementation Files**
   - Configuration: 2 files
   - Storage: 6 files (including cache)

2. **3 Type Definition Files**
   - Complete type coverage for all APIs

3. **4 Example Configuration Files**
   - Local, S3, Remote, and Environment

4. **3 Documentation Files**
   - Usage guide, system overview, architecture

### Technology Stack

- TypeScript 5.3+
- Node.js 18+
- AWS SDK v3 (S3)
- MCP SDK 0.5+
- Rive Canvas 2.17+

## Integration Points

```
Existing MCP Server
        │
        ├─► Initialize Configuration
        │   └─► initializeConfig()
        │
        ├─► Initialize Storage
        │   └─► initializeStorage(config)
        │
        └─► Use in Tools
            ├─► listLibraries() ──► storage.readIndex()
            ├─► listComponents() ──► storage.listComponents()
            ├─► getComponentDetail() ──► storage.readComponentManifest()
            ├─► getRuntimeSurface() ──► storage.readAsset()
            └─► generateWrapper() ──► storage.readComponentManifest()
```

## Next Integration Steps

1. Update existing tools to use storage system
2. Migrate hardcoded paths to configuration
3. Add storage initialization to server startup
4. Create migration scripts for existing data
5. Add monitoring and metrics
6. Create integration tests
7. Update main README documentation
