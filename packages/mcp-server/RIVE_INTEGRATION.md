# Rive File Integration Guide

## Overview

This document explains how the MCP server tools interact with Rive (.riv) files and provides guidance for integrating the actual Rive runtime.

## Rive File Structure

### What is a .riv File?

A `.riv` file is a binary format containing:
- **Artboards:** Canvas areas with specific dimensions
- **State Machines:** Animation logic and transitions
- **Inputs:** Interactive parameters (bool, number, trigger)
- **Events:** Custom events that can be fired
- **Animations:** Timeline-based or procedural animations
- **Assets:** Embedded images and other resources

### File Inspection Flow

```
.riv file
  ↓
Read binary data
  ↓
Parse with Rive runtime
  ↓
Extract metadata
  ├── Artboards (dimensions, names)
  ├── State Machines (names, layer count)
  │   └── Inputs (name, type, default value)
  ├── Events (names, properties)
  └── Data Bindings (if present)
```

## Current Implementation

### Mock Data Approach

The current implementation in `/packages/mcp-server/src/utils/riveParser.ts` uses mock data to demonstrate the structure without requiring the Rive runtime:

```typescript
// Current mock implementation
async function extractArtboards(fileBuffer: Buffer): Promise<RiveArtboard[]> {
  // Returns mock data
  return [
    {
      name: 'Main',
      width: 500,
      height: 500,
    },
  ];
}

async function extractStateMachines(fileBuffer: Buffer): Promise<RiveStateMachine[]> {
  // Returns mock data
  return [
    {
      name: 'State Machine 1',
      inputs: [
        { name: 'isHover', type: 'bool', defaultValue: false },
        { name: 'progress', type: 'number', defaultValue: 0 },
        { name: 'trigger', type: 'trigger' },
      ],
      layerCount: 1,
    },
  ];
}
```

**Why Mock Data?**
- Allows development without Rive runtime dependency
- Demonstrates expected data structure
- Enables testing of downstream tools
- Clear integration points marked

## Production Integration with @rive-app/canvas

### Step 1: Install Rive Runtime

```bash
npm install @rive-app/canvas
```

### Step 2: Update Parser Implementation

Replace the mock functions in `/packages/mcp-server/src/utils/riveParser.ts`:

```typescript
import { Rive } from '@rive-app/canvas';

/**
 * Inspect Rive file using actual runtime
 */
async function inspectRiveRuntime(
  fileBuffer: Buffer,
  filePath: string
): Promise<Omit<RiveRuntimeSurface, 'metadata'>> {
  const componentId = path.basename(filePath, '.riv');

  return new Promise((resolve, reject) => {
    const rive = new Rive({
      buffer: fileBuffer.buffer,
      autoplay: false,
      onLoad: () => {
        try {
          const artboards = extractArtboardsFromRive(rive);
          const stateMachines = extractStateMachinesFromRive(rive);
          const events = extractEventsFromRive(rive);

          // Clean up
          rive.cleanup();

          resolve({
            componentId,
            artboards,
            stateMachines,
            events,
            dataBindings: [],
          });
        } catch (error) {
          rive.cleanup();
          reject(error);
        }
      },
      onLoadError: (error) => {
        reject(new Error(`Failed to load Rive file: ${error}`));
      },
    });
  });
}

/**
 * Extract artboards from loaded Rive instance
 */
function extractArtboardsFromRive(rive: Rive): RiveArtboard[] {
  const artboards: RiveArtboard[] = [];

  // Get artboard count
  const artboardCount = rive.artboardCount;

  for (let i = 0; i < artboardCount; i++) {
    const artboard = rive.artboardByIndex(i);

    artboards.push({
      name: artboard.name,
      width: artboard.bounds.maxX - artboard.bounds.minX,
      height: artboard.bounds.maxY - artboard.bounds.minY,
    });
  }

  return artboards;
}

/**
 * Extract state machines from loaded Rive instance
 */
function extractStateMachinesFromRive(rive: Rive): RiveStateMachine[] {
  const stateMachines: RiveStateMachine[] = [];

  // Get first artboard (most common case)
  const artboard = rive.artboardByIndex(0);
  if (!artboard) return stateMachines;

  const smCount = artboard.stateMachineCount;

  for (let i = 0; i < smCount; i++) {
    const sm = artboard.stateMachineByIndex(i);

    // Extract inputs
    const inputs: RiveStateMachineInput[] = [];
    const inputCount = sm.inputCount;

    for (let j = 0; j < inputCount; j++) {
      const input = sm.input(j);

      let type: 'bool' | 'number' | 'trigger';
      let defaultValue: boolean | number | undefined;

      if (input.type === 'Boolean') {
        type = 'bool';
        defaultValue = input.value as boolean;
      } else if (input.type === 'Number') {
        type = 'number';
        defaultValue = input.value as number;
      } else {
        type = 'trigger';
        defaultValue = undefined;
      }

      inputs.push({
        name: input.name,
        type,
        defaultValue,
      });
    }

    stateMachines.push({
      name: sm.name,
      inputs,
      layerCount: sm.layerCount,
    });
  }

  return stateMachines;
}

/**
 * Extract events from loaded Rive instance
 */
function extractEventsFromRive(rive: Rive): RiveStateMachineEvent[] {
  const events: RiveStateMachineEvent[] = [];

  // Rive events are typically discovered at runtime
  // This would need to be enhanced based on your specific needs
  // For now, return empty array and document the extension point

  return events;
}

/**
 * Validate Rive file format
 */
export async function validateRiveFile(filePath: string): Promise<boolean> {
  try {
    const fileBuffer = await fs.readFile(filePath);

    return new Promise((resolve) => {
      const rive = new Rive({
        buffer: fileBuffer.buffer,
        autoplay: false,
        onLoad: () => {
          rive.cleanup();
          resolve(true);
        },
        onLoadError: () => {
          resolve(false);
        },
      });
    });
  } catch (error) {
    return false;
  }
}
```

### Step 3: Handle Canvas Requirements

The Rive runtime requires a canvas context. For server-side parsing, use `node-canvas`:

```bash
npm install canvas
```

```typescript
import { createCanvas } from 'canvas';

// Create an offscreen canvas for parsing
const canvas = createCanvas(800, 600);

const rive = new Rive({
  buffer: fileBuffer.buffer,
  canvas: canvas,
  autoplay: false,
  // ... rest of config
});
```

### Step 4: Error Handling

Add comprehensive error handling:

```typescript
async function parseRiveFile(filePath: string): Promise<RiveRuntimeSurface> {
  try {
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);

    // Validate file size (prevent loading huge files)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileStats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${fileStats.size} bytes (max ${MAX_FILE_SIZE})`);
    }

    // Parse with timeout
    const PARSE_TIMEOUT = 30000; // 30 seconds
    const runtimeSurface = await Promise.race([
      inspectRiveRuntime(fileBuffer, filePath),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Parse timeout')), PARSE_TIMEOUT)
      ),
    ]);

    return {
      ...runtimeSurface,
      metadata: {
        fileSize: fileStats.size,
        parseDate: new Date().toISOString(),
        runtimeVersion: getRiveRuntimeVersion(),
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to parse Rive file at ${filePath}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

function getRiveRuntimeVersion(): string {
  // Get actual version from package.json
  try {
    const pkg = require('@rive-app/canvas/package.json');
    return pkg.version;
  } catch {
    return 'unknown';
  }
}
```

## Tool Integration Points

### 1. getRuntimeSurface Tool

**Current:** Uses mock parser
**Integration:** Direct use of updated `parseRiveFile()`

```typescript
// In getRuntimeSurface.ts
const runtimeSurface = await parseRiveFile(assetPath);
// Now returns actual data from Rive file
```

### 2. generateWrapper Tool

**Current:** Works with mock runtime surface
**Integration:** Automatically works with real data

```typescript
// Generates accurate wrapper based on actual inputs
const surface = await getRuntimeSurface({ componentId });
const wrapper = await generateWrapper({
  surface: surface.data,
  framework: 'react'
});
// Wrapper now has correct inputs, events, artboards
```

### 3. getComponentDetail Tool

**Current:** Basic metadata only
**Integration:** Enhanced with actual file info

```typescript
// Can now show accurate artboard count, state machine count
const detail = await getComponentDetail({ id });
console.log('Artboards:', detail.data.asset.metadata.artboards);
```

## Performance Optimization

### Caching Strategy

```typescript
import * as NodeCache from 'node-cache';

const runtimeSurfaceCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // Check every 10 minutes
});

export async function parseRiveFile(filePath: string): Promise<RiveRuntimeSurface> {
  // Check cache first
  const cacheKey = `surface:${filePath}`;
  const cached = runtimeSurfaceCache.get<RiveRuntimeSurface>(cacheKey);

  if (cached) {
    return cached;
  }

  // Parse file
  const surface = await parseRiveFileUncached(filePath);

  // Cache result
  runtimeSurfaceCache.set(cacheKey, surface);

  return surface;
}
```

### Parallel Processing

```typescript
// Process multiple files in parallel
export async function parseMultipleRiveFiles(
  filePaths: string[]
): Promise<RiveRuntimeSurface[]> {
  return Promise.all(filePaths.map(parseRiveFile));
}
```

### Worker Threads

For CPU-intensive parsing:

```typescript
import { Worker } from 'worker_threads';

export async function parseRiveFileInWorker(
  filePath: string
): Promise<RiveRuntimeSurface> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./riveParserWorker.js', {
      workerData: { filePath },
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
```

## Runtime Surface Data Examples

### Example 1: Simple Button

```typescript
{
  componentId: 'animated-button',
  artboards: [
    {
      name: 'Main',
      width: 200,
      height: 60
    }
  ],
  stateMachines: [
    {
      name: 'Button State Machine',
      inputs: [
        {
          name: 'isHover',
          type: 'bool',
          defaultValue: false
        },
        {
          name: 'isPressed',
          type: 'bool',
          defaultValue: false
        },
        {
          name: 'click',
          type: 'trigger'
        }
      ],
      layerCount: 3
    }
  ],
  events: [
    {
      name: 'onButtonClick',
      properties: {}
    }
  ],
  metadata: {
    fileSize: 15234,
    parseDate: '2025-11-07T10:30:00Z',
    runtimeVersion: '2.7.0'
  }
}
```

### Example 2: Complex Animation

```typescript
{
  componentId: 'hero-animation',
  artboards: [
    {
      name: 'Desktop',
      width: 1920,
      height: 1080
    },
    {
      name: 'Mobile',
      width: 375,
      height: 667
    }
  ],
  stateMachines: [
    {
      name: 'Main State Machine',
      inputs: [
        {
          name: 'scrollProgress',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'isVisible',
          type: 'bool',
          defaultValue: false
        },
        {
          name: 'reset',
          type: 'trigger'
        }
      ],
      layerCount: 10
    },
    {
      name: 'Interaction State Machine',
      inputs: [
        {
          name: 'mouseX',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'mouseY',
          type: 'number',
          defaultValue: 0
        }
      ],
      layerCount: 5
    }
  ],
  events: [
    {
      name: 'onAnimationComplete',
      properties: { duration: 'number' }
    },
    {
      name: 'onStateChange',
      properties: { state: 'string' }
    }
  ],
  dataBindings: [],
  metadata: {
    fileSize: 2456789,
    parseDate: '2025-11-07T10:30:00Z',
    runtimeVersion: '2.7.0'
  }
}
```

## Testing with Real Rive Files

### Test Suite Structure

```typescript
describe('Rive File Parsing', () => {
  const testRivePath = path.join(__dirname, 'fixtures', 'test.riv');

  it('should parse artboards correctly', async () => {
    const surface = await parseRiveFile(testRivePath);
    expect(surface.artboards).toHaveLength(1);
    expect(surface.artboards[0].name).toBe('Main');
  });

  it('should extract state machine inputs', async () => {
    const surface = await parseRiveFile(testRivePath);
    expect(surface.stateMachines[0].inputs).toBeDefined();
    expect(surface.stateMachines[0].inputs.length).toBeGreaterThan(0);
  });

  it('should handle invalid files gracefully', async () => {
    await expect(parseRiveFile('invalid.riv')).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Workflow', () => {
  it('should complete discovery to generation workflow', async () => {
    // 1. List libraries
    const libraries = await listLibraries({});
    expect(libraries.status).toBe('success');

    // 2. List components
    const components = await listComponents({
      libraryId: libraries.data[0].id,
    });
    expect(components.status).toBe('success');

    // 3. Get runtime surface
    const surface = await getRuntimeSurface({
      componentId: components.data[0].id,
    });
    expect(surface.status).toBe('success');
    expect(surface.data.artboards.length).toBeGreaterThan(0);

    // 4. Generate wrapper
    const wrapper = await generateWrapper({
      surface: surface.data,
      framework: 'react',
      riveSrc: components.data[0].filePath,
    });
    expect(wrapper.status).toBe('success');
    expect(wrapper.data.code).toContain('useRive');
  });
});
```

## Troubleshooting

### Common Issues

**Issue:** Canvas context errors in Node.js
**Solution:** Install and use `node-canvas`

**Issue:** File not found errors
**Solution:** Verify `ASSETS_PATH` environment variable and file paths in manifests

**Issue:** Parse timeout
**Solution:** Increase timeout or check file complexity

**Issue:** Memory issues with large files
**Solution:** Implement streaming or chunk-based parsing

**Issue:** Incorrect input extraction
**Solution:** Verify Rive file version compatibility

## Future Enhancements

1. **Streaming Parser:** For very large .riv files
2. **Incremental Updates:** Detect changes without full reparse
3. **Asset Extraction:** Export embedded images and resources
4. **Animation Analysis:** Analyze timeline and complexity
5. **Optimization Suggestions:** Recommend file optimizations
6. **Version Management:** Track Rive file format versions
7. **Preview Generation:** Create thumbnail images
8. **Dependency Analysis:** Identify shared assets

## Resources

- Rive Runtime Documentation: https://rive.app/community/doc/web-js/docvlgRjI1sy
- Rive File Format: https://rive.app/community/doc/overview/docF0wqYPnJD
- Node Canvas: https://github.com/Automattic/node-canvas

## Summary

The current implementation provides a complete infrastructure for Rive file integration with clear integration points. The mock data approach allows development to proceed while the actual Rive runtime integration can be added incrementally. All downstream tools (wrapper generation, scene composition) will work automatically once real parsing is implemented.
