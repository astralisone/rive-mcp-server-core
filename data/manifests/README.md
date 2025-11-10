# Rive Manifests Directory

This directory contains runtime data for the Rive MCP Server. The directory structure has been cleaned of example/mock data and is ready for your own Rive components and libraries.

## Directory Structure

```
manifests/
├── index.json              # Master index of all libraries and components
├── components/             # Component manifests (one directory per component)
│   └── {componentId}/
│       └── manifest.json
└── libraries/              # Library manifests (one directory per library)
    └── {libraryId}/
        └── manifest.json
```

## Adding Your Own Data

### Option 1: Use the `import_rive_file` MCP Tool

The easiest way to add Rive components is using the MCP tool:

```javascript
// This will automatically:
// - Extract metadata from the .riv file
// - Create the component manifest
// - Update the index.json
importRiveFile({
  filePath: "/path/to/your/animation.riv",
  componentName: "My Animation",  // optional
  componentId: "my-animation",    // optional
  libraryId: "my-library"         // optional
})
```

### Option 2: Manual Creation

#### 1. Create a Library Manifest

Create a directory and manifest file:
```
libraries/my-library/manifest.json
```

With content:
```json
{
  "id": "my-library",
  "name": "My Animation Library",
  "description": "Custom Rive animations for my project",
  "version": "1.0.0",
  "tags": ["custom", "project"],
  "author": "Your Name",
  "license": "MIT",
  "createdAt": "2025-01-22T10:00:00Z",
  "updatedAt": "2025-01-22T10:00:00Z"
}
```

#### 2. Create a Component Manifest

Create a directory and manifest file:
```
components/my-component/manifest.json
```

With content:
```json
{
  "id": "my-component",
  "name": "My Animation Component",
  "description": "A custom Rive animation",
  "version": "1.0.0",
  "libraryId": "my-library",
  "riveFile": "/rive/my-component.riv",
  "tags": ["animation"],
  "category": "custom",
  "author": "Your Name",
  "createdAt": "2025-01-22T10:00:00Z",
  "updatedAt": "2025-01-22T10:00:00Z",
  "stateMachines": [
    {
      "name": "MainStateMachine",
      "description": "Main state machine",
      "inputs": [
        {
          "name": "isPlaying",
          "type": "bool",
          "defaultValue": false,
          "description": "Controls playback"
        }
      ],
      "events": []
    }
  ],
  "artboards": ["Main"],
  "recommendedFrameworks": ["react", "vue"],
  "runtimeVersion": "web-v2"
}
```

#### 3. Update index.json

The MCP server will automatically update `index.json` when you use the storage API with the `updateIndex: true` option. If you're manually creating files, you can also manually update the index:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-22T10:15:00Z",
  "libraries": {
    "my-library": {
      "id": "my-library",
      "name": "My Animation Library",
      ...
    }
  },
  "components": {
    "my-component": {
      "id": "my-component",
      "name": "My Animation Component",
      ...
    }
  }
}
```

## Current State

This directory has been cleaned and contains:
- Empty `index.json` with no libraries or components
- Empty `components/` directory (preserved with .gitkeep)
- Empty `libraries/` directory (preserved with .gitkeep)

You can now add your own Rive assets and manifests using either method above.

## Asset Files

Place your actual `.riv` files in the `data/assets/rive/` directory, referenced by the `riveFile` path in your component manifests.
