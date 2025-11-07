# Framework Wrapper Generator Examples

This document demonstrates the generated wrapper components for each supported framework.

## Example RuntimeSurface Input

```typescript
const exampleSurface: RuntimeSurface = {
  componentId: "slot-spin",
  stateMachines: [
    {
      name: "SpinSM",
      inputs: [
        { name: "isSpinning", type: "bool", defaultValue: false },
        { name: "winAmount", type: "number", defaultValue: 0 }
      ],
      events: [
        { name: "WinSequenceComplete", description: "Fired when win animation completes" }
      ]
    }
  ],
  runtimeVersion: "2.9.0"
};
```

## Generated React Component

**File:** `/libs/rive-components/src/SlotSpin.tsx`

```tsx
import React, { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

type SlotSpinProps = {
  /**
   * State machine input: isSpinning
   * @default false
   */
  isSpinning: boolean;
  /**
   * State machine input: winAmount
   * @default 0
   */
  winAmount: number;
  /**
   * Event handler for: WinSequenceComplete
   * Fired when win animation completes
   */
  onWinSequenceComplete?: (payload: any) => void;
};

/**
 * SlotSpin - A Rive-powered component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * @component
 */
export const SlotSpin: React.FC<SlotSpinProps> = ({
  isSpinning,
  winAmount,
  onWinSequenceComplete
}) => {
  const { rive, RiveComponent } = useRive({
    src: "/rive/slot-spin.riv",
    stateMachines: ["SpinSM"],
    autoplay: true
  });

  const isSpinningInput = useStateMachineInput(rive, "SpinSM", "isSpinning");
  const winAmountInput = useStateMachineInput(rive, "SpinSM", "winAmount");

  useEffect(() => {
    if (isSpinningInput) isSpinningInput.value = isSpinning;
  }, [isSpinning, isSpinningInput]);

  useEffect(() => {
    if (winAmountInput) winAmountInput.value = winAmount;
  }, [winAmount, winAmountInput]);

  useEffect(() => {
    if (!rive || !onWinSequenceComplete) return;
    const handler = (riveEvent: any) => {
      if (riveEvent.data?.name === "WinSequenceComplete") {
        onWinSequenceComplete(riveEvent.data);
      }
    };
    rive.on("event", handler);
    return () => {
      rive.off("event", handler);
    };
  }, [rive, onWinSequenceComplete]);

  return (
    <div className="slotspin-wrapper">
      <RiveComponent />
    </div>
  );
};
```

### React Usage Example

```tsx
import { SlotSpin } from './SlotSpin';

function App() {
  const [spinning, setSpinning] = useState(false);
  const [amount, setAmount] = useState(0);

  const handleWinComplete = (payload: any) => {
    console.log('Win complete!', payload);
    setSpinning(false);
  };

  return (
    <SlotSpin
      isSpinning={spinning}
      winAmount={amount}
      onWinSequenceComplete={handleWinComplete}
    />
  );
}
```

---

## Generated Vue Component

**File:** `/libs/rive-components/src/SlotSpin.vue`

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useRive } from "@rive-app/vue-canvas";

interface Props {
  /**
   * State machine input: isSpinning
   * @default false
   */
  isSpinning: boolean;
  /**
   * State machine input: winAmount
   * @default 0
   */
  winAmount: number;
}

const props = defineProps<Props>();

interface Emits {
  /**
   * Emitted when: WinSequenceComplete
   * Fired when win animation completes
   */
  (event: "win-sequence-complete", payload: any): void;
}

const emit = defineEmits<Emits>();

/**
 * SlotSpin - A Rive-powered Vue component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 */

const canvasRef = ref<HTMLCanvasElement | null>(null);

const { rive: riveInstance, setCanvasRef } = useRive({
  src: "/rive/slot-spin.riv",
  stateMachines: "SpinSM",
  autoplay: true,
});

// Get state machine inputs
const stateMachineInputs = computed(() => {
  if (!riveInstance.value) return {};

  const stateMachine = riveInstance.value.stateMachineInputs("SpinSM");
  return {
    isSpinning: stateMachine?.find((input: any) => input.name === "isSpinning"),
    winAmount: stateMachine?.find((input: any) => input.name === "winAmount")
  };
});

// Watch for prop changes and update inputs

  watch(() => props.isSpinning, (newValue) => {
    if (stateMachineInputs.value.isSpinning) {
      stateMachineInputs.value.isSpinning.value = newValue;
    }
  });

  watch(() => props.winAmount, (newValue) => {
    if (stateMachineInputs.value.winAmount) {
      stateMachineInputs.value.winAmount.value = newValue;
    }
  });

  // Event listeners
  onMounted(() => {
    if (!riveInstance.value) return;

    const handleRiveEvent = (event: any) => {
      if (event.data?.name === "WinSequenceComplete") {
        emit("win-sequence-complete", event.data);
      }
    };

    riveInstance.value.on("event", handleRiveEvent);

    onUnmounted(() => {
      riveInstance.value?.off("event", handleRiveEvent);
    });
  });

onMounted(() => {
  if (canvasRef.value) {
    setCanvasRef(canvasRef.value);
  }
});
</script>

<template>
  <div class="slot-spin-wrapper">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.slot-spin-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.slot-spin-wrapper canvas {
  width: 100%;
  height: 100%;
}
</style>
```

### Vue Usage Example

```vue
<template>
  <SlotSpin
    :is-spinning="spinning"
    :win-amount="amount"
    @win-sequence-complete="handleWinComplete"
  />
</template>

<script setup>
import { ref } from 'vue';
import SlotSpin from './SlotSpin.vue';

const spinning = ref(false);
const amount = ref(0);

const handleWinComplete = (payload) => {
  console.log('Win complete!', payload);
  spinning.value = false;
};
</script>
```

---

## Generated Stencil Web Component

**File:** `/libs/rive-components/src/slot-spin.tsx`

```tsx
import { Component, Prop, Element, Watch, Event, EventEmitter, h } from "@stencil/core";
import { Rive } from "@rive-app/canvas";

/**
 * SlotSpin - A Rive-powered web component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * @slot default - Default slot content
 */
@Component({
  tag: "slot-spin",
  styleUrl: "slot-spin.css",
  shadow: true,
})
export class SlotSpin {
  @Element() el!: HTMLElement;

  private canvasElement?: HTMLCanvasElement;
  private rive?: Rive;
  private stateMachineInputs: any = {};

  /**
   * State machine input: isSpinning
   */
  @Prop() isSpinning!: boolean;

  /**
   * State machine input: winAmount
   */
  @Prop() winAmount!: number;

  /**
   * Emitted when: WinSequenceComplete - Fired when win animation completes
   */
  @Event() winSequenceComplete: EventEmitter<any>;

  componentDidLoad() {
    this.initializeRive();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  @Watch("isSpinning")
  handleIsSpinningChange(newValue: boolean) {
    if (this.rive && this.stateMachineInputs.isSpinning) {
      this.stateMachineInputs.isSpinning.value = newValue;
    }
  }

  @Watch("winAmount")
  handleWinAmountChange(newValue: number) {
    if (this.rive && this.stateMachineInputs.winAmount) {
      this.stateMachineInputs.winAmount.value = newValue;
    }
  }

  private initializeRive() {
    if (!this.canvasElement) return;

    this.rive = new Rive({
      src: "/rive/slot-spin.riv",
      canvas: this.canvasElement,
      stateMachines: "SpinSM",
      autoplay: true,
      onLoad: () => {
        this.setupStateMachine();
      },
    });
  }

  private setupStateMachine() {
    if (!this.rive) return;

    // Get state machine inputs
    const inputs = this.rive.stateMachineInputs("SpinSM");
    if (!inputs) return;

    this.stateMachineInputs = {
      isSpinning: inputs.find((input: any) => input.name === "isSpinning"),
      winAmount: inputs.find((input: any) => input.name === "winAmount")
    };

    // Set initial values
    if (this.isSpinning !== undefined && this.stateMachineInputs.isSpinning) {
      this.stateMachineInputs.isSpinning.value = this.isSpinning;
    }
    if (this.winAmount !== undefined && this.stateMachineInputs.winAmount) {
      this.stateMachineInputs.winAmount.value = this.winAmount;
    }

    // Set up event listeners
    this.rive.on("event", (event: any) => {
      if (event.data?.name === "WinSequenceComplete") {
        this.winSequenceComplete.emit(event.data);
      }
    });
  }

  private cleanup() {
    if (this.rive) {
      this.rive.cleanup();
      this.rive = undefined;
    }
  }

  render() {
    return (
      <div class="slot-spin-wrapper">
        <canvas
          ref={(el) => (this.canvasElement = el as HTMLCanvasElement)}
        ></canvas>
      </div>
    );
  }
}
```

**File:** `/libs/rive-components/src/slot-spin.css`

```css
:host {
  display: block;
  width: 100%;
  height: 100%;
}

.slot-spin-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
```

### Stencil Usage Example

```html
<!-- In HTML -->
<slot-spin id="slotComponent"></slot-spin>

<script>
  const slot = document.getElementById('slotComponent');
  slot.isSpinning = true;
  slot.winAmount = 100;

  slot.addEventListener('winSequenceComplete', (event) => {
    console.log('Win complete!', event.detail);
  });
</script>
```

---

## Generator Architecture

### Directory Structure

```
packages/mcp-server/src/generators/
├── index.ts                    # Main generator orchestrator
├── types.ts                    # TypeScript interfaces and types
├── utils.ts                    # Shared utility functions
└── templates/
    ├── react.template.ts       # React component generator
    ├── vue.template.ts         # Vue component generator
    └── stencil.template.ts     # Stencil web component generator
```

### Core Architecture

1. **Generator Registry**: Centralized registry mapping framework names to their generators
2. **Template System**: Each framework has a dedicated template generator
3. **Type Safety**: Full TypeScript support with proper input/output typing
4. **Event System**: Automatic event handler generation with proper typing
5. **File Writing**: Automatic directory creation and file writing with special handling for multi-file components

### Key Features

- **Type-Safe Props**: All inputs automatically converted to type-safe props
- **Event Emitters**: Events automatically converted to callbacks/emitters based on framework
- **JSDoc Comments**: Comprehensive documentation generated for all props and events
- **Production Ready**: Clean, formatted code following best practices for each framework
- **Extensible**: Easy to add new frameworks by implementing the `FrameworkGenerator` interface

### Usage via MCP Tool

```typescript
// Generate React wrapper
await generateWrapper({
  surface: runtimeSurface,
  framework: "react",
  riveSrc: "/rive/slot-spin.riv",
  componentName: "SlotSpin",
  writeToFile: true
});

// Generate for all frameworks
await generateWrapper({
  surface: runtimeSurface,
  framework: "all",
  riveSrc: "/rive/slot-spin.riv",
  writeToFile: true
});
```
