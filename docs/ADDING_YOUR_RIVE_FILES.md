# Adding Your Own Rive Files

This guide walks you through adding your own Rive animation files to the MCP system and creating manifests for them.

## Overview

To add your Rive files, you need to:

1. Place your `.riv` files in the assets directory
2. Create a component manifest (JSON) describing the component
3. Optionally create a library manifest to group components
4. Update the manifest index
5. Validate your setup

## Step 1: Place Your Rive Files

### Local Storage (Default)

Place your `.riv` files in the assets directory:

```bash
# Default location after running init-storage
data/assets/rive/your-component-name.riv
```

### Directory Structure

```
data/
└── assets/
    └── rive/
        ├── my-button.riv
        ├── my-loader.riv
        └── my-animation.riv
```

### S3 Storage

If using S3, upload to your configured bucket:

```bash
aws s3 cp my-component.riv s3://my-bucket/assets/rive/my-component.riv
```

### Remote Storage

For CDN/remote storage, ensure files are accessible via HTTPS and update your configuration.

## Step 2: Inspect Your Rive File

Before creating a manifest, you need to know what's in your Rive file. Use Rive's editor or runtime to identify:

1. **Artboards**: The canvas/viewport for your animation
2. **State Machines**: Interactive logic controllers
3. **Inputs**: Variables that control the animation (bool, number, trigger)
4. **Events**: Signals fired during animation
5. **Data Bindings**: Dynamic data connections (optional)

### Example: Inspecting in Rive Editor

1. Open your `.riv` file in Rive Editor
2. Look at the **Animate** tab for artboards
3. Check the **State Machine** panel for:
   - State machine name
   - Inputs (boolean, number, trigger types)
   - Events (custom events you've defined)

## Step 3: Create a Component Manifest

### Manual Creation

Create a JSON file in `data/manifests/components/`:

```bash
data/manifests/components/my-component.json
```

### Manifest Template

```json
{
  "id": "my-unique-component-id",
  "name": "My Component Name",
  "version": "1.0.0",
  "description": "Brief description of what this component does",
  "category": "ui-elements",
  "tags": ["button", "interactive", "ui"],

  "asset": {
    "rivePath": "rive/my-component.riv",
    "fileSize": 45678,
    "artboards": [
      {
        "name": "MainArtboard",
        "width": 400,
        "height": 200
      }
    ]
  },

  "stateMachines": [
    {
      "name": "ButtonStateMachine",
      "inputs": [
        {
          "name": "isPressed",
          "type": "bool",
          "description": "Whether the button is currently pressed",
          "defaultValue": false
        },
        {
          "name": "progress",
          "type": "number",
          "description": "Progress value from 0 to 100",
          "defaultValue": 0
        },
        {
          "name": "onClick",
          "type": "trigger",
          "description": "Trigger to fire click animation"
        }
      ],
      "events": [
        {
          "name": "ClickComplete",
          "description": "Fired when click animation completes"
        }
      ]
    }
  ],

  "dataBindings": [
    {
      "name": "labelText",
      "type": "text",
      "description": "The text displayed on the button"
    }
  ],

  "metadata": {
    "author": "Your Name",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "library": "my-library"
  }
}
```

### Field Reference

#### Required Fields

- **id**: Unique identifier (kebab-case recommended)
- **name**: Human-readable name
- **version**: Semantic version (e.g., "1.0.0")
- **description**: What the component does
- **category**: Component category
- **asset.rivePath**: Path to .riv file relative to assets directory
- **stateMachines**: Array of state machine definitions

#### Optional Fields

- **tags**: Array of searchable tags
- **dataBindings**: Dynamic data connections
- **metadata**: Additional information
- **asset.fileSize**: File size in bytes
- **asset.artboards**: Artboard dimensions

### Input Types

1. **boolean (bool)**
   - Values: `true` or `false`
   - Use for: Toggle states, flags
   - Example: `isVisible`, `isEnabled`, `isActive`

2. **number**
   - Values: Any numeric value
   - Use for: Progress, speed, position, rotation
   - Example: `progress`, `speed`, `opacity`

3. **trigger**
   - Values: Momentary signal (no state)
   - Use for: One-time actions
   - Example: `onClick`, `onReset`, `playAnimation`

## Step 4: Use the Manifest Generator Helper

We provide a helper script to generate manifests from your Rive files:

```bash
npm run generate-manifest -- --file data/assets/rive/my-component.riv
```

This will:
1. Parse your Rive file
2. Extract state machines, inputs, and events
3. Generate a manifest template
4. Save to `data/manifests/components/`

### Generator Options

```bash
# Generate with custom ID
npm run generate-manifest -- --file my-component.riv --id my-custom-id

# Specify output location
npm run generate-manifest -- --file my-component.riv --output custom/path.json

# Interactive mode (prompts for metadata)
npm run generate-manifest -- --file my-component.riv --interactive

# Generate and add to library
npm run generate-manifest -- --file my-component.riv --library my-library
```

## Step 5: Create a Library Manifest (Optional)

Group related components into a library:

```bash
data/manifests/libraries/my-library.json
```

```json
{
  "id": "my-library",
  "name": "My Component Library",
  "version": "1.0.0",
  "description": "Collection of UI components",
  "tags": ["ui", "custom"],
  "components": [
    "my-component-1",
    "my-component-2",
    "my-component-3"
  ],
  "metadata": {
    "author": "Your Name",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## Step 6: Update the Manifest Index

### Manual Update

Edit `data/manifests/index.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-01T00:00:00Z",
  "components": [
    "my-component-id"
  ],
  "libraries": [
    "my-library"
  ]
}
```

### Automatic Update

Use the update script:

```bash
npm run update-manifest-index
```

This scans `data/manifests/` and automatically updates the index.

## Step 7: Validate Your Manifests

Run the validation tool:

```bash
npm run validate-manifests
```

This checks:
- ✅ Valid JSON syntax
- ✅ Required fields present
- ✅ Component IDs are unique
- ✅ Referenced .riv files exist
- ✅ Library component references are valid
- ✅ Input types are valid
- ✅ Event names are valid

### Fix Common Issues

**Issue: "Component ID already exists"**
```bash
# Solution: Choose a unique ID
"id": "my-library-my-component"
```

**Issue: "Asset file not found"**
```bash
# Solution: Check the rivePath is correct
"rivePath": "rive/my-component.riv"  # Relative to data/assets/
```

**Issue: "Invalid input type"**
```bash
# Solution: Use only: "bool", "number", or "trigger"
"type": "bool"  # not "boolean"
```

## Step 8: Test Your Component

### List Your Component

```typescript
// MCP Tool: listComponents
{
  "libraryId": "my-library"
}
```

### Get Component Details

```typescript
// MCP Tool: getComponentDetail
{
  "componentId": "my-component-id"
}
```

### Get Runtime Surface

```typescript
// MCP Tool: getRuntimeSurface
{
  "componentId": "my-component-id"
}
```

### Generate a Wrapper

```typescript
// MCP Tool: generateWrapper
{
  "componentId": "my-component-id",
  "framework": "react",
  "typescript": true
}
```

## Complete Example: Adding a Custom Button

### 1. Place the File

```bash
cp ~/Downloads/my-button.riv data/assets/rive/my-button.riv
```

### 2. Generate Manifest

```bash
npm run generate-manifest -- --file data/assets/rive/my-button.riv --interactive
```

### 3. Review Generated Manifest

```bash
cat data/manifests/components/my-button.json
```

### 4. Update Index

```bash
npm run update-manifest-index
```

### 5. Validate

```bash
npm run validate-manifests
```

### 6. Test

```bash
# In your MCP client
listComponents({ tags: ["button"] })
getComponentDetail({ componentId: "my-button" })
generateWrapper({ componentId: "my-button", framework: "react" })
```

## Best Practices

### Naming Conventions

- **Component IDs**: Use kebab-case: `my-component-name`
- **State Machine Names**: Use PascalCase: `ButtonStateMachine`
- **Input Names**: Use camelCase: `isPressed`, `currentValue`
- **Event Names**: Use PascalCase: `ClickComplete`, `AnimationEnd`

### Versioning

Use semantic versioning:
- **1.0.0** → Initial release
- **1.0.1** → Bug fix
- **1.1.0** → New feature (backward compatible)
- **2.0.0** → Breaking change

### Documentation

Always include:
- Clear descriptions for components
- Description for each input explaining its purpose
- Description for each event explaining when it fires
- Usage examples in metadata

### Organization

- Group related components into libraries
- Use consistent tags across components
- Use meaningful categories
- Keep file sizes reasonable (<500KB per .riv file)

## Advanced: Batch Import

To import multiple Rive files at once:

```bash
# Generate manifests for all .riv files in a directory
npm run batch-import -- --dir path/to/rive/files --library my-library
```

This will:
1. Find all `.riv` files in the directory
2. Generate manifests for each
3. Create a library grouping them
4. Update the index

## Troubleshooting

### "Cannot parse Rive file"

- Ensure your .riv file is valid and not corrupted
- Check that you're using a recent version of the Rive runtime
- Try opening the file in Rive Editor to verify it loads

### "State machine not found"

- Check that your Rive file actually contains a state machine
- Verify the state machine name matches exactly (case-sensitive)
- Ensure state machine is on the default artboard

### "Input type mismatch"

- Verify input types in Rive Editor
- Rive uses: Boolean, Number, Trigger (not String)
- Update your manifest to match

### "Validation failed"

- Run with verbose flag: `npm run validate-manifests -- --verbose`
- Check the error messages for specific issues
- Ensure all required fields are present

## Need Help?

- Check example manifests in `libs/rive-manifests/examples/`
- Review the type definitions in `libs/types/manifest.d.ts`
- See the full manifest schema documentation
- Open an issue if you encounter problems

## Next Steps

Once your components are added:

1. **Generate Wrappers**: Create framework-specific components
2. **Compose Scenes**: Combine multiple components into scenes
3. **Set Up QA Rules**: Add validation rules in `libs/motion-qa/`
4. **Enable Telemetry**: Track usage and performance
5. **Build Your App**: Integrate generated wrappers into your application
