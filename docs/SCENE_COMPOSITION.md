# Scene Composition System

## Overview

The Scene Composition system enables orchestration of multiple Rive animations into cohesive, synchronized experiences. It provides a declarative JSON format for defining complex multi-animation scenes with timeline-based sequencing, state machine coordination, and event-driven interactions.

## Architecture

The scene composition system consists of several key components:

### 1. Scene Specification Format

A JSON-based declarative format that defines:
- **Components**: References to Rive animations with layout and positioning
- **Timeline**: Keyframe-based animation sequencing across components
- **State Machine**: Discrete states and transitions for scene orchestration
- **Event Connections**: Communication channels between components
- **Inputs/Outputs**: Scene-level parameters and events

### 2. Core Systems

#### Scene Graph (`/packages/scene-composer/src/core/scene-graph.ts`)
- Hierarchical component structure management
- Transform propagation (position, rotation, scale, opacity)
- Z-index rendering order
- Spatial queries and hit testing
- Dirty flag optimization for transform updates

#### Timeline Management (`/packages/scene-composer/src/core/timeline.ts`)
- Keyframe interpolation with easing functions
- Multi-track synchronization
- Playback control (play, pause, stop, seek)
- Loop support
- Trigger events at specific times

#### Event Router (`/packages/scene-composer/src/core/event-router.ts`)
- Component-to-component event routing
- Delayed event dispatch
- Event transformation
- Wildcard event subscriptions
- Action execution (trigger, setInput, setState)

#### State Machine (`/packages/scene-composer/src/core/event-router.ts`)
- Discrete scene states with component configurations
- State transitions with duration and easing
- Transition animations
- State validation
- Callback notifications

### 3. Scene Runtime

The `SceneRuntime` class (`/packages/scene-composer/src/runtime/scene-runtime.ts`) coordinates all systems:

```typescript
const runtime = new SceneRuntime({
  spec: sceneComposition,
  canvas: canvasElement,
  autoPlay: true,
  inputs: { userName: 'Alice' },
  onEvent: (name, payload) => console.log(name, payload),
  onStateChange: (from, to) => console.log(`${from} -> ${to}`),
  onError: (error) => console.error(error),
});

await runtime.initialize();
```

### 4. Code Generation

The system generates framework-specific runtime code:
- **React**: Hooks-based component with useEffect lifecycle
- **Vue**: Composition API with reactive state
- **Stencil**: Web component with decorators
- **Vanilla**: Pure JavaScript/TypeScript runtime

## Scene Composition Format

### Basic Structure

```json
{
  "id": "scene-identifier",
  "name": "Human Readable Name",
  "description": "Scene description",
  "version": "1.0.0",
  "viewport": {
    "width": 1920,
    "height": 1080,
    "unit": "px"
  },
  "components": [...],
  "timeline": {...},
  "states": [...],
  "transitions": [...],
  "eventConnections": [...],
  "inputs": [...],
  "events": [...]
}
```

### Components

Define the Rive animations included in the scene:

```json
{
  "components": [
    {
      "id": "unique-comp-id",
      "name": "componentName",
      "componentId": "rive-component-id",
      "libraryId": "rive-library-id",
      "artboardName": "MainArtboard",
      "stateMachineName": "Controller",
      "transform": {
        "position": { "x": 100, "y": 200, "z": 0 },
        "scale": { "x": 1.0, "y": 1.0 },
        "rotation": 0,
        "opacity": 1.0
      },
      "zIndex": 10,
      "visible": true,
      "interactive": true
    }
  ]
}
```

### Timeline Orchestration

Coordinate animations over time:

```json
{
  "timeline": {
    "duration": 5000,
    "loop": false,
    "playbackRate": 1.0,
    "tracks": [
      {
        "componentName": "logo",
        "keyframes": [
          {
            "time": 0,
            "property": "transform.opacity",
            "value": 0,
            "easing": "ease-out"
          },
          {
            "time": 1000,
            "property": "transform.opacity",
            "value": 1,
            "easing": "ease-out"
          }
        ],
        "stateMachineInputs": [
          {
            "time": 500,
            "inputName": "isActive",
            "value": true
          }
        ],
        "triggers": [
          {
            "time": 1000,
            "eventName": "logoVisible"
          }
        ]
      }
    ]
  }
}
```

#### Supported Easing Functions

- `linear`: Constant speed
- `ease`: Default cubic easing
- `ease-in`: Slow start
- `ease-out`: Slow end
- `ease-in-out`: Slow start and end
- `cubic-bezier(x1, y1, x2, y2)`: Custom cubic bezier

#### Animatable Properties

- `transform.position.x`
- `transform.position.y`
- `transform.position.z`
- `transform.scale.x`
- `transform.scale.y`
- `transform.rotation`
- `transform.opacity`
- `visible`

### State Machine Orchestration

Define discrete states and transitions:

```json
{
  "states": [
    {
      "name": "idle",
      "description": "Waiting state",
      "componentStates": [
        {
          "componentName": "button",
          "stateMachine": "buttonController",
          "state": "default",
          "inputs": {
            "isHovered": false,
            "isPressed": false
          },
          "transform": {
            "scale": { "x": 1.0, "y": 1.0 }
          }
        }
      ]
    },
    {
      "name": "hover",
      "componentStates": [
        {
          "componentName": "button",
          "stateMachine": "buttonController",
          "state": "hover",
          "inputs": {
            "isHovered": true
          },
          "transform": {
            "scale": { "x": 1.1, "y": 1.1 }
          }
        }
      ]
    }
  ],
  "transitions": [
    {
      "from": "idle",
      "to": "hover",
      "duration": 200,
      "easing": "ease-out",
      "animations": [
        {
          "componentName": "button",
          "property": "transform.scale.x",
          "from": 1.0,
          "to": 1.1
        }
      ]
    },
    {
      "from": "*",
      "to": "idle",
      "duration": 150,
      "easing": "ease-in"
    }
  ],
  "initialState": "idle"
}
```

### Event Connections

Wire components together through events:

```json
{
  "eventConnections": [
    {
      "source": {
        "componentName": "button",
        "eventName": "clicked"
      },
      "target": {
        "componentName": "panel",
        "action": "trigger",
        "parameter": "open"
      },
      "delay": 0
    },
    {
      "source": {
        "componentName": "slider",
        "eventName": "valueChanged"
      },
      "target": {
        "componentName": "display",
        "action": "setInput",
        "parameter": "value",
        "value": null
      }
    }
  ]
}
```

#### Action Types

- **trigger**: Fire a trigger event on target component
- **setInput**: Set a state machine input value
- **setState**: Change the target component's state

### Scene Inputs

Define scene-level parameters:

```json
{
  "inputs": [
    {
      "name": "userName",
      "type": "string",
      "description": "User's display name",
      "defaultValue": "Guest",
      "validation": {
        "required": true,
        "pattern": "^[a-zA-Z0-9_]+$"
      }
    },
    {
      "name": "score",
      "type": "number",
      "description": "Current game score",
      "defaultValue": 0,
      "validation": {
        "min": 0,
        "max": 999999
      }
    }
  ]
}
```

### Scene Events

Define output events:

```json
{
  "events": [
    {
      "name": "completed",
      "description": "Scene animation completed",
      "payload": {
        "duration": "number",
        "timestamp": "string"
      }
    }
  ]
}
```

## Orchestration Strategies

### 1. Timeline-Based

Best for: Cinematic sequences, intro animations, choreographed experiences

**Characteristics:**
- Precise timing control
- Keyframe interpolation
- Parallel and sequential animations
- Loop support

**Example Use Cases:**
- Brand intro sequences
- Victory celebrations
- Tutorial animations

### 2. State Machine

Best for: Interactive UI, game states, discrete modes

**Characteristics:**
- Explicit state definitions
- Validated transitions
- State-specific component configurations
- Transition animations

**Example Use Cases:**
- Button states (idle, hover, pressed)
- Game phases (menu, playing, paused, gameover)
- Form validation states

### 3. Event-Driven

Best for: Reactive behaviors, component communication, user interactions

**Characteristics:**
- Loose coupling between components
- Delayed actions
- Event transformation
- Conditional routing

**Example Use Cases:**
- Interactive tutorials
- Multi-stage celebrations
- Notification systems

### 4. Hybrid

Combine multiple strategies for complex scenarios:

```json
{
  "timeline": { "duration": 3000, "tracks": [...] },
  "states": [...],
  "transitions": [...],
  "eventConnections": [...]
}
```

## Code Generation

Generate framework-specific code:

```typescript
import { generateRuntimeCode } from '@astralismotion/scene-composer';

const generated = generateRuntimeCode(sceneSpec, {
  framework: 'react',
  typescript: true,
  includeTypes: true,
});

// generated.code contains the React component
// generated.imports contains import statements
// generated.types contains TypeScript definitions
```

### React Example

```tsx
import { SceneRuntime } from '@astralismotion/scene-composer';
import sceneSpec from './my-scene.json';

export const MyScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const runtime = new SceneRuntime({
      spec: sceneSpec,
      canvas: canvasRef.current,
      autoPlay: true,
    });

    runtimeRef.current = runtime;
    runtime.initialize();

    return () => runtime.dispose();
  }, []);

  return <canvas ref={canvasRef} width={1920} height={1080} />;
};
```

## MCP Server Tool

Use the `compose_scene` tool:

```typescript
await composeSceneEnhanced({
  id: 'my-scene',
  name: 'My Scene',
  version: '1.0.0',
  viewport: { width: 1920, height: 1080 },
  components: [
    {
      name: 'logo',
      componentId: 'brand-logo',
      position: { x: 960, y: 540 },
    },
  ],
  timeline: {
    duration: 2000,
    tracks: [
      {
        componentName: 'logo',
        keyframes: [
          { time: 0, property: 'transform.opacity', value: 0 },
          { time: 1000, property: 'transform.opacity', value: 1 },
        ],
      },
    ],
  },
  generate: {
    frameworks: ['react', 'vue'],
    typescript: true,
    outputPath: './generated',
  },
  export: true,
});
```

## Validation

The system validates:
- Required fields
- Component references
- Timeline timing constraints
- State machine integrity
- Event connection validity
- Input constraints

```typescript
import { validateScene } from '@astralismotion/scene-composer';

const result = validateScene(sceneSpec);
if (!result.valid) {
  result.errors.forEach((error) => {
    console.error(`${error.path}: ${error.message}`);
  });
}
```

## Performance Considerations

### Optimization Hints

```json
{
  "performance": {
    "preload": ["component1", "component2"],
    "lazyLoad": ["component3"],
    "priority": "high"
  }
}
```

### Best Practices

1. **Minimize keyframes**: Use easing for smooth animations
2. **Batch updates**: Group state changes
3. **Limit concurrent animations**: Stagger for performance
4. **Use appropriate z-index**: Reduce overdraw
5. **Enable dirty flag optimization**: Avoid unnecessary recalculations

## Examples

See `/docs/examples/scene-composition-examples.json` for complete examples:

1. **Simple Timeline Scene**: Basic sequential animations
2. **Event-Driven Scene**: Component communication
3. **State Machine Scene**: Interactive state management
4. **Hybrid Orchestration**: Combined strategies

## API Reference

### SceneRuntime

```typescript
class SceneRuntime {
  constructor(config: SceneRuntimeConfig);
  async initialize(): Promise<void>;

  // Playback control
  play(): void;
  pause(): void;
  stop(): void;
  seek(time: number): void;

  // State management
  getCurrentState(): string | null;
  async transitionTo(state: string): Promise<boolean>;
  canTransitionTo(state: string): boolean;
  getAvailableTransitions(): string[];

  // Input management
  setInput(name: string, value: any): void;
  setInputs(inputs: Record<string, any>): void;

  // Event handling
  on(eventName: string, callback: (data: any) => void): () => void;
  emit(eventName: string, payload?: any): void;

  // Lifecycle
  dispose(): void;
}
```

### SceneGraph

```typescript
class SceneGraph {
  getNode(name: string): SceneNode | undefined;
  getAllNodes(): SceneNode[];
  getRenderOrder(): SceneNode[];
  updateNodeTransform(name: string, transform: Partial<Transform>): boolean;
  setNodeVisibility(name: string, visible: boolean): boolean;
  hitTest(x: number, y: number): SceneNode | null;
}
```

### TimelinePlayer

```typescript
class TimelinePlayer {
  play(): void;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  on(eventName: string, callback: (data: any) => void): void;
  getState(): { currentTime, duration, isPlaying, progress };
}
```

## File Locations

- **Types**: `/packages/scene-composer/src/types/scene-spec.ts`
- **Scene Graph**: `/packages/scene-composer/src/core/scene-graph.ts`
- **Timeline**: `/packages/scene-composer/src/core/timeline.ts`
- **Event Router**: `/packages/scene-composer/src/core/event-router.ts`
- **Runtime**: `/packages/scene-composer/src/runtime/scene-runtime.ts`
- **Validation**: `/packages/scene-composer/src/validation/scene-validator.ts`
- **Code Gen**: `/packages/scene-composer/src/codegen/runtime-generator.ts`
- **MCP Tool**: `/packages/mcp-server/src/tools/composeSceneEnhanced.ts`
- **Examples**: `/docs/examples/scene-composition-examples.json`
