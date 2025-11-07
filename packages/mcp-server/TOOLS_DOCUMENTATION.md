# MCP Server Tools Documentation

This document describes the implemented MCP server tools for interacting with Rive files and libraries.

## Overview

The Rive MCP Server provides six main tools for discovering, inspecting, and orchestrating Rive animations:

1. **listLibraries** - List available Rive libraries
2. **listComponents** - List components within libraries
3. **getComponentDetail** - Get detailed information about a component
4. **getRuntimeSurface** - Extract runtime information from .riv files
5. **generateWrapper** - Generate framework-specific wrappers
6. **composeScene** - Compose multi-Rive orchestrated scenes

## Architecture

### Storage System

The tools use a manifest-based storage system located at:
- Manifests: `libs/rive-manifests/*.library.json`
- Assets: `assets/rive/*.riv`
- Scenes: `libs/motion-scenes/*.scene.json`

Environment variables:
- `MANIFESTS_PATH` - Override default manifests location
- `ASSETS_PATH` - Override default assets location
- `SCENES_PATH` - Override default scenes location

### Type System

All tools use TypeScript types defined in `/packages/mcp-server/src/types/index.ts`:

- `RiveLibrary` - Library manifest structure
- `RiveComponent` - Component definition
- `RiveRuntimeSurface` - Parsed runtime information from .riv files
- `MCPToolResponse<T>` - Standardized response format

## Tool Descriptions

### 1. listLibraries

Lists all available Rive libraries from manifest storage.

**Parameters:**
```typescript
{
  tags?: string[];      // Filter by tags
  search?: string;      // Search by name or description
}
```

**Response:**
```typescript
{
  status: 'success',
  tool: 'listLibraries',
  data: RiveLibrary[],
  timestamp: string
}
```

**Example:**
```typescript
const result = await listLibraries({
  tags: ['ui', 'buttons'],
  search: 'animated'
});
```

**Features:**
- Scans manifest directory for `.library.json` files
- Filters by tags and search terms
- Sorts results alphabetically by name
- Handles missing directories gracefully

---

### 2. listComponents

Lists components within libraries with optional filtering.

**Parameters:**
```typescript
{
  libraryId?: string;   // Filter by specific library
  tags?: string[];      // Filter by tags
  search?: string;      // Search by name or description
}
```

**Response:**
```typescript
{
  status: 'success',
  tool: 'listComponents',
  data: RiveComponent[],
  timestamp: string
}
```

**Example:**
```typescript
// List all components in a library
const result = await listComponents({
  libraryId: 'ui-library-001'
});

// Search across all libraries
const result = await listComponents({
  search: 'button',
  tags: ['interactive']
});
```

**Features:**
- Can filter by library, tags, or search terms
- Searches across all libraries if no libraryId provided
- Combines multiple filters efficiently
- Returns sorted results

---

### 3. getComponentDetail

Gets detailed information about a specific component including asset metadata.

**Parameters:**
```typescript
{
  id: string;  // Component ID (required)
}
```

**Response:**
```typescript
{
  status: 'success',
  tool: 'getComponentDetail',
  data: {
    ...RiveComponent,
    library: {
      id: string;
      name: string;
      version: string;
    },
    asset: {
      exists: boolean;
      metadata?: {
        fileName: string;
        fileSize: number;
        isValid: boolean;
        lastModified: Date;
      }
    }
  },
  timestamp: string
}
```

**Example:**
```typescript
const result = await getComponentDetail({
  id: 'animated-button-001'
});

if (result.data.asset.exists) {
  console.log('File size:', result.data.asset.metadata.fileSize);
}
```

**Features:**
- Validates component existence
- Checks if .riv asset file exists
- Extracts basic file metadata
- Returns library context

---

### 4. getRuntimeSurface

Extracts runtime information from .riv files using the Rive runtime.

**Parameters:**
```typescript
{
  componentId: string;  // Component ID (required)
}
```

**Response:**
```typescript
{
  status: 'success',
  tool: 'getRuntimeSurface',
  data: {
    componentId: string;
    artboards: Array<{
      name: string;
      width: number;
      height: number;
    }>;
    stateMachines: Array<{
      name: string;
      inputs: Array<{
        name: string;
        type: 'bool' | 'number' | 'trigger';
        defaultValue?: boolean | number;
      }>;
      layerCount: number;
    }>;
    events: Array<{
      name: string;
      properties?: Record<string, any>;
    }>;
    dataBindings?: Array<{
      name: string;
      type: string;
      path: string;
    }>;
    metadata: {
      fileSize: number;
      parseDate: string;
      runtimeVersion?: string;
    }
  },
  timestamp: string
}
```

**Example:**
```typescript
const result = await getRuntimeSurface({
  componentId: 'animated-button-001'
});

// Access state machine inputs
result.data.stateMachines[0].inputs.forEach(input => {
  console.log(`Input: ${input.name} (${input.type})`);
});
```

**Features:**
- Parses .riv files using Rive runtime
- Extracts artboards with dimensions
- Lists state machines with all inputs
- Identifies events and data bindings
- Returns file metadata

**Note:** Current implementation includes mock data. To use actual Rive runtime:
1. Install `@rive-app/canvas` package
2. Update `/packages/mcp-server/src/utils/riveParser.ts` to use real runtime
3. Replace mock extraction functions with actual Rive API calls

---

### 5. generateWrapper

Generates framework-specific wrapper components for Rive animations.

**Note:** This tool is implemented by another agent. See `/packages/mcp-server/src/generators/` for implementation details.

**Supported Frameworks:**
- React (TypeScript/JavaScript)
- Vue 3
- Stencil Web Components
- Angular
- Svelte

**Parameters:**
```typescript
{
  surface: RuntimeSurface;          // Runtime surface data
  framework?: TargetFramework | "all"; // Target framework
  riveSrc: string;                  // Path to .riv file
  componentName?: string;           // Override component name
  outputPath?: string;              // Output directory
  writeToFile?: boolean;            // Write to filesystem
}
```

**Example:**
```typescript
// First get runtime surface
const surface = await getRuntimeSurface({ componentId: 'button-001' });

// Generate React wrapper
const result = await generateWrapper({
  surface: surface.data,
  framework: 'react',
  riveSrc: '/assets/button.riv',
  componentName: 'AnimatedButton',
  writeToFile: true
});
```

---

### 6. composeScene

Composes multiple Rive components into orchestrated scenes with interactions, timelines, and rules.

**Parameters:**
```typescript
{
  name: string;                      // Scene name (required)
  description?: string;              // Scene description
  components: Array<{
    componentId: string;             // Component ID
    instanceName: string;            // Unique instance name
    position?: { x: number; y: number };
    scale?: number;
    zIndex?: number;
    interactions?: Array<{
      trigger: string;               // Event trigger
      target: string;                // Target instance name
      action: string;                // Action to perform
      params?: Record<string, any>;
    }>;
  }>;
  orchestration?: {
    timeline?: Array<{
      time: number;                  // Time in milliseconds
      component: string;             // Instance name
      action: string;                // Action to perform
      params?: Record<string, any>;
    }>;
    rules?: Array<{
      condition: string;             // Condition expression
      actions: Array<{
        component: string;           // Instance name
        action: string;              // Action to perform
        params?: Record<string, any>;
      }>;
    }>;
  };
}
```

**Response:**
```typescript
{
  status: 'success',
  tool: 'composeScene',
  data: {
    id: string;
    name: string;
    description?: string;
    components: [...],              // Validated components
    orchestration?: {...},          // Orchestration rules
    createdAt: string;
    metadata: {
      totalComponents: number;
      hasTimeline: boolean;
      hasRules: boolean;
      hasInteractions: boolean;
    }
  },
  timestamp: string
}
```

**Example:**
```typescript
const result = await composeScene({
  name: 'Hero Animation',
  description: 'Main hero section with interactive elements',
  components: [
    {
      componentId: 'background-001',
      instanceName: 'heroBackground',
      position: { x: 0, y: 0 },
      zIndex: 0
    },
    {
      componentId: 'button-001',
      instanceName: 'ctaButton',
      position: { x: 400, y: 300 },
      zIndex: 10,
      interactions: [
        {
          trigger: 'click',
          target: 'heroBackground',
          action: 'setState',
          params: { state: 'active' }
        }
      ]
    }
  ],
  orchestration: {
    timeline: [
      {
        time: 0,
        component: 'heroBackground',
        action: 'play',
        params: { state: 'intro' }
      },
      {
        time: 2000,
        component: 'ctaButton',
        action: 'fadeIn',
        params: { duration: 500 }
      }
    ],
    rules: [
      {
        condition: 'heroBackground.state === "active"',
        actions: [
          {
            component: 'ctaButton',
            action: 'pulse',
            params: { intensity: 1.2 }
          }
        ]
      }
    ]
  }
});

// Scene saved to: libs/motion-scenes/{scene-id}.scene.json
console.log('Scene created:', result.data.id);
```

**Features:**
- Validates all component IDs exist
- Validates interaction targets
- Validates timeline component references
- Validates rule action targets
- Generates unique scene ID
- Saves scene manifest to storage
- Provides metadata about scene complexity

**Validation:**
- All componentIds must exist in library manifests
- Interaction targets must reference valid instanceNames
- Timeline components must reference valid instanceNames
- Rule action components must reference valid instanceNames
- Scene name is required
- At least one component is required

---

## Error Handling

All tools return a standardized error format:

```typescript
{
  status: 'error',
  tool: string,
  error: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: string
}
```

**Common Error Codes:**
- `MISSING_PARAMETER` - Required parameter not provided
- `COMPONENT_NOT_FOUND` - Component ID not found in manifests
- `LIBRARY_NOT_FOUND` - Library ID not found in manifests
- `INVALID_INTERACTION` - Interaction target not found
- `INVALID_TIMELINE` - Timeline component not found
- `INVALID_RULE` - Rule action component not found
- `UNSUPPORTED_FRAMEWORK` - Framework not supported by generator
- `LIST_LIBRARIES_ERROR` - Error listing libraries
- `LIST_COMPONENTS_ERROR` - Error listing components
- `GET_COMPONENT_DETAIL_ERROR` - Error getting component details
- `GET_RUNTIME_SURFACE_ERROR` - Error parsing Rive file
- `GENERATE_WRAPPER_ERROR` - Error generating wrapper code
- `COMPOSE_SCENE_ERROR` - Error composing scene

## Utilities

### Storage Utilities (`/packages/mcp-server/src/utils/storage.ts`)

- `getAllLibraries()` - Get all library manifests
- `getLibraryById(id)` - Get specific library
- `saveLibrary(library)` - Save library manifest
- `getAllComponents()` - Get all components across libraries
- `getComponentsByLibrary(libraryId)` - Get components in library
- `getComponentById(id)` - Get specific component
- `addComponentToLibrary(libraryId, component)` - Add component to library
- `removeComponentFromLibrary(libraryId, componentId)` - Remove component
- `searchComponents(query)` - Search components by name/tags
- `getAssetPath(componentId)` - Get asset file path
- `assetExists(componentId)` - Check if asset file exists

### Rive Parser Utilities (`/packages/mcp-server/src/utils/riveParser.ts`)

- `parseRiveFile(filePath)` - Parse .riv file and extract runtime surface
- `validateRiveFile(filePath)` - Validate .riv file format
- `extractRiveMetadata(filePath)` - Extract basic file metadata

**Note:** These functions currently use mock data. Integrate with `@rive-app/canvas` for production use.

### Code Generation Utilities (`/packages/mcp-server/src/utils/codeGenerators.ts`)

- `generateReactWrapper(component, surface, options)` - Generate React component
- `generateVueWrapper(component, surface, options)` - Generate Vue component
- `generateStencilWrapper(component, surface, options)` - Generate Stencil component
- `generateAngularWrapper(component, surface, options)` - Generate Angular component
- `generateSvelteWrapper(component, surface, options)` - Generate Svelte component

## Integration with Rive Runtime

To integrate with the actual Rive runtime (`@rive-app/canvas`):

1. **Install the package:**
   ```bash
   npm install @rive-app/canvas
   ```

2. **Update riveParser.ts:**
   ```typescript
   import { Rive } from '@rive-app/canvas';

   async function inspectRiveRuntime(fileBuffer: Buffer, filePath: string) {
     const rive = new Rive({
       buffer: fileBuffer.buffer,
       autoplay: false
     });

     // Extract artboards
     const artboards = rive.artboardNames.map(name => {
       const artboard = rive.artboardByName(name);
       return {
         name: artboard.name,
         width: artboard.bounds.maxX - artboard.bounds.minX,
         height: artboard.bounds.maxY - artboard.bounds.minY
       };
     });

     // Extract state machines and inputs
     const stateMachines = rive.stateMachineNames.map(name => {
       const sm = rive.stateMachineByName(name);
       return {
         name: sm.name,
         inputs: sm.inputs.map(input => ({
           name: input.name,
           type: input.type,
           defaultValue: input.value
         })),
         layerCount: sm.layerCount
       };
     });

     return { artboards, stateMachines, events: [], dataBindings: [] };
   }
   ```

## Usage Examples

### Complete Workflow Example

```typescript
// 1. List all available libraries
const libraries = await listLibraries({});
console.log('Available libraries:', libraries.data);

// 2. List components in a specific library
const components = await listComponents({
  libraryId: libraries.data[0].id
});

// 3. Get detailed info about a component
const detail = await getComponentDetail({
  id: components.data[0].id
});

// 4. Get runtime surface (inputs, events, etc.)
const surface = await getRuntimeSurface({
  componentId: components.data[0].id
});

console.log('State machine inputs:', surface.data.stateMachines[0].inputs);

// 5. Generate React wrapper
const wrapper = await generateWrapper({
  surface: surface.data,
  framework: 'react',
  riveSrc: detail.data.filePath,
  componentName: 'MyRiveComponent'
});

console.log('Generated code:', wrapper.data.code);

// 6. Compose a scene with multiple components
const scene = await composeScene({
  name: 'My Animated Scene',
  components: [
    {
      componentId: components.data[0].id,
      instanceName: 'mainAnimation',
      position: { x: 0, y: 0 }
    },
    {
      componentId: components.data[1].id,
      instanceName: 'overlay',
      position: { x: 100, y: 100 },
      zIndex: 10
    }
  ],
  orchestration: {
    timeline: [
      {
        time: 0,
        component: 'mainAnimation',
        action: 'play'
      },
      {
        time: 1000,
        component: 'overlay',
        action: 'fadeIn'
      }
    ]
  }
});

console.log('Scene created:', scene.data.id);
```

## File Structure

```
packages/mcp-server/src/
├── types/
│   └── index.ts                 # Type definitions
├── utils/
│   ├── storage.ts              # Manifest storage utilities
│   ├── riveParser.ts           # Rive file parsing
│   └── codeGenerators.ts       # Framework wrapper generators
├── generators/                  # Additional generator implementation
│   ├── index.ts
│   ├── types.ts
│   ├── utils.ts
│   └── templates/
│       ├── react.template.ts
│       ├── vue.template.ts
│       └── stencil.template.ts
└── tools/
    ├── listLibraries.ts        # List libraries tool
    ├── listComponents.ts       # List components tool
    ├── getComponentDetail.ts   # Get component detail tool
    ├── getRuntimeSurface.ts    # Get runtime surface tool
    ├── generateWrapper.ts      # Generate wrapper tool
    └── composeScene.ts         # Compose scene tool
```

## Next Steps

1. **Integrate Rive Runtime:** Replace mock data in riveParser.ts with actual `@rive-app/canvas` calls
2. **Add Caching:** Implement caching for parsed runtime surfaces
3. **Scene Rendering:** Build runtime system for executing composed scenes
4. **Telemetry Integration:** Connect to telemetry service for performance tracking
5. **Asset Management:** Implement upload/download functionality for .riv files
6. **Version Control:** Add versioning support for libraries and components
7. **Testing:** Add comprehensive unit and integration tests
