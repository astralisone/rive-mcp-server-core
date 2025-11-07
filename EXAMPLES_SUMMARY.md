# Rive MCP System - Examples and Test Data Summary

This document provides a comprehensive overview of all example manifests, configuration files, test fixtures, and setup utilities created for the Rive MCP system.

## Table of Contents

1. [Example Manifests](#example-manifests)
2. [Configuration Files](#configuration-files)
3. [Test Fixtures](#test-fixtures)
4. [Setup Scripts](#setup-scripts)
5. [Integration Tests](#integration-tests)
6. [Documentation](#documentation)
7. [Quick Reference](#quick-reference)

---

## Example Manifests

### Component Manifests

Location: `/libs/rive-manifests/examples/`

#### 1. Slot Machine Component
**File:** `slot-machine-component.json`
**ID:** `astralis-slot-machine`
**Library:** `astralis-casino`

**Purpose:** A fully featured casino slot machine with spinning reels, win animations, and celebration effects.

**State Machine:** SlotMachineSM
- Inputs: isSpinning (bool), spinSpeed (number), winAmount (number), triggerSpin (trigger), stopReels (trigger)
- Events: SpinStarted, SpinComplete, WinSequenceComplete, ReelStopped
- Data Bindings: reelSymbols (array), payoutTable (object)

**Use Cases:**
- Casino game implementations
- Gamification features
- Prize drawing animations

---

#### 2. Loading Spinner Component
**File:** `loading-spinner-component.json`
**ID:** `ui-loading-spinner`
**Library:** `ui-components`

**Purpose:** An elegant, customizable loading spinner with multiple style variations.

**State Machine:** LoadingStateMachine
- Inputs: isLoading (bool), progress (number), speed (number), styleIndex (number), complete (trigger)
- Events: LoadingStarted, LoadingComplete
- Style Variants: default, minimal, bold, neon, retro (0-4)

**Use Cases:**
- Page loading indicators
- Async operation feedback
- Progress tracking
- Form submissions

---

#### 3. Interactive Button Component
**File:** `button-animation-component.json`
**ID:** `ui-interactive-button`
**Library:** `ui-components`

**Purpose:** A highly interactive button with hover, press, and disabled states.

**State Machine:** ButtonStateMachine
- Inputs: isHovered (bool), isPressed (bool), isDisabled (bool), variant (number), onClick (trigger)
- Events: ButtonClicked, HoverEnter, HoverExit
- Variants: primary, secondary, danger, success (0-3)
- Data Bindings: buttonText (text), iconUrl (image)

**Use Cases:**
- Primary CTAs
- Form buttons
- Navigation elements
- Interactive UI controls

---

#### 4. Character Avatar Component
**File:** `character-avatar-component.json`
**ID:** `game-character-avatar`
**Library:** `astralis-casino`

**Purpose:** Animated character avatar with emotions, idle animations, and reactions.

**State Machine:** CharacterSM
- Inputs: emotionIndex (number), isTalking (bool), lookAtX (number), lookAtY (number), triggerReaction (trigger), wave (trigger)
- Events: EmotionChanged, ReactionComplete, WaveComplete
- Emotions: neutral, happy, sad, excited, angry, surprised, thinking, celebrating (0-7)
- Data Bindings: characterConfig (object), accessories (array)

**Use Cases:**
- Player avatars
- NPC characters
- Chat companions
- Tutorial guides
- Customer service bots

---

### Library Manifests

#### Astralis Casino Library
**File:** `astralis-casino-library.json`
**ID:** `astralis-casino`

**Components:**
- astralis-slot-machine
- game-character-avatar

**Purpose:** Complete library of animated casino game components for the Astralis brand.

---

#### UI Components Library
**File:** `ui-components-library.json`
**ID:** `ui-components`

**Components:**
- ui-loading-spinner
- ui-interactive-button

**Purpose:** Professional UI component library with modern animations and interactions.

---

### Manifest Index
**File:** `manifest-index.json`

**Purpose:** Central index containing all libraries and components with complete metadata.

**Structure:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "ISO-8601 timestamp",
  "libraries": { /* library manifests */ },
  "components": { /* component manifests */ }
}
```

---

## Configuration Files

### 1. Environment Configuration
**File:** `.env.example`

**Purpose:** Template for environment-based configuration with sensible defaults for local development.

**Key Sections:**
- Storage backend selection (local/s3/remote)
- Local storage paths
- S3 configuration
- Remote storage URLs
- Runtime configuration
- Indexing settings
- Server configuration
- Logging settings

**Usage:**
```bash
cp .env.example .env
# Edit .env with your settings
```

---

### 2. Local Storage Configuration
**File:** `config.example.json`

**Purpose:** JSON configuration for local filesystem storage (development).

**Features:**
- Local file paths
- Canvas settings
- Performance tuning
- Auto-indexing
- Cache configuration

---

### 3. S3 Storage Configuration
**File:** `config.s3.example.json`

**Purpose:** Production configuration for AWS S3 or S3-compatible storage.

**Features:**
- S3 bucket and region
- Access credentials
- Manifest and asset prefixes
- High-performance settings
- Extended cache TTL

---

### 4. Remote Storage Configuration
**File:** `config.remote.example.json`

**Purpose:** Configuration for CDN-hosted or remote HTTP assets.

**Features:**
- Remote manifest URL
- Asset base URL
- Custom headers (authentication)
- Timeout settings
- Cache-only mode

---

## Test Fixtures

Location: `/tests/fixtures/`

### Runtime Surfaces

#### Slot Machine Surface
**File:** `runtime/slot-machine-surface.json`

**Purpose:** Runtime integration surface for the slot machine component.

**Contains:**
- State machine with current input values
- Trigger definitions
- Event handlers with callback names
- Data bindings with example values (reel symbols, payout table)
- Integration code references for React, Vue, Stencil

---

#### Loading Spinner Surface
**File:** `runtime/loading-spinner-surface.json`

**Purpose:** Runtime integration surface for the loading spinner component.

**Contains:**
- State machine with loading state
- Progress tracking inputs
- Event handlers
- Integration code references for multiple frameworks

---

### Motion Specifications

#### Celebration Sequence
**File:** `motion-specs/celebration-sequence.json`
**ID:** `celebration-big-win`

**Purpose:** Multi-component celebration for major wins.

**Components:**
- Slot machine (layer 1): Shows win amount and stops reels
- Character avatar (layer 2): Displays celebration emotion and reactions

**Timeline:**
- 0-3000ms: Slot machine win sequence
- 1000-3500ms: Character celebration
- Audio tracks: Win fanfare, celebration music

**Use Cases:**
- Jackpot wins
- Level completions
- Achievement unlocks

---

#### UI Interaction Flow
**File:** `motion-specs/ui-interaction-flow.json`
**ID:** `button-to-loader`

**Purpose:** Smooth transition from button click to loading state.

**Components:**
- Interactive button (layer 1): Press animation with fade out
- Loading spinner (layer 1): Fade in with matching position

**Timeline:**
- 0-500ms: Button press and exit animation
- 500ms+: Loading spinner entry and loop

**Use Cases:**
- Form submissions
- API calls
- Page transitions

---

### Asset Metadata

#### Mock Rive File Metadata
**File:** `assets/mock-riv-metadata.json`

**Purpose:** Simulated .riv file metadata for testing without actual Rive files.

**Contains metadata for:**
- slot-machine.riv (245KB, 3 artboards, 1 state machine)
- loading-spinner.riv (45KB, 2 artboards, 1 state machine)
- interactive-button.riv (32KB, 1 artboard, 1 state machine)
- character-avatar.riv (189KB, 4 artboards, 1 state machine)

**Metadata fields:**
- File size
- Rive version
- Artboard definitions
- State machine counts
- Asset counts (images, fonts, audio)
- Creation information

---

## Setup Scripts

Location: `/tools/scripts/`

### 1. Initialize Storage
**File:** `init-storage.ts`

**Purpose:** Creates the necessary directory structure and initializes storage for local development.

**Usage:**
```bash
npm run init-storage
# or with custom path:
npm run init-storage -- --base-path /custom/path
```

**Creates:**
```
data/
├── manifests/
│   ├── components/
│   ├── libraries/
│   └── index.json (empty)
├── assets/
│   └── rive/
└── .cache/
    ├── manifests/
    └── assets/
```

**Features:**
- Recursive directory creation
- Empty manifest index initialization
- .gitkeep files for empty directories
- Verbose/quiet modes
- Error handling and validation

---

### 2. Seed Manifests
**File:** `seed-manifests.ts`

**Purpose:** Populates storage with example manifests and components.

**Usage:**
```bash
npm run seed-manifests
# or with custom paths:
npm run seed-manifests -- --base-path /custom/path --examples-path /path/to/examples
```

**Copies:**
- 4 component manifests
- 2 library manifests
- 1 complete manifest index

**Features:**
- Automatic file detection
- Source validation
- Progress reporting
- Error handling

---

### 3. Validate Setup
**File:** `validate-setup.ts`

**Purpose:** Verifies that the Rive MCP environment is correctly configured.

**Usage:**
```bash
npm run validate-setup
# or with custom paths:
npm run validate-setup -- --base-path /custom/path --config /path/to/config.json
```

**Validates:**
- Configuration files exist and are valid JSON
- Directory structure is complete
- Manifest index exists and is valid
- Example data is present
- Test fixtures are available

**Output:**
- Detailed validation report
- Pass/fail counts
- Recommendations for fixes

---

## Integration Tests

Location: `/packages/mcp-server/tests/integration/`

### 1. List Components Test
**File:** `listComponents.test.ts`

**Tests:**
- Listing all available components
- Filtering by library ID
- Filtering by tags
- Filtering by category
- Component metadata structure
- State machine information presence

---

### 2. Get Component Detail Test
**File:** `getComponentDetail.test.ts`

**Tests:**
- Retrieving component by ID
- Complete manifest structure
- State machine definitions
- Input definitions with types
- Event definitions
- Handling non-existent components

---

### 3. Get Runtime Surface Test
**File:** `getRuntimeSurface.test.ts`

**Tests:**
- Retrieving runtime surface for component
- State machine runtime information
- Input values with current state
- Trigger definitions
- Event handlers
- Data bindings
- Integration code references

---

### 4. Compose Scene Test
**File:** `composeScene.test.ts`

**Tests:**
- Loading motion spec by ID
- Component timeline definitions
- Layer definitions
- Timeline start and duration
- Input values with timing
- Triggers with timing
- Audio tracks
- Transitions
- Metadata structure
- Multi-component compositions
- Entry and exit animations

---

## Documentation

### Main Documentation Files

1. **README.md** - Comprehensive overview with quick start and examples
2. **QUICKSTART.md** - Step-by-step guide to get started in 5 minutes
3. **ARCHITECTURE.md** - System architecture and design principles
4. **MONOREPO_STRUCTURE.md** - Project organization and directory structure
5. **AGENT_FLOW.md** - AI agent workflows and integration patterns
6. **ROADMAP.md** - Future development plans

---

## Quick Reference

### Component Summary

| Component | ID | Library | Inputs | Events | Use Case |
|-----------|----|---------| -------|--------|----------|
| Slot Machine | astralis-slot-machine | astralis-casino | 5 | 4 | Casino games |
| Loading Spinner | ui-loading-spinner | ui-components | 5 | 2 | Loading states |
| Interactive Button | ui-interactive-button | ui-components | 5 | 3 | UI interactions |
| Character Avatar | game-character-avatar | astralis-casino | 6 | 3 | Character animations |

### Configuration Quick Start

```bash
# Local Development (Default)
STORAGE_BACKEND=local
LOCAL_BASE_PATH=./data

# Production S3
STORAGE_BACKEND=s3
S3_BUCKET=my-rive-assets
S3_REGION=us-east-1

# Remote CDN
STORAGE_BACKEND=remote
REMOTE_MANIFEST_URL=https://cdn.example.com/manifests/index.json
```

### Common Commands

```bash
# Setup
npm run init-storage        # Initialize directories
npm run seed-manifests      # Add example data
npm run validate-setup      # Verify configuration

# Development
npm start                   # Start MCP server
npm test                    # Run all tests
npm test -- <test-file>     # Run specific test

# Testing specific tools
npm test -- listComponents.test.ts
npm test -- getComponentDetail.test.ts
npm test -- getRuntimeSurface.test.ts
npm test -- composeScene.test.ts
```

### File Locations

```
rive-mcp-server-core/
├── libs/rive-manifests/examples/           # Example manifests
├── tests/fixtures/                          # Test data
│   ├── runtime/                            # Runtime surfaces
│   ├── motion-specs/                       # Scene compositions
│   └── assets/                             # Mock metadata
├── tools/scripts/                          # Setup utilities
├── packages/mcp-server/tests/integration/  # Integration tests
├── .env.example                            # Environment template
├── config.example.json                     # Local config
├── config.s3.example.json                  # S3 config
├── config.remote.example.json              # Remote config
├── QUICKSTART.md                           # Quick start guide
└── README.md                               # Main documentation
```

---

## Developer Workflows

### First-Time Setup

1. `npm install` - Install dependencies
2. `npm run init-storage` - Create directories
3. `npm run seed-manifests` - Add example data
4. `npm run validate-setup` - Verify everything
5. `npm start` - Start the server

### Adding New Components

1. Create component manifest in `libs/rive-manifests/examples/`
2. Add to library manifest
3. Update manifest index
4. Create test fixture in `tests/fixtures/runtime/`
5. Add integration test
6. Run `npm test` to verify

### Testing Changes

1. Run all tests: `npm test`
2. Run specific tool test: `npm test -- <tool>.test.ts`
3. Validate setup: `npm run validate-setup`
4. Manual testing: `npm start` and use MCP tools

---

## Summary

This comprehensive example system provides:

- **4 realistic component manifests** covering casino games and UI elements
- **2 library manifests** organizing components by domain
- **1 complete manifest index** for central discovery
- **3 configuration examples** for local, S3, and remote storage
- **4 test fixtures** with runtime surfaces and motion specs
- **3 setup scripts** for initialization, seeding, and validation
- **4 integration test suites** covering all MCP tools
- **Complete documentation** with quick start and examples

All files are production-ready and follow TypeScript best practices with comprehensive type safety.
