# Rive Playback Control Capabilities - Technical Research Specification

**Research Date:** 2025-11-09
**Rive Runtime Version:** Web/JS Runtime (Latest)
**Target Framework:** React (@rive-app/react-canvas)
**Purpose:** Enable playback controls in generated React wrapper components via refs

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Playback Methods API](#playback-methods-api)
3. [Scrubbing & Seeking](#scrubbing--seeking)
4. [Playback Speed Control](#playback-speed-control)
5. [Playback State Queries](#playback-state-queries)
6. [React Integration Pattern](#react-integration-pattern)
7. [State Machine Compatibility](#state-machine-compatibility)
8. [Event System for Completion Detection](#event-system-for-completion-detection)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Limitations & Caveats](#limitations--caveats)
11. [References](#references)

---

## Executive Summary

The Rive Web/JS runtime provides comprehensive playback control through the `Rive` instance object returned by `useRive()` hook. All major playback operations (play, pause, stop, reset, scrub) are supported and work with both linear animations and state machines.

**Key Findings:**

✅ **Full playback control available** - play, pause, stop, reset methods exist
✅ **State queries supported** - isPlaying, isPaused, isStopped properties
✅ **State machine compatible** - All methods work with state machines
✅ **Event system available** - Loop, StateChange, Play, Pause, Stop events
✅ **Scrubbing supported** - Manual timeline advancement for linear animations
✅ **Speed control possible** - Via low-level API custom render loop
✅ **React ref pattern** - useImperativeHandle + forwardRef standard approach

⚠️ **Important Note:** Direct animation playback control is considered legacy. Rive recommends using state machines for new projects. However, playback controls still work with state machines.

---

## Playback Methods API

### Available on Rive Instance

All methods are available on the `rive` object returned from `useRive()` hook.

### 1. play()

**Signature:**
```typescript
play(names?: string | string[], autoplay?: true): void
```

**Description:**
Initiates or resumes playback of animations or state machines.

**Parameters:**
- `names` (optional): Single name (string) or array of names to play. If omitted, affects all animations.
- `autoplay` (optional): Boolean flag, defaults to true.

**Behavior:**
- Starts animations from current position
- Useful after programmatic `pause()` or `stop()`
- No-op if already playing (idempotent)

**Usage Example:**
```typescript
rive?.play(); // Play all animations
rive?.play('MyAnimation'); // Play specific animation
rive?.play(['Anim1', 'Anim2']); // Play multiple animations
```

**React Native Variant:**
```typescript
// React Native ref.current?.play() signature:
play(
  animationName?: string,
  loop?: LoopMode,
  direction?: Direction,
  isStateMachine?: boolean
): void
```

---

### 2. pause()

**Signature:**
```typescript
pause(names?: string | string[]): void
```

**Description:**
Halts animation execution while maintaining current position and render loop.

**Parameters:**
- `names` (optional): Animation/state machine names to pause. If omitted, pauses all.

**Behavior:**
- Maintains current animation position
- Render loop continues (canvas still responsive)
- Can be resumed with `play()`
- Recommended when scrolling offscreen for performance

**Usage Example:**
```typescript
rive?.pause(); // Pause all
rive?.pause('MyStateMachine'); // Pause specific
```

---

### 3. stop()

**Signature:**
```typescript
stop(names?: string | string[]): void
```

**Description:**
Terminates animation and render loop.

**Parameters:**
- `names` (optional): Animation/state machine names to stop.

**Behavior:**
- Stops animation playback
- Halts render loop (more aggressive than pause)
- Useful when state machine reaches exit state
- Position maintained (does not reset to beginning)

**Usage Example:**
```typescript
rive?.stop(); // Stop all
rive?.stop('CompletedSM'); // Stop specific
```

---

### 4. reset()

**Signature:**
```typescript
reset(params?: RiveResetParameters): void
```

**Description:**
Resets artboard, animations, and state machines to initial state.

**Parameters:**
- `params` (optional): Configuration object for reset behavior (see RiveResetParameters)

**Behavior:**
- Resets to beginning of animation
- Playback resumes immediately if `autoplay` was enabled
- Resets all state machine states to entry state
- Complete reinitialization of artboard

**Usage Example:**
```typescript
rive?.reset(); // Reset and replay if autoplay enabled
```

**React Native Variant:**
```typescript
// React Native: reset() always resets based on autoplay prop
reset(): void
```

---

### 5. scrub()

**Signature:**
```typescript
scrub(animationNames?: string | string[], value?: number): void
```

**Description:**
Manually advances through linear timeline animations by specified time.

**Parameters:**
- `animationNames` (optional): Names of timeline animations to scrub
- `value` (optional): Time in **seconds** to advance to

**Behavior:**
- Only works with **linear animations**, NOT state machines
- Allows manual timeline control (e.g., scroll-based animation)
- Useful for interactive timeline scrubbing
- Time unit: **seconds** (not milliseconds)

**Usage Example:**
```typescript
// Scrub to 2.5 seconds into animation
rive?.scrub('MyTimeline', 2.5);

// Bind to scroll position
const handleScroll = (scrollPercent: number) => {
  const maxTime = 10; // 10 second animation
  rive?.scrub('MyTimeline', scrollPercent * maxTime);
};
```

**⚠️ Limitation:** Does NOT work with state machines. Use state machine inputs instead.

---

## Scrubbing & Seeking

### Overview

Rive supports manual timeline advancement for linear animations through the `scrub()` method and low-level API.

### High-Level API: scrub()

**Use Case:** Interactive timeline control (e.g., video-style scrubbing, scroll-based animation)

**Method:** `rive.scrub(animationName, timeInSeconds)`

**Time Units:** **Seconds** (not milliseconds or frames)

**Example: Scroll-Based Animation**
```typescript
import { useRive } from '@rive-app/react-canvas';
import { useEffect, useRef } from 'react';

export function ScrollAnimation() {
  const { rive, RiveComponent } = useRive({
    src: '/animation.riv',
    autoplay: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      const animationDuration = 5; // 5 second animation
      rive?.scrub('TimelineAnimation', scrollPercent * animationDuration);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [rive]);

  return <RiveComponent />;
}
```

---

### Low-Level API: advance()

For more control (frame-by-frame, custom speed), use the low-level API.

**Use Case:** Custom render loops, fine-grained control, speed manipulation

**Method:** `animation.advance(elapsedTimeSeconds)`

**Setup Required:**
1. Import advanced runtime: `@rive-app/canvas-advanced`
2. Manually create artboard, animation instances
3. Implement custom render loop

**Example: Custom Render Loop**
```typescript
import RiveCanvas from '@rive-app/canvas-advanced';

// Setup (one-time)
const rive = await RiveCanvas({
  locateFile: (_) => 'https://unpkg.com/@rive-app/canvas-advanced@2.26.1/rive.wasm'
});

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = rive.makeRenderer(canvas);

const bytes = await (await fetch('/animation.riv')).arrayBuffer();
const file = await rive.load(new Uint8Array(bytes));
const artboard = file.artboardByName('Main');

const animation = new rive.LinearAnimationInstance(
  artboard.animationByName('MyAnimation'),
  artboard
);

// Render Loop
let lastTime = 0;
function renderLoop(time: number) {
  if (!lastTime) lastTime = time;
  const elapsedTimeMs = time - lastTime;
  const elapsedTimeSec = elapsedTimeMs / 1000;
  lastTime = time;

  renderer.clear();

  // ADVANCE: Control speed here
  animation.advance(elapsedTimeSec); // Normal speed
  // animation.advance(elapsedTimeSec * 0.5); // Half speed
  // animation.advance(elapsedTimeSec * 2); // Double speed

  animation.apply(1); // Apply keyframes
  artboard.advance(elapsedTimeSec);

  renderer.save();
  renderer.align(
    rive.Fit.contain,
    rive.Alignment.center,
    {minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height},
    artboard.bounds
  );
  artboard.draw(renderer);
  renderer.restore();

  rive.requestAnimationFrame(renderLoop);
}
rive.requestAnimationFrame(renderLoop);
```

---

### Frame-by-Frame Control

**Approach:** Use `advance()` with very small time increments.

**Example:**
```typescript
// Advance by single frame at 60fps
const frameTime = 1/60; // ~0.0167 seconds
animation.advance(frameTime);
animation.apply(1);
artboard.advance(frameTime);
```

**Note:** Requires low-level API and manual render loop management.

---

## Playback Speed Control

### Overview

Playback speed can be controlled by manipulating the time passed to `advance()` in a custom render loop.

### Not Available in High-Level API

The standard `useRive()` hook does **not** expose speed control methods. Speed control requires the **low-level API**.

### Low-Level API Speed Control

**Mechanism:** Multiply elapsed time by speed factor in `advance()` call.

**Speed Multipliers:**
- `1.0` = Normal speed
- `0.5` = Half speed (slow motion)
- `2.0` = Double speed (fast forward)
- `-1.0` = Reverse playback

**Example:**
```typescript
let playbackSpeed = 1.0; // Default normal speed

function renderLoop(time: number) {
  // ... time calculation ...

  // Apply speed multiplier
  animation.advance(elapsedTimeSec * playbackSpeed);
  animation.apply(1);
  artboard.advance(elapsedTimeSec);

  // ... rendering ...
}

// Runtime speed change
function setSpeed(speed: number) {
  playbackSpeed = speed;
}

setSpeed(0.5); // Slow motion
setSpeed(2.0); // Fast forward
setSpeed(-1.0); // Reverse
```

---

### State Machine Considerations

**⚠️ Important:** State machines rely on input triggers and state logic. Speed control may produce unexpected behavior with state transitions.

**Recommendation:** Use speed control primarily with linear animations, not state machines.

---

## Playback State Queries

### Available Properties

The `rive` instance exposes several read-only properties for querying playback state:

```typescript
interface Rive {
  // Boolean state flags
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly isStopped: boolean;

  // Active animation lists
  readonly playingAnimationNames: string[];
  readonly playingStateMachineNames: string[];
  readonly pausedAnimationNames: string[];
  readonly pausedStateMachineNames: string[];

  // Available entities
  readonly animationNames: string[];
  readonly stateMachineNames: string[];

  // Artboard info
  readonly activeArtboard: string;
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
}
```

---

### 1. isPlaying

**Type:** `boolean`

**Description:** Returns `true` if **any** animation or state machine is currently active.

**Usage:**
```typescript
if (rive?.isPlaying) {
  console.log('Animation is playing');
}
```

---

### 2. isPaused

**Type:** `boolean`

**Description:** Returns `true` if **all** animations are paused.

**Usage:**
```typescript
if (rive?.isPaused) {
  console.log('Animation is paused');
}
```

---

### 3. isStopped

**Type:** `boolean`

**Description:** Returns `true` if **no** animations are active.

**Usage:**
```typescript
if (rive?.isStopped) {
  console.log('Animation is stopped');
}
```

---

### 4. playingAnimationNames

**Type:** `string[]`

**Description:** Array of currently playing **linear animation** names.

**Usage:**
```typescript
const activeTracks = rive?.playingAnimationNames || [];
console.log('Playing:', activeTracks);
```

---

### 5. playingStateMachineNames

**Type:** `string[]`

**Description:** Array of currently active **state machine** names.

**Usage:**
```typescript
const activeStateMachines = rive?.playingStateMachineNames || [];
console.log('State Machines:', activeStateMachines);
```

---

### Getting Current Time

**⚠️ Not directly available in high-level API.**

**Workaround:** Track time manually or use low-level API.

**Low-Level API:**
```typescript
// In custom render loop, track time yourself
let currentTime = 0;

function renderLoop(time: number) {
  // ... calculate elapsedTimeSec ...
  currentTime += elapsedTimeSec;
  animation.advance(elapsedTimeSec);
  // ...
}

// Expose via getter
function getCurrentTime(): number {
  return currentTime;
}
```

**Alternative:** Use event listeners to track state changes as a proxy for time.

---

## React Integration Pattern

### Overview

Expose playback controls via `forwardRef` + `useImperativeHandle` to allow parent components to control animation imperatively.

---

### TypeScript Interface Definition

**Define a handle interface** with all exposed methods:

```typescript
/**
 * Imperative handle for controlling Rive animation playback
 */
export interface RiveAnimationHandle {
  /** Start or resume animation playback */
  play: () => void;

  /** Pause animation playback */
  pause: () => void;

  /** Stop animation playback (more aggressive than pause) */
  stop: () => void;

  /** Reset animation to initial state */
  reset: () => void;

  /** Scrub to a specific time in the animation (linear animations only) */
  scrub: (timeInSeconds: number) => void;

  /** Check if animation is currently playing */
  isPlaying: () => boolean;

  /** Check if animation is paused */
  isPaused: () => boolean;

  /** Check if animation is stopped */
  isStopped: () => boolean;

  /** Get list of currently playing animation names */
  getPlayingAnimations: () => string[];

  /** Get list of currently active state machine names */
  getPlayingStateMachines: () => string[];
}
```

---

### Component Implementation with forwardRef

```typescript
import React, { useImperativeHandle, forwardRef } from 'react';
import { useRive } from '@rive-app/react-canvas';

export interface RiveAnimationProps {
  src: string;
  stateMachines?: string | string[];
  autoplay?: boolean;
  className?: string;
}

/**
 * Rive animation component with imperative playback controls
 */
export const RiveAnimation = forwardRef<RiveAnimationHandle, RiveAnimationProps>(
  ({ src, stateMachines, autoplay = true, className }, ref) => {
    const { rive, RiveComponent } = useRive({
      src,
      stateMachines,
      autoplay,
    });

    // Expose playback controls via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        rive?.play();
      },
      pause: () => {
        rive?.pause();
      },
      stop: () => {
        rive?.stop();
      },
      reset: () => {
        rive?.reset();
      },
      scrub: (timeInSeconds: number) => {
        // Note: Only works with linear animations
        rive?.scrub(undefined, timeInSeconds);
      },
      isPlaying: () => {
        return rive?.isPlaying ?? false;
      },
      isPaused: () => {
        return rive?.isPaused ?? false;
      },
      isStopped: () => {
        return rive?.isStopped ?? false;
      },
      getPlayingAnimations: () => {
        return rive?.playingAnimationNames ?? [];
      },
      getPlayingStateMachines: () => {
        return rive?.playingStateMachineNames ?? [];
      },
    }), [rive]); // Re-create when rive instance changes

    return (
      <div className={className}>
        <RiveComponent />
      </div>
    );
  }
);

RiveAnimation.displayName = 'RiveAnimation';
```

---

### Parent Component Usage

```typescript
import { useRef } from 'react';
import { RiveAnimation, RiveAnimationHandle } from './RiveAnimation';

export function ParentComponent() {
  const animationRef = useRef<RiveAnimationHandle>(null);

  const handlePlay = () => {
    animationRef.current?.play();
  };

  const handlePause = () => {
    animationRef.current?.pause();
  };

  const handleReset = () => {
    animationRef.current?.reset();
  };

  const checkStatus = () => {
    const isPlaying = animationRef.current?.isPlaying();
    console.log('Is Playing:', isPlaying);

    const activeSM = animationRef.current?.getPlayingStateMachines();
    console.log('Active State Machines:', activeSM);
  };

  return (
    <div>
      <RiveAnimation
        ref={animationRef}
        src="/animation.riv"
        stateMachines="MainSM"
      />

      <div>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause}>Pause</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={checkStatus}>Check Status</button>
      </div>
    </div>
  );
}
```

---

### Best Practices

1. **Dependency Array:** Include `[rive]` in `useImperativeHandle` dependency array to recreate handle when instance changes.

2. **Null Checks:** Always use optional chaining (`rive?.play()`) since `rive` is null until loaded.

3. **Loading State:** Consider exposing loading state in handle or props:
   ```typescript
   export interface RiveAnimationHandle {
     // ... other methods
     isLoaded: () => boolean;
   }

   useImperativeHandle(ref, () => ({
     // ...
     isLoaded: () => rive !== null,
   }), [rive]);
   ```

4. **Type Safety:** Export both `Props` and `Handle` interfaces for consumer type safety.

5. **DisplayName:** Always set `displayName` on forwardRef components for better debugging.

---

## State Machine Compatibility

### Overview

All playback control methods (`play()`, `pause()`, `stop()`, `reset()`) work with **state machines**, not just linear animations.

---

### Compatibility Matrix

| Method | Linear Animations | State Machines | Notes |
|--------|-------------------|----------------|-------|
| `play()` | ✅ Yes | ✅ Yes | Resumes state machine advancement |
| `pause()` | ✅ Yes | ✅ Yes | Pauses state machine progression |
| `stop()` | ✅ Yes | ✅ Yes | Stops state machine |
| `reset()` | ✅ Yes | ✅ Yes | Resets to entry state |
| `scrub()` | ✅ Yes | ❌ No | Only timeline animations |
| Speed control (low-level) | ✅ Yes | ⚠️ Limited | May break state logic |

---

### State Machine Playback Behavior

**play():**
- Resumes state machine advancement through render loop
- Does NOT trigger state transitions
- State machine continues from current state

**pause():**
- Pauses state machine advancement
- Current state maintained
- Inputs still work (state machine still responsive)
- Recommended for offscreen optimization

**stop():**
- More aggressive than pause
- Halts render loop entirely
- Useful when state machine reaches exit/done state

**reset():**
- Resets all state machine states to entry state
- Clears input values to defaults
- Restarts from beginning
- Respects `autoplay` setting

---

### Platform-Specific Notes

**Android:**
```kotlin
// Android requires isStateMachine flag
animationView.play("MyStateMachine", isStateMachine = true)
```

**Flutter:**
```dart
// Flutter uses StateMachineController.isActive property
stateMachineController.isActive = false; // Pause
stateMachineController.isActive = true;  // Play
```

**Web/React:**
```typescript
// Web/React: No special flag needed, auto-detected
rive.play('MyStateMachine'); // Works for both animations and state machines
```

---

### Hybrid Control Patterns

**Scenario:** State machine with manual playback control

**Example Use Case:** Character animation that plays on user interaction

```typescript
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

export function CharacterAnimation() {
  const { rive, RiveComponent } = useRive({
    src: '/character.riv',
    stateMachines: 'Character',
    autoplay: false, // Start paused
  });

  const triggerInput = useStateMachineInput(rive, 'Character', 'Trigger');

  const handleInteraction = () => {
    // Start state machine if stopped
    rive?.play();

    // Fire trigger input
    triggerInput?.fire();
  };

  const handleOffscreen = () => {
    // Pause when offscreen for performance
    rive?.pause();
  };

  return (
    <div>
      <RiveComponent />
      <button onClick={handleInteraction}>Interact</button>
    </div>
  );
}
```

---

### Best Practices

1. **Use State Machines:** Rive recommends state machines over direct animation control for new projects.

2. **Pause When Offscreen:** Use `pause()` for state machines when scrolled out of view:
   ```typescript
   useEffect(() => {
     const observer = new IntersectionObserver(([entry]) => {
       if (entry.isIntersecting) {
         rive?.play();
       } else {
         rive?.pause();
       }
     });
     observer.observe(containerRef.current);
     return () => observer.disconnect();
   }, [rive]);
   ```

3. **Avoid Speed Control:** Do not manipulate playback speed for state machines (breaks state logic).

4. **Use Inputs:** Prefer state machine inputs over direct control for animation logic.

---

## Event System for Completion Detection

### Overview

Rive provides a comprehensive event system for monitoring animation lifecycle, state changes, and custom events.

---

### EventType Enum

```typescript
export enum EventType {
  Load = "load",              // Rive file loaded successfully
  LoadError = "loaderror",    // Load failed
  Play = "play",              // Animation started
  Pause = "pause",            // Animation paused
  Stop = "stop",              // Animation stopped
  Loop = "loop",              // Animation completed a loop (linear animations only)
  Advance = "advance",        // Frame advanced (render loop tick)
  StateChange = "statechange", // State machine state changed
  RiveEvent = "riveevent"     // Custom event from Rive file
}
```

---

### Event Listener Methods

**on():**
```typescript
rive.on(type: EventType, callback: EventCallback): void
```

**off():**
```typescript
rive.off(type: EventType, callback: EventCallback): void
```

**removeAllEventListeners():**
```typescript
rive.removeAllEventListeners(type?: EventType): void
```

---

### Loop Event (Animation Completion)

**Use Case:** Detect when a linear animation completes a loop iteration.

**EventType:** `EventType.Loop`

**Scope:** **Linear animations only** (not state machines)

**Callback Signature:**
```typescript
interface LoopEvent {
  type: 'loop';
  data: {
    animation: string; // Animation name
  };
}
```

**Example:**
```typescript
import { useRive, EventType } from '@rive-app/react-canvas';
import { useEffect } from 'react';

export function AnimationWithLoopDetection() {
  const { rive, RiveComponent } = useRive({
    src: '/animation.riv',
    autoplay: true,
  });

  useEffect(() => {
    if (!rive) return;

    const handleLoop = (event: any) => {
      console.log(`Animation looped: ${event.data.animation}`);
      // Trigger next action, update state, etc.
    };

    rive.on(EventType.Loop, handleLoop);

    // Cleanup
    return () => {
      rive.off(EventType.Loop, handleLoop);
    };
  }, [rive]);

  return <RiveComponent />;
}
```

**Alternative: onLoop Callback in Parameters**
```typescript
const { rive, RiveComponent } = useRive({
  src: '/animation.riv',
  onLoop: (event) => {
    console.log(`Looped: ${event.data.animation}`);
  },
});
```

---

### StateChange Event (State Machine)

**Use Case:** Detect state machine state transitions.

**EventType:** `EventType.StateChange`

**Scope:** State machines only

**Callback Signature:**
```typescript
interface StateChangeEvent {
  type: 'statechange';
  data: string[]; // Array of new state names
}
```

**Example:**
```typescript
useEffect(() => {
  if (!rive) return;

  const handleStateChange = (event: any) => {
    const newStates = event.data; // Array of state names
    console.log('State changed to:', newStates);

    // Check for specific state
    if (newStates.includes('Complete')) {
      console.log('State machine completed!');
    }
  };

  rive.on(EventType.StateChange, handleStateChange);

  return () => {
    rive.off(EventType.StateChange, handleStateChange);
  };
}, [rive]);
```

**Alternative: onStateChange in Parameters**
```typescript
const { rive, RiveComponent } = useRive({
  src: '/animation.riv',
  stateMachines: 'MainSM',
  onStateChange: (event) => {
    console.log('New state:', event.data[0]);
  },
});
```

---

### Play/Pause/Stop Events

**Use Case:** Track playback lifecycle changes.

**Example:**
```typescript
useEffect(() => {
  if (!rive) return;

  rive.on(EventType.Play, (event) => {
    console.log('Playing:', event.data); // Array of animation names
  });

  rive.on(EventType.Pause, (event) => {
    console.log('Paused:', event.data);
  });

  rive.on(EventType.Stop, (event) => {
    console.log('Stopped:', event.data);
  });

  return () => {
    rive.removeAllEventListeners();
  };
}, [rive]);
```

**Alternative: Callback Parameters**
```typescript
const { rive, RiveComponent } = useRive({
  src: '/animation.riv',
  onPlay: (event) => console.log('Play:', event.data),
  onPause: (event) => console.log('Pause:', event.data),
  onStop: (event) => console.log('Stop:', event.data),
});
```

---

### Custom Rive Events

**Use Case:** Designer-defined events from Rive editor.

**EventType:** `EventType.RiveEvent`

**Setup:** Designer adds events to timeline or state machine in Rive editor.

**Example:**
```typescript
useEffect(() => {
  if (!rive) return;

  const handleRiveEvent = (event: any) => {
    const { name, type, metadata } = event.data;
    console.log('Rive Event:', name, type, metadata);

    if (name === 'CustomTrigger') {
      // Handle custom event
    }
  };

  rive.on(EventType.RiveEvent, handleRiveEvent);

  return () => {
    rive.off(EventType.RiveEvent, handleRiveEvent);
  };
}, [rive]);
```

---

### Detecting Animation Completion

**For Linear Animations:**
- Use `EventType.Loop` to detect each loop completion
- Check loop mode to detect final completion (one-shot animations)

**For State Machines:**
- Use `EventType.StateChange` to detect exit/complete states
- Define "completion" states in Rive editor
- Listen for transition to completion state

**Example: One-Shot Animation Completion**
```typescript
const { rive, RiveComponent } = useRive({
  src: '/one-shot.riv',
  autoplay: true,
  onLoop: (event) => {
    console.log('Animation completed!');
    // Animation will not loop again (one-shot mode)
  },
});
```

**Example: State Machine Completion**
```typescript
useEffect(() => {
  if (!rive) return;

  const handleStateChange = (event: any) => {
    if (event.data.includes('ExitState')) {
      console.log('State machine completed!');
      rive.stop(); // Optionally stop to save resources
    }
  };

  rive.on(EventType.StateChange, handleStateChange);
  return () => rive.off(EventType.StateChange, handleStateChange);
}, [rive]);
```

---

## Implementation Guidelines

### For Generated React Components

Based on the existing component template structure, here are the recommended implementations:

---

### 1. Update Handle Interface (Already Defined)

The current template already includes a comprehensive handle interface. **No changes needed** to the interface definition (lines 186-201 in react.template.ts).

Current interface is correct:
```typescript
export interface ${componentName}Handle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  scrub: (time: number) => void;
  isPlaying: () => boolean;
  getTime: () => number;
}
```

**Recommended Addition:** Add state query methods:
```typescript
export interface ${componentName}Handle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  scrub: (time: number) => void;
  isPlaying: () => boolean;
  isPaused: () => boolean;
  isStopped: () => boolean;
  getPlayingAnimations: () => string[];
  getPlayingStateMachines: () => string[];
}
```

---

### 2. Implement useImperativeHandle (Lines 85-123)

Replace the placeholder TODOs with actual implementations:

```typescript
useImperativeHandle(ref, () => ({
  play: () => {
    rive?.play();
  },
  pause: () => {
    rive?.pause();
  },
  stop: () => {
    rive?.stop();
  },
  reset: () => {
    rive?.reset();
  },
  scrub: (time: number) => {
    // Note: Only works with linear animations, not state machines
    rive?.scrub(undefined, time);
  },
  isPlaying: () => {
    return rive?.isPlaying ?? false;
  },
  isPaused: () => {
    return rive?.isPaused ?? false;
  },
  isStopped: () => {
    return rive?.isStopped ?? false;
  },
  getPlayingAnimations: () => {
    return rive?.playingAnimationNames ?? [];
  },
  getPlayingStateMachines: () => {
    return rive?.playingStateMachineNames ?? [];
  },
}), [rive]); // Dependency: recreate when rive instance changes
```

---

### 3. Add Resize Implementation (Lines 131-142)

Replace the resize TODO:

```typescript
useEffect(() => {
  if (!autoResize || !rive) return;

  const handleResize = () => {
    rive.resizeDrawingSurfaceToCanvas();
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [autoResize, rive]);
```

---

### 4. Optional: Add Loop/StateChange Event Props

Add optional callback props for common events:

**Props Interface Addition:**
```typescript
export interface ${componentName}Props {
  // ... existing props ...

  /** Event Callbacks */

  /**
   * Called when animation completes a loop (linear animations only)
   */
  onLoop?: (event: { animation: string }) => void;

  /**
   * Called when state machine changes state
   */
  onStateChange?: (states: string[]) => void;
}
```

**Event Handler Implementation:**
```typescript
// Add after existing event handlers

// Loop event handler (linear animations)
useEffect(() => {
  if (!rive || !onLoop) return;

  const handler = (event: any) => {
    onLoop({ animation: event.data.animation });
  };

  rive.on('loop', handler);
  return () => rive.off('loop', handler);
}, [rive, onLoop]);

// StateChange event handler (state machines)
useEffect(() => {
  if (!rive || !onStateChange) return;

  const handler = (event: any) => {
    onStateChange(event.data);
  };

  rive.on('statechange', handler);
  return () => rive.off('statechange', handler);
}, [rive, onStateChange]);
```

---

### 5. Import EventType (Optional)

If using typed events, import EventType:

```typescript
import { useRive, useStateMachineInput, Layout, Fit, Alignment, EventType } from "@rive-app/react-canvas";
```

Then use:
```typescript
rive.on(EventType.Loop, handler);
rive.on(EventType.StateChange, handler);
```

---

### 6. Intersection Observer for Offscreen Optimization (Optional)

Add automatic pause when offscreen:

**Props Addition:**
```typescript
export interface ${componentName}Props {
  // ... existing props ...

  /**
   * Automatically pause when scrolled offscreen
   * @default false
   */
  pauseWhenOffscreen?: boolean;
}
```

**Implementation:**
```typescript
// Intersection observer for offscreen optimization
useEffect(() => {
  if (!pauseWhenOffscreen || !rive || !containerRef.current) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      rive.play();
    } else {
      rive.pause();
    }
  });

  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, [pauseWhenOffscreen, rive]);
```

---

## Limitations & Caveats

### 1. scrub() Only Works with Linear Animations

**Issue:** `scrub()` method does not work with state machines.

**Workaround:** Use state machine inputs to control state transitions instead of scrubbing.

**Example:**
```typescript
// ❌ Does not work with state machines
rive.scrub('MyStateMachine', 5.0);

// ✅ Use state machine inputs instead
const progressInput = useStateMachineInput(rive, 'MyStateMachine', 'progress');
progressInput.value = 0.5; // Set progress (0-1)
```

---

### 2. No Built-In Speed Control in High-Level API

**Issue:** Cannot change playback speed with standard `useRive()` hook.

**Workaround:** Use low-level API with custom render loop (complex setup).

**Impact:** Most use cases don't need speed control. State machines handle timing internally.

---

### 3. getCurrentTime() Not Available

**Issue:** No direct method to get current playback time.

**Workaround:** Track time manually or use low-level API.

**Impact:** Limited ability to synchronize with external timelines.

---

### 4. Legacy Animation Playback

**Note:** Rive documentation states that direct animation playback control is "legacy" and recommends using state machines for new projects.

**Implication:** Future Rive versions may deprecate direct animation control methods.

**Recommendation:** Use state machines as primary control mechanism. Use playback methods (`play`, `pause`, `stop`) as secondary controls for performance optimization (e.g., pausing when offscreen).

---

### 5. State Machine Speed Control Issues

**Issue:** Manipulating playback speed for state machines (via low-level API) can break state transition logic.

**Reason:** State transitions are time-based and expect normal playback speed.

**Recommendation:** Avoid speed control for state machines. Design state machine logic to handle timing internally.

---

### 6. rive Instance is Null Until Loaded

**Issue:** `useRive()` returns `rive: null` until the Rive file loads.

**Impact:** All ref methods must handle null case.

**Solution:** Use optional chaining (`rive?.play()`) and null checks (`rive?.isPlaying ?? false`).

---

### 7. Event Listener Cleanup Required

**Issue:** Event listeners persist unless explicitly removed.

**Impact:** Memory leaks if not cleaned up in `useEffect` return function.

**Best Practice:**
```typescript
useEffect(() => {
  if (!rive) return;

  const handler = (event: any) => { /* ... */ };
  rive.on('loop', handler);

  // CRITICAL: Cleanup
  return () => {
    rive.off('loop', handler);
  };
}, [rive]);
```

---

### 8. Loop Event Only for Linear Animations

**Issue:** `EventType.Loop` does not fire for state machines.

**Alternative:** Use `EventType.StateChange` to detect state machine loops (if looping states are defined).

---

### 9. Scrub Time Units are Seconds

**Issue:** Common mistake to pass milliseconds instead of seconds.

**Example:**
```typescript
// ❌ Wrong (milliseconds)
rive.scrub('Animation', 2500);

// ✅ Correct (seconds)
rive.scrub('Animation', 2.5);
```

---

### 10. Platform Differences

**Issue:** Some platforms require additional flags or use different APIs.

**Android:**
```kotlin
// Requires isStateMachine flag
animationView.play("SM", isStateMachine = true)
```

**Flutter:**
```dart
// Uses controller.isActive property
controller.isActive = false;
```

**Web/React:**
```typescript
// Auto-detects type, no flag needed
rive.play('SM');
```

**Recommendation:** For autogenerated wrappers targeting web/React, no special handling needed.

---

## References

### Official Documentation

1. **Animation Playback:** https://rive.app/docs/runtimes/animation-playback
2. **Rive Parameters (Web/JS):** https://rive.app/docs/runtimes/web/rive-parameters
3. **React Runtime:** https://rive.app/docs/runtimes/react/react
4. **React Parameters & Return Values:** https://rive.app/docs/runtimes/react/parameters-and-return-values
5. **Low-Level API Usage:** https://rive.app/docs/runtimes/web/low-level-api-usage
6. **State Machine Playback:** https://rive.app/docs/runtimes/state-machines
7. **Rive Events:** https://rive.app/docs/runtimes/rive-events

### GitHub Repositories

1. **rive-react:** https://github.com/rive-app/rive-react
2. **rive-react types:** https://github.com/rive-app/rive-react/blob/main/src/types.ts
3. **rive-wasm:** https://github.com/rive-app/rive-wasm

### NPM Packages

1. **@rive-app/react-canvas:** High-level React runtime
2. **@rive-app/canvas:** Core web runtime
3. **@rive-app/canvas-advanced:** Low-level API for custom render loops

### React Documentation

1. **forwardRef:** https://react.dev/reference/react/forwardRef
2. **useImperativeHandle:** https://react.dev/reference/react/useImperativeHandle

---

## Appendix: Complete Working Example

```typescript
import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef
} from "react";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
  EventType
} from "@rive-app/react-canvas";

/**
 * Imperative handle for controlling playback
 */
export interface RiveAnimationHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  scrub: (time: number) => void;
  isPlaying: () => boolean;
  isPaused: () => boolean;
  isStopped: () => boolean;
  getPlayingAnimations: () => string[];
  getPlayingStateMachines: () => string[];
}

/**
 * Component props
 */
export interface RiveAnimationProps {
  src: string;
  stateMachines?: string | string[];
  autoplay?: boolean;
  fit?: "cover" | "contain" | "fill" | "fitWidth" | "fitHeight" | "none" | "scaleDown";
  alignment?: "center" | "topLeft" | "topCenter" | "topRight" | "centerLeft" | "centerRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
  autoResize?: boolean;
  pauseWhenOffscreen?: boolean;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onLoop?: (event: { animation: string }) => void;
  onStateChange?: (states: string[]) => void;
}

/**
 * Rive Animation Component with Full Playback Control
 */
export const RiveAnimation = forwardRef<RiveAnimationHandle, RiveAnimationProps>(({
  src,
  stateMachines,
  autoplay = true,
  fit = "contain",
  alignment = "center",
  autoResize = false,
  pauseWhenOffscreen = false,
  onLoadComplete,
  onError,
  onLoop,
  onStateChange,
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines,
    autoplay,
    layout: new Layout({
      fit: Fit[fit],
      alignment: Alignment[alignment],
    }),
    onLoad: () => {
      setLoading(false);
      onLoadComplete?.();
    },
    onLoadError: (err: any) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(errorObj);
    }
  });

  // Expose playback controls via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      rive?.play();
    },
    pause: () => {
      rive?.pause();
    },
    stop: () => {
      rive?.stop();
    },
    reset: () => {
      rive?.reset();
    },
    scrub: (time: number) => {
      rive?.scrub(undefined, time);
    },
    isPlaying: () => {
      return rive?.isPlaying ?? false;
    },
    isPaused: () => {
      return rive?.isPaused ?? false;
    },
    isStopped: () => {
      return rive?.isStopped ?? false;
    },
    getPlayingAnimations: () => {
      return rive?.playingAnimationNames ?? [];
    },
    getPlayingStateMachines: () => {
      return rive?.playingStateMachineNames ?? [];
    },
  }), [rive]);

  // Loop event handler
  useEffect(() => {
    if (!rive || !onLoop) return;

    const handler = (event: any) => {
      onLoop({ animation: event.data.animation });
    };

    rive.on(EventType.Loop, handler);
    return () => rive.off(EventType.Loop, handler);
  }, [rive, onLoop]);

  // StateChange event handler
  useEffect(() => {
    if (!rive || !onStateChange) return;

    const handler = (event: any) => {
      onStateChange(event.data);
    };

    rive.on(EventType.StateChange, handler);
    return () => rive.off(EventType.StateChange, handler);
  }, [rive, onStateChange]);

  // Auto-resize handler
  useEffect(() => {
    if (!autoResize || !rive) return;

    const handleResize = () => {
      rive.resizeDrawingSurfaceToCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [autoResize, rive]);

  // Intersection observer for offscreen optimization
  useEffect(() => {
    if (!pauseWhenOffscreen || !rive || !containerRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        rive.play();
      } else {
        rive.pause();
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pauseWhenOffscreen, rive]);

  if (error) {
    return (
      <div className="rive-error" style={{ padding: "1rem", color: "#dc2626" }}>
        Error loading animation: {error.message}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rive-loading" style={{ padding: "1rem", color: "#6b7280" }}>
        Loading animation...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rive-wrapper">
      <RiveComponent />
    </div>
  );
});

RiveAnimation.displayName = "RiveAnimation";
```

**Usage:**
```typescript
function App() {
  const animationRef = useRef<RiveAnimationHandle>(null);

  return (
    <div>
      <RiveAnimation
        ref={animationRef}
        src="/animation.riv"
        stateMachines="MainSM"
        autoResize
        pauseWhenOffscreen
        onLoop={(event) => console.log('Looped:', event.animation)}
        onStateChange={(states) => console.log('State:', states)}
      />

      <button onClick={() => animationRef.current?.play()}>Play</button>
      <button onClick={() => animationRef.current?.pause()}>Pause</button>
      <button onClick={() => animationRef.current?.reset()}>Reset</button>
    </div>
  );
}
```

---

**End of Research Specification**
