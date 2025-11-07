# Rive Framework Wrapper Generator

Automatic generation of type-safe wrapper components for Rive animations across multiple frontend frameworks.

## Overview

The generator system transforms Rive `RuntimeSurface` definitions into production-ready framework components with full TypeScript support, event handling, and data binding.

## Supported Frameworks

- **React** - Using `@rive-app/react-canvas`
- **Vue 3** - Using `@rive-app/vue-canvas` with Composition API
- **Stencil** - Web components using `@rive-app/canvas`

## Architecture

### Core Components

```
generators/
├── index.ts              # Generator orchestrator and registry
├── types.ts              # TypeScript type definitions
├── utils.ts              # Shared utilities (naming, type conversion)
└── templates/
    ├── react.template.ts    # React component generator
    ├── vue.template.ts      # Vue SFC generator
    └── stencil.template.ts  # Stencil web component generator
```

### Generator Flow

```
RuntimeSurface → Generator Context → Template → Generated Code → File System
```

## Usage

### Basic Generation

```typescript
import { generateWrapper } from './generators';

const result = await generateWrapper({
  surface: {
    componentId: "my-animation",
    stateMachines: [{
      name: "MainSM",
      inputs: [
        { name: "isActive", type: "bool", defaultValue: false },
        { name: "progress", type: "number", defaultValue: 0 }
      ],
      events: [
        { name: "Complete", description: "Animation completed" }
      ]
    }]
  },
  framework: "react",
  componentName: "MyAnimation",
  riveSrc: "/animations/my-animation.riv",
  outputPath: "/libs/rive-components/src/MyAnimation.tsx",
  writeToFile: true
});
```

### Generate for All Frameworks

```typescript
const results = await generateWrapper({
  surface: runtimeSurface,
  framework: "all",  // Generates React, Vue, and Stencil
  riveSrc: "/animations/my-animation.riv",
  writeToFile: true
});
```

## RuntimeSurface Input Schema

```typescript
interface RuntimeSurface {
  componentId: string;
  stateMachines: {
    name: string;
    inputs: {
      name: string;
      type: "bool" | "number" | "string";
      defaultValue?: any;
    }[];
    events?: {
      name: string;
      description?: string;
    }[];
  }[];
  dataBindings?: {
    name: string;
    type: "array" | "object" | "image" | "text";
    itemSchema?: Record<string, string>;
  }[];
  recommendedFrameworks?: string[];
  runtimeVersion?: string;
}
```

## Generated Component Features

### Type Safety

All inputs are converted to properly typed props:

```typescript
// Runtime Surface Input
{ name: "count", type: "number", defaultValue: 0 }

// Generated React Prop
count: number;  // with JSDoc: @default 0
```

### Event Handling

Events are converted to framework-appropriate handlers:

```typescript
// Runtime Surface Event
{ name: "AnimationComplete", description: "Fired when animation ends" }

// React: Callback prop
onAnimationComplete?: (payload: any) => void;

// Vue: Emitted event
emit("animation-complete", payload);

// Stencil: Event emitter
@Event() animationComplete: EventEmitter<any>;
```

### Input Reactivity

All frameworks include automatic input synchronization:

- **React**: `useEffect` hooks for each input
- **Vue**: `watch` for each prop
- **Stencil**: `@Watch` decorators

## Utility Functions

### Naming Conventions

```typescript
import { toPascalCase, toKebabCase, toCamelCase } from './utils';

toPascalCase("my-component");  // "MyComponent"
toKebabCase("MyComponent");     // "my-component"
toCamelCase("my-component");    // "myComponent"
```

### Type Conversion

```typescript
import { getTypeScriptType, getDefaultValue } from './utils';

getTypeScriptType("bool");      // "boolean"
getTypeScriptType("number");    // "number"
getDefaultValue("bool");        // "false"
```

### Surface Analysis

```typescript
import { getAllInputs, getAllEvents } from './utils';

const inputs = getAllInputs(surface);   // Deduped inputs from all state machines
const events = getAllEvents(surface);   // Deduped events from all state machines
```

## Extending the Generator

To add a new framework:

### 1. Create Template File

```typescript
// templates/newframework.template.ts
import { GeneratorContext, GeneratedComponent } from "../types";

export function generateNewFramework(context: GeneratorContext): string {
  // Generate component code
  return componentCode;
}

export async function generateNewFramework(
  context: GeneratorContext
): Promise<GeneratedComponent> {
  const code = generateNewFrameworkComponent(context);
  return {
    code,
    filePath: context.outputPath || generatePath(context),
    framework: "newframework",
    componentName: context.componentName,
  };
}
```

### 2. Register in Index

```typescript
// index.ts
import { generateNewFramework } from "./templates/newframework.template";

const generators: Record<TargetFramework, FrameworkGenerator> = {
  // ... existing generators
  newframework: {
    framework: "newframework",
    fileExtension: ".ext",
    generate: generateNewFramework,
  },
};
```

### 3. Update Types

```typescript
// types.ts
export type TargetFramework = "react" | "vue" | "stencil" | "newframework";
```

## Best Practices

### Component Naming

- Use PascalCase for component names
- Use kebab-case for file names and custom element tags
- Use camelCase for prop/input names

### Event Naming

- Event names should be descriptive and action-based
- Use PascalCase in RuntimeSurface (e.g., "AnimationComplete")
- Generators will convert to framework conventions

### State Machine Design

- Keep input names consistent across state machines
- Provide default values for all inputs
- Document events with descriptions
- Use semantic event names

### File Organization

```
libs/rive-components/src/
├── MyComponent.tsx        # React
├── MyComponent.vue        # Vue
├── my-component.tsx       # Stencil TypeScript
└── my-component.css       # Stencil styles
```

## Testing Generated Components

### React Example

```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders and handles props', () => {
  const handleEvent = jest.fn();
  render(
    <MyComponent
      isActive={true}
      progress={50}
      onComplete={handleEvent}
    />
  );
  // Test assertions
});
```

### Vue Example

```typescript
import { mount } from '@vue/test-utils';
import MyComponent from './MyComponent.vue';

test('renders and handles props', () => {
  const wrapper = mount(MyComponent, {
    props: {
      isActive: true,
      progress: 50
    }
  });
  // Test assertions
});
```

## Troubleshooting

### Common Issues

**Missing Inputs in Generated Component**

- Verify RuntimeSurface has correct state machine definition
- Check input names are valid identifiers

**Events Not Firing**

- Ensure event names match between Rive file and RuntimeSurface
- Check event listener setup in componentDidLoad/onMounted

**Type Errors**

- Verify RuntimeSurface types match actual Rive file inputs
- Check framework-specific prop types

## Performance Considerations

- Generated components use efficient reactivity patterns
- Input updates are batched where possible
- Event listeners are properly cleaned up
- Canvas rendering is optimized per framework

## License

Part of the Astralis Motion Rive MCP Server
