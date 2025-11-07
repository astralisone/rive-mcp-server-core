# Framework Wrapper Generator - Quick Start Guide

## What Is This?

A code generator that transforms Rive animation definitions into production-ready React, Vue, and Stencil components with full TypeScript support.

## 5-Minute Quick Start

### Step 1: Input Your RuntimeSurface

```typescript
const surface: RuntimeSurface = {
  componentId: "slot-machine",
  stateMachines: [{
    name: "SpinSM",
    inputs: [
      { name: "isSpinning", type: "bool", defaultValue: false },
      { name: "winAmount", type: "number", defaultValue: 0 }
    ],
    events: [
      { name: "WinComplete", description: "Win animation finished" }
    ]
  }]
};
```

### Step 2: Generate Components

```typescript
import { generateWrapper } from './packages/mcp-server/src/tools/generateWrapper';

// Generate React component
const result = await generateWrapper({
  surface,
  framework: "react",
  riveSrc: "/rive/slot-machine.riv"
});

// Or generate all frameworks at once
const results = await generateWrapper({
  surface,
  framework: "all",
  riveSrc: "/rive/slot-machine.riv"
});
```

### Step 3: Use Generated Component

**React:**
```tsx
import { SlotMachine } from '@/libs/rive-components/src/SlotMachine';

function App() {
  const [spinning, setSpinning] = useState(false);

  return (
    <SlotMachine
      isSpinning={spinning}
      winAmount={100}
      onWinComplete={(data) => console.log('Win!', data)}
    />
  );
}
```

**Vue:**
```vue
<template>
  <SlotMachine
    :is-spinning="spinning"
    :win-amount="100"
    @win-complete="handleWin"
  />
</template>

<script setup>
import { ref } from 'vue';
import SlotMachine from '@/libs/rive-components/src/SlotMachine.vue';

const spinning = ref(false);
const handleWin = (data) => console.log('Win!', data);
</script>
```

**Stencil (Web Component):**
```html
<slot-machine id="slot"></slot-machine>

<script>
  const slot = document.getElementById('slot');
  slot.isSpinning = true;
  slot.winAmount = 100;
  slot.addEventListener('winComplete', (e) => {
    console.log('Win!', e.detail);
  });
</script>
```

## What You Get

### Automatic Type Safety

Every Rive input becomes a typed prop:

```typescript
// Rive input: { name: "count", type: "number" }
// Generated prop: count: number

// Rive input: { name: "isActive", type: "bool" }
// Generated prop: isActive: boolean
```

### Automatic Event Handlers

Every Rive event becomes a callback/emitter:

```typescript
// Rive event: { name: "AnimationComplete" }

// React: onAnimationComplete?: (payload: any) => void
// Vue: @animation-complete
// Stencil: EventEmitter<any>
```

### Production-Ready Code

- Full TypeScript support
- JSDoc documentation
- Proper lifecycle handling
- Framework best practices
- Responsive canvas sizing

## File Locations

### Generator System
```
/packages/mcp-server/src/generators/
├── index.ts                    # Main orchestrator
├── types.ts                    # Type definitions
├── utils.ts                    # Utilities
└── templates/
    ├── react.template.ts       # React generator
    ├── vue.template.ts         # Vue generator
    └── stencil.template.ts     # Stencil generator
```

### Generated Components
```
/libs/rive-components/src/
├── ComponentName.tsx           # React
├── ComponentName.vue           # Vue
├── component-name.tsx          # Stencil
└── component-name.css          # Stencil styles
```

### Documentation
```
/docs/
├── GENERATOR_QUICKSTART.md     # This file
├── GENERATOR_SUMMARY.md        # Overview
├── GENERATOR_ARCHITECTURE.md   # Detailed architecture
└── GENERATOR_EXAMPLES.md       # Full examples
```

## Common Patterns

### Generate During Build

Add to your build process:

```typescript
// scripts/generate-components.ts
import { generateWrapper } from './packages/mcp-server/src/tools/generateWrapper';
import { surfaces } from './rive-definitions';

for (const surface of surfaces) {
  await generateWrapper({
    surface,
    framework: "all",
    riveSrc: `/rive/${surface.componentId}.riv`
  });
}
```

### Via MCP Server

```typescript
// packages/mcp-server/src/index.ts
server.tool("generate_wrapper", async (params) => {
  return generateWrapper(params);
});

// Client usage:
const result = await mcp.callTool("generate_wrapper", {
  surface: myRuntimeSurface,
  framework: "react",
  riveSrc: "/rive/animation.riv"
});
```

### Direct API

```typescript
import { generateReact } from './packages/mcp-server/src/generators/templates/react.template';

const component = await generateReact({
  surface: myRuntimeSurface,
  framework: "react",
  componentName: "MyComponent",
  riveSrc: "/rive/animation.riv"
});

console.log(component.code);
```

## Customization

### Override Component Name

```typescript
await generateWrapper({
  surface,
  framework: "react",
  riveSrc: "/rive/animation.riv",
  componentName: "CustomName"  // Override auto-generated name
});
```

### Custom Output Path

```typescript
await generateWrapper({
  surface,
  framework: "react",
  riveSrc: "/rive/animation.riv",
  outputPath: "/custom/path/Component.tsx"
});
```

### Generate Without Writing

```typescript
const result = await generateWrapper({
  surface,
  framework: "react",
  riveSrc: "/rive/animation.riv",
  writeToFile: false  // Just return the code
});

console.log(result.components[0].code);
```

## Naming Conventions Cheat Sheet

| Input | Component Name | React File | Vue File | Stencil Files |
|-------|----------------|------------|----------|---------------|
| `slot-machine` | `SlotMachine` | `SlotMachine.tsx` | `SlotMachine.vue` | `slot-machine.tsx`<br>`slot-machine.css` |
| `my_component` | `MyComponent` | `MyComponent.tsx` | `MyComponent.vue` | `my-component.tsx`<br>`my-component.css` |
| `AnimatedButton` | `AnimatedButton` | `AnimatedButton.tsx` | `AnimatedButton.vue` | `animated-button.tsx`<br>`animated-button.css` |

## RuntimeSurface Schema Reference

```typescript
interface RuntimeSurface {
  // Required: Unique identifier for the component
  componentId: string;

  // Required: At least one state machine with inputs
  stateMachines: {
    name: string;  // State machine name in Rive file

    inputs: {
      name: string;                           // Input name
      type: "bool" | "number" | "string";    // Input type
      defaultValue?: any;                     // Optional default
    }[];

    events?: {
      name: string;         // Event name
      description?: string; // Optional description
    }[];
  }[];

  // Optional fields
  dataBindings?: { ... }[];
  recommendedFrameworks?: string[];
  runtimeVersion?: string;
}
```

## Troubleshooting

### "Invalid surface: componentId is required"
Make sure your RuntimeSurface has a `componentId` field.

### "Invalid surface: at least one state machine is required"
Add at least one state machine to the `stateMachines` array.

### Generated component not updating
Check that props are being passed correctly and match the input names exactly.

### Events not firing
Verify event names match between Rive file and RuntimeSurface definition.

### TypeScript errors in generated code
Check that RuntimeSurface input types match the actual Rive file inputs.

## Dependencies Required

```bash
npm install @rive-app/canvas @rive-app/react-canvas @rive-app/vue-canvas @stencil/core
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "@rive-app/canvas": "^2.9.0",
    "@rive-app/react-canvas": "^4.5.0",
    "@rive-app/vue-canvas": "^1.0.0",
    "@stencil/core": "^4.7.0"
  }
}
```

## Next Steps

1. **Read Full Documentation**: Check `GENERATOR_ARCHITECTURE.md` for complete details
2. **See Examples**: Review `GENERATOR_EXAMPLES.md` for full code examples
3. **Extend**: Add new frameworks by following patterns in `/templates`
4. **Test**: Write tests for generated components using framework test libraries

## Support & Resources

- **Architecture**: `/docs/GENERATOR_ARCHITECTURE.md`
- **Examples**: `/docs/GENERATOR_EXAMPLES.md`
- **Summary**: `/docs/GENERATOR_SUMMARY.md`
- **API Docs**: `/packages/mcp-server/src/generators/README.md`
- **Code**: `/packages/mcp-server/src/generators/`

---

**Ready to generate?** Start with the example above and customize for your needs!
