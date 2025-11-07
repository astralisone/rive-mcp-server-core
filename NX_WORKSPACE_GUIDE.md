# NX Workspace Guide - AstralisMotion Rive MCP

## Overview

This monorepo uses NX to manage the build system, dependencies, and task orchestration for the AstralisMotion Rive MCP project.

## Workspace Structure

```
/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/
├── apps/                    # Applications
│   ├── web/                # Main web application
│   ├── demo/               # Demo application
│   ├── dashboard/          # Dashboard application
│   └── cli/                # CLI tool
├── libs/                    # Shared libraries
│   ├── rive-components/    # Rive component library
│   ├── motion-scenes/      # Motion scene definitions
│   ├── motion-specs/       # Motion specifications
│   ├── rive-manifests/     # Rive manifest management
│   ├── motion-utils/       # Motion utilities
│   ├── design-tokens/      # Design system tokens
│   ├── motion-qa/          # Quality assurance utilities
│   └── types/              # Shared TypeScript types
└── packages/                # Core packages
    ├── mcp-server/         # MCP server implementation
    ├── mcp-agents/         # MCP agent definitions
    ├── telemetry-service/  # Telemetry and monitoring
    ├── scene-composer/     # Scene composition engine
    └── rive-synth/         # Rive synthesis tools
```

## Installation

```bash
npm install
```

This will install all dependencies including NX and related tooling.

## Common Commands

### Development

```bash
# Start the demo app (port 3001)
npm run dev

# Start the web app (port 3000)
npm run dev:web

# Start the dashboard app (port 3002)
npm run dev:dashboard
```

### Building

```bash
# Build all projects
npm run build

# Build only affected projects (since last commit)
npm run build:affected

# Build all libraries only
npm run build:libs

# Build all packages only
npm run build:packages

# Build all applications only
npm run build:apps

# Build a specific project
npx nx build <project-name>
# Examples:
npx nx build mcp-server
npx nx build web
npx nx build rive-components
```

### Testing

```bash
# Run all tests
npm test

# Run only affected tests
npm run test:affected

# Run tests in watch mode
npm run test:watch

# Run tests for a specific project
npx nx test <project-name>
```

### Type Checking

```bash
# Type check all projects
npm run typecheck

# Type check only affected projects
npm run typecheck:affected

# Type check a specific project
npx nx typecheck <project-name>
```

### Linting

```bash
# Lint all projects
npm run lint

# Lint only affected projects
npm run lint:affected

# Lint a specific project
npx nx lint <project-name>
```

### Code Formatting

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

### Visualization

```bash
# View dependency graph
npm run graph

# View affected project graph
npm run affected:graph
```

### Maintenance

```bash
# Clean all build artifacts and NX cache
npm run clean
```

## Advanced NX Commands

### Running Multiple Targets

```bash
# Run multiple targets in parallel
npx nx run-many --target=build --projects=web,demo,dashboard

# Run target for projects matching a tag
npx nx run-many --target=build --projects=tag:type:lib
```

### Affected Commands

NX's affected commands only run tasks on projects that have changed:

```bash
# Show affected projects
npx nx affected:apps
npx nx affected:libs

# Run tests on affected projects
npx nx affected --target=test

# Build affected projects
npx nx affected --target=build
```

### Task Dependencies

Tasks automatically respect dependencies defined in project.json files:
- Building a project will automatically build its dependencies first
- The `dependsOn` configuration ensures proper build order

## Project Tags

Projects are tagged for easy filtering:

- **type:app** - Applications (web, demo, dashboard, cli)
- **type:lib** - Shared libraries
- **type:package** - Core packages
- **scope:frontend** - Frontend applications
- **scope:mcp** - MCP-related packages
- **scope:rive** - Rive-specific components
- **scope:motion** - Motion-related libraries
- **scope:design** - Design system libraries
- **scope:telemetry** - Telemetry services
- **scope:cli** - CLI tools
- **scope:qa** - Quality assurance tools
- **scope:shared** - Shared utilities

## Path Aliases

Import libraries using clean path aliases:

```typescript
// Libraries
import { Component } from '@astralismotion/rive-components';
import { Scene } from '@astralismotion/motion-scenes';
import { MotionSpec } from '@astralismotion/motion-specs';
import { Manifest } from '@astralismotion/rive-manifests';
import { motionUtil } from '@astralismotion/motion-utils';
import { tokens } from '@astralismotion/design-tokens';
import { QAUtil } from '@astralismotion/motion-qa';
import { SharedType } from '@astralismotion/types';

// Packages
import { MCPServer } from '@astralismotion/mcp-server';
import { Agent } from '@astralismotion/mcp-agents';
import { Telemetry } from '@astralismotion/telemetry-service';
import { Composer } from '@astralismotion/scene-composer';
import { Synth } from '@astralismotion/rive-synth';
```

## Caching

NX automatically caches task results for:
- build
- test
- lint
- typecheck

This means subsequent runs are extremely fast if nothing has changed.

### Cache Management

```bash
# Clear cache
npx nx reset

# View cache statistics
npx nx daemon
```

## Configuration Files

- **nx.json** - NX workspace configuration
- **project.json** - Individual project configurations (in each project directory)
- **tsconfig.base.json** - Base TypeScript configuration with path mappings
- **jest.preset.js** - Jest configuration preset
- **.prettierrc** - Code formatting rules

## Task Execution

NX runs tasks in parallel when possible (default: 3 parallel tasks). Tasks respect:
1. Explicit dependencies (`dependsOn`)
2. Implicit dependencies (via imports)
3. Build order requirements

## Performance Tips

1. Use `affected` commands during development to only build/test what changed
2. Let NX cache handle repeated builds
3. Use `--parallel` flag for more parallel execution: `npx nx affected --target=build --parallel=5`
4. Use `--skip-nx-cache` if you need to force a fresh build

## Troubleshooting

### Cache Issues

```bash
# Reset NX cache
npx nx reset

# Clear node_modules and reinstall
npm run clean
npm install
```

### Build Issues

```bash
# Build with verbose output
npx nx build <project> --verbose

# Skip cache for debugging
npx nx build <project> --skip-nx-cache
```

### Dependency Issues

```bash
# View project dependencies
npx nx graph

# View specific project dependency tree
npx nx show project <project-name> --web
```

## CI/CD Integration

NX is optimized for CI/CD environments:

```bash
# In CI, only test affected projects
npx nx affected --target=test --base=origin/main

# Build affected projects for deployment
npx nx affected --target=build --base=origin/main --configuration=production
```

## Additional Resources

- [NX Documentation](https://nx.dev)
- [NX Cloud](https://nx.app) - For distributed caching and task execution
- Project-specific README files in each app/lib/package directory
