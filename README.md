# Rive MCP Server - Core System

A Model Context Protocol (MCP) server for orchestrating Rive animations in production applications. This system enables developers to discover, integrate, and compose Rive animations through a standardized interface, with support for multiple frameworks and deployment scenarios.

## Features

- **Component Discovery:** Browse and search Rive components across libraries with rich metadata
- **Runtime Integration:** Get framework-specific integration surfaces for React, Vue, Stencil, and more
- **Scene Composition:** Orchestrate multi-component animation sequences with precise timing
- **Code Generation:** Auto-generate production-ready wrapper components for any framework
- **Multi-Backend Storage:** Support for local filesystem, S3, and remote HTTP/CDN storage
- **Type Safety:** Full TypeScript support with comprehensive type definitions

## Quick Start

Get up and running in under 5 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Build the packages
npm run build:packages

# 3. Initialize storage
npm run init-storage

# 4. Seed example data
npm run seed-manifests

# 5. Verify setup
npm run validate-setup

# 6. Start the MCP server (outputs connection config)
npm run mcp-server
```

The server will output the exact configuration you need to add to your MCP client (Claude Desktop, Cline, etc.).

See [MCP_CLIENT_CONFIGURATION.md](./docs/MCP_CLIENT_CONFIGURATION.md) for detailed client setup instructions.

## Architecture Overview

The system separates three key layers:

1. **Rive Editor & Assets** - Designers author `.riv` files using the Rive Editor
2. **Rive MCP Orchestrator** - This server that discovers, indexes, and orchestrates Rive assets
3. **Consumer Applications** - React, Vue, Stencil, Unity/Unreal apps that integrate animations

Integration and logic live OUTSIDE the `.riv` files, enabling true separation of concerns.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## MCP Tools

The server exposes the following MCP tools:

### listComponents
List and filter available Rive components across all libraries.

```typescript
{
  "libraryId": "ui-components",    // optional filter
  "tags": ["loading", "spinner"],  // optional filter
  "category": "ui-elements"        // optional filter
}
```

### getComponentDetail
Get complete manifest details for a specific component.

```typescript
{
  "componentId": "ui-loading-spinner"
}
```

### getRuntimeSurface
Get framework-specific runtime integration surface.

```typescript
{
  "componentId": "ui-loading-spinner",
  "framework": "react"  // react | vue | stencil | angular
}
```

### composeScene
Compose multi-component animation sequences.

```typescript
{
  "sceneId": "celebration-big-win"
}
```

### generateWrapper
Generate production-ready component wrappers.

```typescript
{
  "componentId": "ui-loading-spinner",
  "framework": "react",
  "typescript": true
}
```

## Example Components

The system includes four realistic example components:

- **Astralis Slot Machine** - Casino game slot machine with spinning reels and win animations
- **Premium Loading Spinner** - Customizable loading indicator with 5 style variants
- **Interactive Button** - Fully interactive button with hover, press, and disabled states
- **Game Character Avatar** - Animated character with 8 emotions and reactions

See [QUICKSTART.md](./QUICKSTART.md) for detailed examples.

## Configuration

### Local Storage (Development)

```json
{
  "storage": {
    "backend": "local",
    "local": {
      "basePath": "./data",
      "manifestPath": "manifests",
      "assetsPath": "assets"
    }
  }
}
```

### S3 Storage (Production)

```json
{
  "storage": {
    "backend": "s3",
    "s3": {
      "bucket": "my-rive-assets",
      "region": "us-east-1",
      "manifestPrefix": "manifests/",
      "assetsPrefix": "assets/"
    }
  }
}
```

### Remote Storage (CDN)

```json
{
  "storage": {
    "backend": "remote",
    "remote": {
      "manifestUrl": "https://cdn.example.com/manifests/index.json",
      "assetBaseUrl": "https://cdn.example.com/assets/"
    }
  }
}
```

See `config.example.json`, `config.s3.example.json`, and `config.remote.example.json` for complete configuration options.

## Project Structure

```
rive-mcp-server-core/
├── libs/
│   ├── rive-manifests/        # Component and library manifests
│   │   └── examples/          # Example manifests (4 components, 2 libraries)
│   ├── motion-specs/          # Multi-component scene definitions
│   ├── motion-qa/             # QA rules and validators
│   └── types/                 # TypeScript type definitions
├── packages/
│   ├── mcp-server/            # MCP server implementation
│   │   ├── src/
│   │   │   ├── tools/         # MCP tool implementations
│   │   │   ├── storage/       # Storage backend adapters
│   │   │   └── config/        # Configuration loading
│   │   └── tests/
│   │       └── integration/   # Integration tests
├── tools/
│   └── scripts/               # Setup and utility scripts
│       ├── init-storage.ts    # Initialize storage structure
│       ├── seed-manifests.ts  # Populate example data
│       └── validate-setup.ts  # Verify configuration
├── tests/
│   └── fixtures/              # Test data and fixtures
│       ├── manifests/         # Test manifests
│       ├── runtime/           # Runtime surface fixtures
│       ├── motion-specs/      # Scene composition fixtures
│       └── assets/            # Mock asset metadata
└── data/                      # Local storage (created by init-storage)
```

## Development Scripts

```bash
# Setup
npm run init-storage         # Create storage directory structure
npm run seed-manifests       # Populate with example data
npm run validate-setup       # Verify configuration

# Development
npm start                    # Start MCP server
npm run dev                  # Start in watch mode
npm test                     # Run test suite
npm run lint                 # Lint code
npm run build                # Build for production

# Testing
npm test -- listComponents.test.ts       # Run specific test
npm run test:integration                 # Run integration tests
npm run test:watch                       # Run tests in watch mode
```

## Testing

The system includes comprehensive integration tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- listComponents.test.ts
npm test -- getComponentDetail.test.ts
npm test -- getRuntimeSurface.test.ts
npm test -- composeScene.test.ts
```

Test fixtures include:
- 4 component manifests (slot machine, loading spinner, button, character avatar)
- 2 library manifests (Astralis Casino, UI Components)
- Runtime surfaces with state machine definitions
- Motion specs for multi-component scenes
- Mock .riv file metadata

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Get started in 5 minutes
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design
- [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md) - Project organization
- [AGENT_FLOW.md](./AGENT_FLOW.md) - AI agent workflows
- [ROADMAP.md](./ROADMAP.md) - Future development plans

## Type Definitions

Full TypeScript definitions available in `libs/types/`:

- **manifest.d.ts** - Component and library manifest types
- **config.d.ts** - Configuration and environment types
- **storage.d.ts** - Storage backend interface types

## Example Workflows

### Integrate a Loading Spinner

```bash
# 1. List UI components
MCP: listComponents { "libraryId": "ui-components" }

# 2. Get spinner details
MCP: getComponentDetail { "componentId": "ui-loading-spinner" }

# 3. Get React integration surface
MCP: getRuntimeSurface {
  "componentId": "ui-loading-spinner",
  "framework": "react"
}

# 4. Generate React component
MCP: generateWrapper {
  "componentId": "ui-loading-spinner",
  "framework": "react",
  "typescript": true
}
```

### Create a Celebration Sequence

```bash
# 1. List game components
MCP: listComponents { "category": "game-elements" }

# 2. Compose celebration scene
MCP: composeScene { "sceneId": "celebration-big-win" }

# 3. Generate wrappers for each component
MCP: generateWrapper { "componentId": "astralis-slot-machine", "framework": "react" }
MCP: generateWrapper { "componentId": "game-character-avatar", "framework": "react" }
```

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.
