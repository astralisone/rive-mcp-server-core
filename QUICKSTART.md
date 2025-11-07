# Rive MCP Server - Quick Start Guide

Get up and running with the Rive MCP Server in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Basic understanding of Rive animations
- A code editor

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd rive-mcp-server-core
npm install
```

### 2. Initialize Storage

Create the necessary directory structure and initialize storage:

```bash
npm run init-storage
```

This creates:
```
data/
├── manifests/
│   ├── components/
│   ├── libraries/
│   └── index.json
├── assets/
│   └── rive/
└── .cache/
```

### 3. Seed Example Data

Populate your storage with example manifests:

```bash
npm run seed-manifests
```

This adds:
- 4 example component manifests (slot machine, loading spinner, button, character avatar)
- 2 library manifests (Astralis Casino, UI Components)
- A populated manifest index

### 4. Configure Environment

Copy the example environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to customize your setup (optional for local development):

```bash
# For local development, these defaults work out of the box
STORAGE_BACKEND=local
LOCAL_BASE_PATH=./data
NODE_ENV=development
```

### 5. Validate Setup

Verify everything is configured correctly:

```bash
npm run validate-setup
```

You should see all validation checks pass.

### 6. Start the MCP Server

```bash
npm start
```

The server is now running and ready to accept MCP requests!

## Using the MCP Tools

The Rive MCP Server exposes several tools for working with Rive components:

### List All Components

```typescript
// MCP Tool: listComponents
{
  "libraryId": "astralis-casino",  // optional: filter by library
  "tags": ["game"],                 // optional: filter by tags
  "category": "game-elements"       // optional: filter by category
}
```

**Returns:** Array of component manifests with metadata, state machines, and input definitions.

### Get Component Details

```typescript
// MCP Tool: getComponentDetail
{
  "componentId": "astralis-slot-machine"
}
```

**Returns:** Complete component manifest including:
- State machine definitions
- Input/output specifications
- Event definitions
- Data binding schemas

### Get Runtime Surface

```typescript
// MCP Tool: getRuntimeSurface
{
  "componentId": "astralis-slot-machine",
  "framework": "react"  // optional: react | vue | stencil
}
```

**Returns:** Runtime integration surface with:
- Current state machine state
- Input values and handlers
- Event listeners
- Framework-specific integration code

### Compose Multi-Component Scenes

```typescript
// MCP Tool: composeScene
{
  "sceneId": "celebration-big-win"
}
```

**Returns:** Orchestrated scene composition with:
- Multiple component timelines
- Synchronized animations
- Audio tracks
- Transition definitions

### Generate Framework Wrappers

```typescript
// MCP Tool: generateWrapper
{
  "componentId": "ui-loading-spinner",
  "framework": "react",
  "typescript": true
}
```

**Returns:** Production-ready component wrapper code for your framework.

## Example Workflows

### Workflow 1: Browse and Integrate a Component

```bash
# 1. List available UI components
MCP: listComponents { "libraryId": "ui-components" }

# 2. Get details for the loading spinner
MCP: getComponentDetail { "componentId": "ui-loading-spinner" }

# 3. Get React integration surface
MCP: getRuntimeSurface {
  "componentId": "ui-loading-spinner",
  "framework": "react"
}

# 4. Generate React wrapper
MCP: generateWrapper {
  "componentId": "ui-loading-spinner",
  "framework": "react",
  "typescript": true
}
```

### Workflow 2: Create a Multi-Component Experience

```bash
# 1. List game components
MCP: listComponents { "category": "game-elements" }

# 2. Compose a celebration scene
MCP: composeScene { "sceneId": "celebration-big-win" }

# 3. Generate wrappers for each component
MCP: generateWrapper { "componentId": "astralis-slot-machine", "framework": "react" }
MCP: generateWrapper { "componentId": "game-character-avatar", "framework": "react" }
```

### Workflow 3: Explore Component Capabilities

```bash
# 1. Get slot machine details
MCP: getComponentDetail { "componentId": "astralis-slot-machine" }

# Response includes:
# - State machines: SlotMachineSM
# - Inputs: isSpinning (bool), spinSpeed (number), winAmount (number)
# - Triggers: triggerSpin, stopReels
# - Events: SpinStarted, SpinComplete, WinSequenceComplete
# - Data bindings: reelSymbols (array), payoutTable (object)

# 2. Get runtime surface to see current state
MCP: getRuntimeSurface { "componentId": "astralis-slot-machine" }
```

## Configuration Options

### Local Storage (Default)

Perfect for development and testing:

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

### S3 Storage

For production deployments with cloud storage:

```json
{
  "storage": {
    "backend": "s3",
    "s3": {
      "bucket": "my-rive-assets",
      "region": "us-east-1",
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY",
      "manifestPrefix": "manifests/",
      "assetsPrefix": "assets/"
    }
  }
}
```

See `config.s3.example.json` for complete configuration.

### Remote Storage

For CDN-hosted assets:

```json
{
  "storage": {
    "backend": "remote",
    "remote": {
      "manifestUrl": "https://cdn.example.com/manifests/index.json",
      "assetBaseUrl": "https://cdn.example.com/assets/",
      "timeout": 30000
    }
  }
}
```

See `config.remote.example.json` for complete configuration.

## Example Components

The example data includes four realistic components:

### 1. Astralis Slot Machine
**Library:** astralis-casino
**Use Case:** Casino game slot machine with spinning reels and win animations

**Key Features:**
- 5 inputs (isSpinning, spinSpeed, winAmount, triggerSpin, stopReels)
- 4 events (SpinStarted, SpinComplete, WinSequenceComplete, ReelStopped)
- Data bindings for reel symbols and payout tables

### 2. Premium Loading Spinner
**Library:** ui-components
**Use Case:** Customizable loading indicator with multiple styles

**Key Features:**
- 5 inputs (isLoading, progress, speed, styleIndex, complete)
- 2 events (LoadingStarted, LoadingComplete)
- 5 style variants (default, minimal, bold, neon, retro)

### 3. Interactive Button
**Library:** ui-components
**Use Case:** Fully interactive button with hover, press, and disabled states

**Key Features:**
- 5 inputs (isHovered, isPressed, isDisabled, variant, onClick)
- 3 events (ButtonClicked, HoverEnter, HoverExit)
- 4 variants (primary, secondary, danger, success)

### 4. Game Character Avatar
**Library:** astralis-casino
**Use Case:** Animated character with emotions and reactions

**Key Features:**
- 6 inputs (emotionIndex, isTalking, lookAtX, lookAtY, triggerReaction, wave)
- 3 events (EmotionChanged, ReactionComplete, WaveComplete)
- 8 emotions (neutral, happy, sad, excited, angry, surprised, thinking, celebrating)

## Directory Structure

```
rive-mcp-server-core/
├── libs/
│   ├── rive-manifests/        # Manifest definitions
│   │   └── examples/          # Example manifests
│   ├── motion-specs/          # Motion specifications
│   ├── motion-qa/             # QA rules
│   └── types/                 # TypeScript type definitions
├── packages/
│   ├── mcp-server/            # MCP server implementation
│   │   ├── src/
│   │   │   ├── tools/         # MCP tool implementations
│   │   │   ├── storage/       # Storage backends
│   │   │   └── config/        # Configuration loading
│   │   └── tests/
│   │       └── integration/   # Integration tests
├── tools/
│   └── scripts/               # Setup and utility scripts
├── tests/
│   └── fixtures/              # Test data and fixtures
├── data/                      # Local storage (created by init-storage)
├── .env.example               # Environment configuration template
└── config.example.json        # JSON configuration template
```

## Testing

Run the integration test suite:

```bash
npm test
```

Run specific test suites:

```bash
npm test -- listComponents.test.ts
npm test -- getComponentDetail.test.ts
npm test -- getRuntimeSurface.test.ts
npm test -- composeScene.test.ts
```

## Troubleshooting

### Issue: "Storage directory not found"

**Solution:** Run `npm run init-storage` to create the directory structure.

### Issue: "No components found"

**Solution:** Run `npm run seed-manifests` to populate example data.

### Issue: "Configuration validation failed"

**Solution:** Run `npm run validate-setup` to identify missing configuration.

### Issue: "Cannot load manifest index"

**Solution:** Check that `data/manifests/index.json` exists and is valid JSON.

## Next Steps

1. **Explore the Examples:** Review the example manifests in `libs/rive-manifests/examples/`
2. **Add Your Own Components:** Create component manifests following the RiveComponentManifest type
3. **Create Motion Specs:** Define multi-component scenes in `libs/motion-specs/`
4. **Generate Wrappers:** Use the generateWrapper tool to create framework-specific components
5. **Build Your App:** Integrate generated wrappers into your React, Vue, or Stencil application

## Resources

- **Architecture Documentation:** See `ARCHITECTURE.md`
- **Agent Flow Guide:** See `AGENT_FLOW.md`
- **Monorepo Structure:** See `MONOREPO_STRUCTURE.md`
- **Type Definitions:** See `libs/types/`
- **MCP Specification:** https://modelcontextprotocol.io

## Support

For questions and issues, please refer to the main README.md or open an issue in the repository.
