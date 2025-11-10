# Scene Composition Quick Reference

## Basic Scene Structure

```json
{
  "id": "scene-id",
  "name": "Scene Name",
  "version": "1.0.0",
  "viewport": { "width": 1920, "height": 1080 },
  "components": [...],
  "timeline": {...},      // Optional
  "states": [...],        // Optional
  "eventConnections": [...] // Optional
}
```

## Component Definition

```json
{
  "id": "comp-id",
  "name": "componentName",
  "componentId": "rive-component-id",
  "transform": {
    "position": { "x": 100, "y": 200 },
    "scale": { "x": 1, "y": 1 },
    "rotation": 0,
    "opacity": 1
  },
  "zIndex": 10
}
```

## Timeline Keyframe

```json
{
  "time": 1000,
  "property": "transform.opacity",
  "value": 1,
  "easing": "ease-out"
}
```

## Animatable Properties

- `transform.position.x`
- `transform.position.y`
- `transform.scale.x`
- `transform.scale.y`
- `transform.rotation`
- `transform.opacity`
- `visible`

## Easing Functions

- `linear`
- `ease`
- `ease-in`
- `ease-out`
- `ease-in-out`
- `cubic-bezier(x1, y1, x2, y2)`

## State Definition

```json
{
  "name": "stateName",
  "componentStates": [
    {
      "componentName": "button",
      "stateMachine": "controller",
      "state": "hover",
      "inputs": { "isHovered": true }
    }
  ]
}
```

## Transition

```json
{
  "from": "idle",
  "to": "active",
  "duration": 300,
  "easing": "ease-out"
}
```

## Event Connection

```json
{
  "source": {
    "componentName": "button",
    "eventName": "clicked"
  },
  "target": {
    "componentName": "panel",
    "action": "trigger",
    "parameter": "open"
  }
}
```

## Runtime Usage

```typescript
import { SceneRuntime } from '@astralismotion/scene-composer';

const runtime = new SceneRuntime({
  spec: sceneSpec,
  canvas: '#canvas',
  autoPlay: true,
  onEvent: (name, payload) => {},
  onStateChange: (from, to) => {},
});

await runtime.initialize();
```

## Runtime API

```typescript
// Playback
runtime.play();
runtime.pause();
runtime.stop();
runtime.seek(1000);

// States
runtime.getCurrentState();
runtime.transitionTo('newState');
runtime.canTransitionTo('newState');

// Inputs
runtime.setInput('name', value);
runtime.setInputs({ name: value });

// Events
runtime.on('eventName', (data) => {});
runtime.emit('eventName', payload);

// Cleanup
runtime.dispose();
```

## Validation

```typescript
import { validateScene } from '@astralismotion/scene-composer';

const result = validateScene(spec);
// result.valid: boolean
// result.errors: Array<{path, message, severity}>
```

## Code Generation

```typescript
import { generateRuntimeCode } from '@astralismotion/scene-composer';

const code = generateRuntimeCode(spec, {
  framework: 'react', // 'react' | 'vue' | 'stencil' | 'vanilla'
  typescript: true,
  includeTypes: true,
});

// code.code: string
// code.imports: string[]
// code.types: string
// code.filename: string
```

## MCP Tool

```typescript
await composeSceneEnhanced({
  id: 'scene-id',
  name: 'Scene Name',
  viewport: { width: 1920, height: 1080 },
  components: [{
    name: 'logo',
    componentId: 'brand-logo',
    position: { x: 960, y: 540 },
  }],
  timeline: { /* ... */ },
  generate: {
    frameworks: ['react', 'vue'],
    typescript: true,
    outputPath: './generated',
  },
  export: true,
});
```

## Orchestration Patterns

### Timeline Pattern
```json
{
  "timeline": {
    "duration": 3000,
    "loop": false,
    "tracks": [{ "componentName": "...", "keyframes": [...] }]
  }
}
```

### State Machine Pattern
```json
{
  "states": [...],
  "transitions": [...],
  "initialState": "idle"
}
```

### Event-Driven Pattern
```json
{
  "eventConnections": [
    {
      "source": { "componentName": "...", "eventName": "..." },
      "target": { "componentName": "...", "action": "trigger" }
    }
  ]
}
```

## File Locations

- Types: `/packages/scene-composer/src/types/scene-spec.ts`
- Scene Graph: `/packages/scene-composer/src/core/scene-graph.ts`
- Timeline: `/packages/scene-composer/src/core/timeline.ts`
- Events: `/packages/scene-composer/src/core/event-router.ts`
- Runtime: `/packages/scene-composer/src/runtime/scene-runtime.ts`
- Validation: `/packages/scene-composer/src/validation/scene-validator.ts`
- Codegen: `/packages/scene-composer/src/codegen/runtime-generator.ts`

## Common Patterns

### Fade In Animation
```json
{
  "keyframes": [
    { "time": 0, "property": "transform.opacity", "value": 0 },
    { "time": 500, "property": "transform.opacity", "value": 1, "easing": "ease-out" }
  ]
}
```

### Scale Up
```json
{
  "keyframes": [
    { "time": 0, "property": "transform.scale.x", "value": 0.5 },
    { "time": 0, "property": "transform.scale.y", "value": 0.5 },
    { "time": 800, "property": "transform.scale.x", "value": 1 },
    { "time": 800, "property": "transform.scale.y", "value": 1 }
  ]
}
```

### Slide In
```json
{
  "keyframes": [
    { "time": 0, "property": "transform.position.x", "value": -200 },
    { "time": 600, "property": "transform.position.x", "value": 0, "easing": "ease-out" }
  ]
}
```

### Chained Events
```json
{
  "eventConnections": [
    {
      "source": { "componentName": "first", "eventName": "complete" },
      "target": { "componentName": "second", "action": "trigger", "parameter": "start" },
      "delay": 200
    }
  ]
}
```

## Best Practices

1. Use meaningful component names
2. Start z-index at 10 with increments of 5
3. Keep timeline durations under 10 seconds
4. Validate scenes before production use
5. Use easing for natural motion
6. Group related components with similar z-index
7. Limit concurrent animations for performance
8. Use state machines for interactive elements
9. Use timelines for choreographed sequences
10. Use events for reactive behaviors
