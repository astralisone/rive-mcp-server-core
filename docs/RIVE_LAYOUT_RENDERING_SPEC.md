# Rive Layout and Rendering Control - Technical Specification

**Version:** 1.0
**Date:** 2025-11-09
**Author:** Research Team
**Target Runtimes:** @rive-app/react-canvas v4.23.3+, @rive-app/canvas v2.x+

---

## Table of Contents

1. [Overview](#overview)
2. [Fit Modes](#fit-modes)
3. [Alignment Options](#alignment-options)
4. [Layout Configuration](#layout-configuration)
5. [Resize Handling](#resize-handling)
6. [React Integration Patterns](#react-integration-patterns)
7. [TypeScript Type Definitions](#typescript-type-definitions)
8. [SSR and JSDOM Compatibility](#ssr-and-jsdom-compatibility)
9. [Best Practices](#best-practices)
10. [Code Examples](#code-examples)
11. [References](#references)

---

## Overview

Rive provides comprehensive layout and rendering control through three primary mechanisms:

- **Fit Modes**: Define how Rive content scales within a canvas
- **Alignment Options**: Control content positioning relative to view bounds
- **Layout Configuration**: Combine fit and alignment for complete control
- **Resize Handling**: Ensure proper rendering across different screen sizes and pixel densities

These features are exposed through the `Layout`, `Fit`, and `Alignment` exports from `@rive-app/canvas` and `@rive-app/react-canvas`.

---

## Fit Modes

### Overview

Fit modes determine how Rive content scales and fills the available canvas space. They control whether content maintains aspect ratio, clips, stretches, or scales dynamically.

### Available Fit Modes

| Fit Mode | Enum Value | Behavior | Use Case |
|----------|------------|----------|----------|
| **Layout** | `Fit.Layout` | Automatically resizes artboards based on layout constraints to match view size. Requires `resizeDrawingSurfaceToCanvas()` on resize events. | Responsive designs with dynamic sizing |
| **Cover** | `Fit.Cover` | Covers the view while preserving aspect ratio. Content clips if proportions differ. | Full-bleed backgrounds, hero sections |
| **Contain** | `Fit.Contain` (Default) | Contains content within view while preserving aspect ratio. May show empty space (letterbox/pillarbox). | Standard animations, UI components |
| **Fill** | `Fit.Fill` | Stretches content to fill available space without maintaining aspect ratio. | Non-critical decorative elements (use sparingly) |
| **FitWidth** | `Fit.FitWidth` | Fills the width dimension. May result in vertical clipping or empty space. | Horizontal banners, progress bars |
| **FitHeight** | `Fit.FitHeight` | Fills the height dimension. May result in horizontal clipping or empty space. | Vertical sidebars, loading indicators |
| **None** | `Fit.None` | Renders at artboard's native size without scaling. | Fixed-size icons, badges |
| **ScaleDown** | `Fit.ScaleDown` | Scales down to view size while preserving aspect ratio. Never enlarges content. Equivalent to Contain when content is larger than canvas. | Thumbnails, previews |

### Visual Reference

```
┌─────────────────────────────────────┐
│ Fit.Cover (clips content)           │
│  ┌───────────────────────────────┐  │
│  │████████████████████████████████  │
│  │████████ CONTENT ███████████████  │  Content extends
│  │████████████████████████████████  │  beyond bounds
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Fit.Contain (letterbox/pillarbox)   │
│  ╔═══════════════════════╗          │
│  ║                       ║          │  Empty space
│  ║   CONTENT PRESERVED   ║          │  around content
│  ║                       ║          │
│  ╚═══════════════════════╝          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Fit.Fill (stretches content)        │
│  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  │
│  ██ STRETCHED CONTENT ███████████  │  Distorted to
│  ██████████████████████████████████  │  fill space
│  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  │
└─────────────────────────────────────┘
```

### API Surface

```typescript
// From @rive-app/canvas or @rive-app/react-canvas
enum Fit {
  Layout = 'layout',
  Cover = 'cover',
  Contain = 'contain',
  Fill = 'fill',
  FitWidth = 'fitWidth',
  FitHeight = 'fitHeight',
  None = 'none',
  ScaleDown = 'scaleDown'
}
```

---

## Alignment Options

### Overview

Alignment controls how content is positioned within the view bounds when using fit modes that don't fill the entire space (e.g., `Contain`, `ScaleDown`, `None`).

### Available Alignment Options

Rive provides a 3x3 grid of alignment positions:

```
┌─────────────────────────────────────┐
│  TopLeft    TopCenter    TopRight   │
│                                      │
│                                      │
│ CenterLeft    Center    CenterRight │
│                                      │
│                                      │
│ BottomLeft  BottomCenter BottomRight│
└─────────────────────────────────────┘
```

| Alignment | Enum Value | Horizontal | Vertical | Use Case |
|-----------|------------|------------|----------|----------|
| **TopLeft** | `Alignment.TopLeft` | Left | Top | Document viewers, reading interfaces |
| **TopCenter** | `Alignment.TopCenter` | Center | Top | Headers, navigation animations |
| **TopRight** | `Alignment.TopRight` | Right | Top | Notifications, badges |
| **CenterLeft** | `Alignment.CenterLeft` | Left | Center | Sidebar content |
| **Center** | `Alignment.Center` (Default) | Center | Center | Modal dialogs, splash screens |
| **CenterRight** | `Alignment.CenterRight` | Right | Center | Tooltips, popovers |
| **BottomLeft** | `Alignment.BottomLeft` | Left | Bottom | Status indicators |
| **BottomCenter** | `Alignment.BottomCenter` | Center | Bottom | Footers, toast messages |
| **BottomRight** | `Alignment.BottomRight` | Right | Bottom | Chat widgets, FAB buttons |

### API Surface

```typescript
// From @rive-app/canvas or @rive-app/react-canvas
enum Alignment {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  CenterLeft = 'centerLeft',
  Center = 'center',
  CenterRight = 'centerRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight'
}
```

---

## Layout Configuration

### Overview

The `Layout` class combines `Fit` and `Alignment` into a single configuration object that can be passed to Rive instances.

### Layout Class API

```typescript
class Layout {
  constructor(params?: {
    fit?: Fit;
    alignment?: Alignment;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
  });

  fit: Fit;
  alignment: Alignment;
}
```

### Properties

- **`fit`** (optional): Fit mode (defaults to `Fit.Contain`)
- **`alignment`** (optional): Alignment position (defaults to `Alignment.Center`)
- **`minX`, `minY`, `maxX`, `maxY`** (optional): Custom bounds in pixels relative to the container. Overrides alignment when specified.

### Custom Bounds

Instead of using predefined alignments, you can specify exact render area coordinates:

```typescript
const layout = new Layout({
  fit: Fit.Contain,
  minX: 50,
  minY: 50,
  maxX: 750,
  maxY: 550
});
// Renders within a 700x500px area offset by 50px from top-left
```

---

## Resize Handling

### Overview

Proper resize handling ensures Rive content renders correctly across different:
- Screen sizes (mobile, tablet, desktop)
- Device pixel ratios (standard, Retina displays)
- Window resize events
- Dynamic container size changes

### Core Methods

#### `resizeDrawingSurfaceToCanvas()`

**Purpose**: Adjusts the internal drawing surface to match the canvas's current bounding rect size, accounting for `devicePixelRatio`.

**When to Call**:
- After initial load (in `onLoad` callback)
- On window resize events
- On device pixel ratio changes (zoom, display switch)
- When container dimensions change

**Behavior**:
- Resets canvas `width` and `height` properties to current bounding rect size
- Multiplies by `window.devicePixelRatio` for sharp rendering on high-DPI screens
- Implicitly calls `resizeToCanvas()`

**Example**:
```javascript
const rive = new Rive({
  src: 'animation.riv',
  canvas: document.getElementById('canvas'),
  onLoad: () => {
    rive.resizeDrawingSurfaceToCanvas(); // Initial sizing
  }
});
```

#### `resizeToCanvas()`

**Purpose**: Lower-level method that updates the Rive renderer to match the canvas's pixel dimensions.

**Note**: Usually called implicitly by `resizeDrawingSurfaceToCanvas()`. Rarely needs direct invocation.

### Vanilla JavaScript Pattern

```javascript
// Get Rive instance
const rive = new Rive({
  src: 'animation.riv',
  canvas: document.getElementById('canvas'),
  autoplay: true,
  onLoad: () => {
    rive.resizeDrawingSurfaceToCanvas();
  }
});

// Handle window resize
function handleResize() {
  rive.resizeDrawingSurfaceToCanvas();
}
window.addEventListener('resize', handleResize);

// Handle device pixel ratio changes (zoom, display switch)
const pixelRatioQuery = window.matchMedia(
  `(resolution: ${window.devicePixelRatio}dppx)`
);
pixelRatioQuery.addEventListener('change', handleResize);

// Cleanup
window.removeEventListener('resize', handleResize);
pixelRatioQuery.removeEventListener('change', handleResize);
rive.cleanup();
```

---

## React Integration Patterns

### Option 1: Using `<Rive />` Component (Simple)

Best for: Simple use cases with static layout configuration

```typescript
import Rive, { Layout, Fit, Alignment } from '@rive-app/react-canvas';

export const SimpleRiveComponent = () => (
  <Rive
    src="/animations/hero.riv"
    stateMachines="Main"
    layout={new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center
    })}
    autoplay
    className="rive-canvas"
  />
);
```

**Notes**:
- The `<Rive />` component automatically handles resize events
- Apply sizing via `className` or wrap in a sized container
- No manual ref management needed

### Option 2: Using `useRive` Hook (Advanced)

Best for: Dynamic control, event handling, state machine inputs

```typescript
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export const AdvancedRiveComponent = () => {
  const { rive, RiveComponent } = useRive({
    src: '/animations/interactive.riv',
    stateMachines: ['StateMachine'],
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.TopCenter
    }),
    autoplay: true
  });

  return (
    <div className="rive-container">
      <RiveComponent />
    </div>
  );
};
```

### Option 3: Manual Refs with Auto-Resize

Best for: Full control, custom container logic

```typescript
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect } from 'react';

export const ManualResizeComponent = () => {
  const { rive, RiveComponent, setContainerRef } = useRive({
    src: '/animations/responsive.riv',
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  // Manual cleanup on unmount
  useEffect(() => {
    return () => {
      rive?.cleanup();
    };
  }, [rive]);

  return (
    <div ref={setContainerRef} className="rive-wrapper">
      <RiveComponent />
    </div>
  );
};
```

**Notes**:
- Calling `setContainerRef` enables automatic resize handling
- The runtime monitors window resize and device pixel ratio changes
- Always call `rive.cleanup()` on unmount to prevent memory leaks

### Option 4: Dynamic Fit/Alignment Props

Best for: User-controlled layout settings, responsive breakpoints

```typescript
import { useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

interface RiveWithLayoutProps {
  src: string;
  fit?: Fit;
  alignment?: Alignment;
}

export const DynamicLayoutComponent: React.FC<RiveWithLayoutProps> = ({
  src,
  fit = Fit.Contain,
  alignment = Alignment.Center
}) => {
  const { RiveComponent } = useRive({
    src,
    layout: new Layout({ fit, alignment }),
    autoplay: true
  });

  return <RiveComponent />;
};

// Usage
export const Demo = () => {
  const [fitMode, setFitMode] = useState<Fit>(Fit.Contain);

  return (
    <div>
      <select onChange={(e) => setFitMode(e.target.value as Fit)}>
        <option value={Fit.Contain}>Contain</option>
        <option value={Fit.Cover}>Cover</option>
        <option value={Fit.Fill}>Fill</option>
      </select>
      <DynamicLayoutComponent
        src="/animations/demo.riv"
        fit={fitMode}
      />
    </div>
  );
};
```

**Important Note**: Changing layout configuration after initialization requires re-instantiating the Rive component. React will handle this automatically when props change due to remounting.

### Option 5: Custom Resize Hook (Advanced)

Best for: Complex resize logic, performance optimization

```typescript
import { useEffect, useRef } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export const CustomResizeComponent = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { rive, RiveComponent, canvas } = useRive({
    src: '/animations/custom.riv',
    layout: new Layout({
      fit: Fit.Layout, // Requires manual resize calls
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  useEffect(() => {
    if (!rive || !canvas || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      rive.resizeDrawingSurfaceToCanvas();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      rive.cleanup();
    };
  }, [rive, canvas]);

  return (
    <div ref={containerRef} className="rive-container">
      <RiveComponent />
    </div>
  );
};
```

**Use Case**: When using `Fit.Layout` or when you need to respond to container size changes rather than just window resizes.

---

## TypeScript Type Definitions

### Core Types

```typescript
// Fit enum
enum Fit {
  Layout = 'layout',
  Cover = 'cover',
  Contain = 'contain',
  Fill = 'fill',
  FitWidth = 'fitWidth',
  FitHeight = 'fitHeight',
  None = 'none',
  ScaleDown = 'scaleDown'
}

// Alignment enum
enum Alignment {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  CenterLeft = 'centerLeft',
  Center = 'center',
  CenterRight = 'centerRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight'
}

// Layout configuration class
class Layout {
  constructor(params?: LayoutParameters);
  fit: Fit;
  alignment: Alignment;
}

interface LayoutParameters {
  fit?: Fit;
  alignment?: Alignment;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
}
```

### React-Specific Types

```typescript
// useRive hook parameters
interface UseRiveParameters {
  src?: string;
  buffer?: ArrayBuffer;
  artboard?: string;
  animations?: string | string[];
  stateMachines?: string | string[];
  layout?: Layout;
  autoplay?: boolean;
  onLoad?: () => void;
  onLoadError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onLoop?: (event: Event) => void;
  onStateChange?: (event: Event) => void;
  shouldDisableRiveListeners?: boolean;
}

// useRive hook options
interface UseRiveOptions {
  useDevicePixelRatio?: boolean;      // Default: true
  customDevicePixelRatio?: number;    // Custom DPR override
  fitCanvasToArtboardHeight?: boolean; // Default: false
  useOffscreenRenderer?: boolean;     // Default: true (shared WebGL context)
  shouldResizeCanvasToContainer?: boolean; // Auto-resize on container changes
  shouldUseIntersectionObserver?: boolean; // Pause when offscreen
}

// useRive return values
interface RiveState {
  canvas: HTMLCanvasElement | null;
  container: HTMLElement | null;
  setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  setContainerRef: (container: HTMLElement | null) => void;
  rive: Rive | null;
  RiveComponent: React.FC<React.ComponentProps<'canvas'>>;
}

// useResizeCanvas hook (advanced)
interface UseResizeCanvasProps {
  riveLoaded: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLElement>;
  onCanvasHasResized?: () => void;
  options?: Partial<UseRiveOptions>;
  artboardBounds?: Bounds;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

### Component Props Interface Template

```typescript
// Template for generated component props
interface RiveComponentProps {
  // Layout configuration
  fit?: Fit;
  alignment?: Alignment;

  // Canvas sizing
  className?: string;
  style?: React.CSSProperties;

  // Runtime options
  useDevicePixelRatio?: boolean;
  fitCanvasToArtboardHeight?: boolean;

  // State machine inputs (auto-generated)
  [inputName: string]: any;

  // Event handlers (auto-generated)
  [eventHandler: string]: (payload: any) => void;
}

// Example implementation
interface MyAnimationProps {
  fit?: Fit;
  alignment?: Alignment;
  className?: string;

  // State machine inputs
  isActive: boolean;
  progress: number;

  // Event handlers
  onComplete?: (payload: any) => void;
}
```

---

## SSR and JSDOM Compatibility

### Critical Limitations

⚠️ **Rive CANNOT run in server-side rendering (SSR) environments** such as:
- Next.js SSR/SSG
- Gatsby SSR
- Remix SSR
- JSDOM test environments
- Node.js without canvas polyfill

**Reason**: Rive requires browser-specific APIs:
- `<canvas>` element and WebGL/Canvas2D contexts
- WebAssembly (WASM) runtime
- `window`, `document`, and DOM APIs

### Solutions

#### 1. Dynamic Import with SSR Disabled (Next.js)

```typescript
// components/RiveAnimation.tsx (client-only component)
'use client'; // Next.js 13+ App Router

import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export const RiveAnimation = () => {
  const { RiveComponent } = useRive({
    src: '/animations/hero.riv',
    layout: new Layout({ fit: Fit.Cover }),
    autoplay: true
  });

  return <RiveComponent />;
};

// app/page.tsx (server component)
import dynamic from 'next/dynamic';

const RiveAnimation = dynamic(
  () => import('@/components/RiveAnimation').then(mod => ({ default: mod.RiveAnimation })),
  { ssr: false } // Disable SSR for this component
);

export default function HomePage() {
  return (
    <div>
      <h1>Welcome</h1>
      <RiveAnimation />
    </div>
  );
}
```

#### 2. Conditional Rendering (Client-Side Check)

```typescript
import { useEffect, useState } from 'react';
import { useRive, Layout, Fit } from '@rive-app/react-canvas';

export const SafeRiveComponent = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { RiveComponent } = useRive({
    src: '/animations/demo.riv',
    layout: new Layout({ fit: Fit.Contain }),
    autoplay: true
  });

  if (!isClient) {
    return <div className="rive-placeholder">Loading animation...</div>;
  }

  return <RiveComponent />;
};
```

#### 3. React.lazy + Suspense

```typescript
import { lazy, Suspense } from 'react';

const RiveAnimation = lazy(() => import('./RiveAnimation'));

export const App = () => (
  <Suspense fallback={<div>Loading animation...</div>}>
    <RiveAnimation />
  </Suspense>
);
```

#### 4. Testing with JSDOM

For unit tests, mock the Rive runtime:

```typescript
// __mocks__/@rive-app/react-canvas.ts
export const useRive = jest.fn(() => ({
  rive: null,
  RiveComponent: () => <canvas data-testid="rive-canvas" />,
  canvas: null,
  container: null,
  setCanvasRef: jest.fn(),
  setContainerRef: jest.fn()
}));

export const Layout = jest.fn();
export const Fit = {
  Contain: 'contain',
  Cover: 'cover',
  Fill: 'fill'
};
export const Alignment = {
  Center: 'center',
  TopCenter: 'topCenter'
};
```

```typescript
// MyComponent.test.tsx
jest.mock('@rive-app/react-canvas');

import { render, screen } from '@testing-library/react';
import { MyRiveComponent } from './MyRiveComponent';

test('renders Rive component', () => {
  render(<MyRiveComponent />);
  expect(screen.getByTestId('rive-canvas')).toBeInTheDocument();
});
```

### Environment Detection

```typescript
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

export const canRunRive = (): boolean => {
  if (!isBrowser()) return false;

  // Check for required APIs
  const hasCanvas = 'HTMLCanvasElement' in window;
  const hasWebAssembly = 'WebAssembly' in window;

  return hasCanvas && hasWebAssembly;
};

// Usage
if (canRunRive()) {
  // Render Rive component
} else {
  // Render fallback
}
```

---

## Best Practices

### 1. Layout Configuration

✅ **Do**:
- Use `Fit.Contain` for most use cases (preserves aspect ratio, no clipping)
- Use `Fit.Cover` for full-bleed backgrounds
- Combine fit modes with appropriate alignment
- Test across different screen sizes and aspect ratios

❌ **Don't**:
- Use `Fit.Fill` unless distortion is acceptable
- Forget to specify layout when default behavior isn't suitable
- Change layout configuration dynamically without re-instantiating

### 2. Resize Handling

✅ **Do**:
- Use `setContainerRef` for automatic resize handling
- Call `rive.cleanup()` on component unmount
- Use `ResizeObserver` for container-based resizing
- Handle device pixel ratio changes for zoom support

❌ **Don't**:
- Forget to call `resizeDrawingSurfaceToCanvas()` with `Fit.Layout`
- Create resize listeners without cleanup
- Resize on every animation frame (performance issue)

### 3. Performance Optimization

✅ **Do**:
- Use `shouldUseIntersectionObserver: true` to pause offscreen animations
- Enable `useOffscreenRenderer: true` for multiple animations (shared WebGL context)
- Set appropriate `useDevicePixelRatio` for your use case
- Lazy load Rive components in large applications

❌ **Don't**:
- Render dozens of simultaneous animations without offscreen detection
- Use custom pixel ratios without testing performance
- Load Rive assets synchronously in critical render paths

### 4. SSR/Next.js Integration

✅ **Do**:
- Use `dynamic()` with `{ ssr: false }` for Next.js
- Provide meaningful loading fallbacks
- Use 'use client' directive for App Router components
- Mock Rive in test environments

❌ **Don't**:
- Import Rive directly in server components
- Forget to handle the loading state
- Assume Rive will work in Node.js environments

### 5. Accessibility

✅ **Do**:
- Provide `aria-label` for canvas elements
- Add text alternatives for critical content
- Test with keyboard navigation
- Respect `prefers-reduced-motion`

```typescript
const { RiveComponent } = useRive({
  src: '/animations/hero.riv',
  layout: new Layout({ fit: Fit.Cover }),
  autoplay: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
});

return (
  <RiveComponent
    aria-label="Hero animation showing product features"
    role="img"
  />
);
```

### 6. Error Handling

✅ **Do**:
- Handle `onLoadError` callback
- Provide fallback UI for failed loads
- Log errors for debugging

```typescript
const [loadError, setLoadError] = useState<Error | null>(null);

const { RiveComponent } = useRive({
  src: '/animations/hero.riv',
  onLoadError: (err) => {
    console.error('Rive load error:', err);
    setLoadError(err);
  }
});

if (loadError) {
  return <div className="error">Animation failed to load</div>;
}

return <RiveComponent />;
```

---

## Code Examples

### Example 1: Responsive Hero Section

```typescript
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect, useState } from 'react';

export const ResponsiveHero = () => {
  const [fit, setFit] = useState<Fit>(Fit.Cover);

  // Adjust fit mode based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setFit(Fit.Contain);
      } else {
        setFit(Fit.Cover);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { RiveComponent, rive } = useRive({
    src: '/animations/hero.riv',
    stateMachines: ['HeroSM'],
    layout: new Layout({
      fit,
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  useEffect(() => {
    return () => rive?.cleanup();
  }, [rive]);

  return (
    <section className="hero-section">
      <RiveComponent className="hero-animation" />
      <div className="hero-content">
        <h1>Welcome to Our Product</h1>
        <button>Get Started</button>
      </div>
    </section>
  );
};
```

**CSS**:
```css
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.hero-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

### Example 2: Interactive Card with Dynamic Layout

```typescript
import { useRive, Layout, Fit, Alignment, useStateMachineInput } from '@rive-app/react-canvas';
import { useState } from 'react';

interface InteractiveCardProps {
  src: string;
  title: string;
  description: string;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  src,
  title,
  description
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: ['CardSM'],
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  const hoverInput = useStateMachineInput(rive, 'CardSM', 'isHover');

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverInput) hoverInput.value = true;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverInput) hoverInput.value = false;
  };

  return (
    <div
      className={`card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-animation">
        <RiveComponent />
      </div>
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};
```

### Example 3: Loading Spinner with FitHeight

```typescript
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium'
}) => {
  const { RiveComponent } = useRive({
    src: '/animations/loading-spinner.riv',
    animations: ['Spin'],
    layout: new Layout({
      fit: Fit.ScaleDown,
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  const sizeMap = {
    small: '32px',
    medium: '64px',
    large: '128px'
  };

  return (
    <div
      className="loading-spinner"
      style={{
        width: sizeMap[size],
        height: sizeMap[size]
      }}
    >
      <RiveComponent />
    </div>
  );
};
```

### Example 4: Multi-Artboard Responsive Layout

```typescript
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useState, useEffect } from 'react';

export const MultiArtboardAnimation = () => {
  const [artboard, setArtboard] = useState('Desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setArtboard('Mobile');
      } else if (width < 1024) {
        setArtboard('Tablet');
      } else {
        setArtboard('Desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { RiveComponent, rive } = useRive({
    src: '/animations/multi-artboard.riv',
    artboard, // Dynamically selected artboard
    stateMachines: ['MainSM'],
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center
    }),
    autoplay: true
  });

  useEffect(() => {
    return () => rive?.cleanup();
  }, [rive]);

  return (
    <div className="responsive-animation">
      <RiveComponent />
    </div>
  );
};
```

### Example 5: Custom Bounds Configuration

```typescript
import { useRive, Layout, Fit } from '@rive-app/react-canvas';

export const CustomBoundsExample = () => {
  const { RiveComponent } = useRive({
    src: '/animations/custom-bounds.riv',
    layout: new Layout({
      fit: Fit.Contain,
      // Render within specific pixel bounds
      minX: 100,
      minY: 100,
      maxX: 700,
      maxY: 500
    }),
    autoplay: true
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '800px',
        height: '600px',
        border: '2px solid #ccc'
      }}
    >
      <RiveComponent />
      <div
        style={{
          position: 'absolute',
          top: '100px',
          left: '100px',
          width: '600px',
          height: '400px',
          border: '1px dashed red',
          pointerEvents: 'none'
        }}
      >
        <span style={{ fontSize: '12px', color: 'red' }}>Render Area</span>
      </div>
    </div>
  );
};
```

### Example 6: Generated Component Template

```typescript
// Generated by Rive MCP Server
import React, { useEffect } from "react";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";

export interface HeroAnimationProps {
  // Layout configuration
  fit?: Fit;
  alignment?: Alignment;
  className?: string;

  // State machine inputs
  scrollProgress: number;
  isVisible: boolean;

  // Event handlers
  onComplete?: (payload: any) => void;
}

/**
 * HeroAnimation - A Rive-powered component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * @component
 */
export const HeroAnimation: React.FC<HeroAnimationProps> = ({
  fit = Fit.Contain,
  alignment = Alignment.Center,
  className,
  scrollProgress,
  isVisible,
  onComplete
}) => {
  const { rive, RiveComponent } = useRive({
    src: "/animations/hero-animation.riv",
    stateMachines: ["MainSM"],
    layout: new Layout({ fit, alignment }),
    autoplay: true
  });

  // State machine inputs
  const scrollProgressInput = useStateMachineInput(rive, "MainSM", "scrollProgress");
  const isVisibleInput = useStateMachineInput(rive, "MainSM", "isVisible");

  // Sync input values
  useEffect(() => {
    if (scrollProgressInput) scrollProgressInput.value = scrollProgress;
  }, [scrollProgress, scrollProgressInput]);

  useEffect(() => {
    if (isVisibleInput) isVisibleInput.value = isVisible;
  }, [isVisible, isVisibleInput]);

  // Event handler
  useEffect(() => {
    if (!rive || !onComplete) return;

    const handler = (riveEvent: any) => {
      if (riveEvent.data?.name === "Complete") {
        onComplete(riveEvent.data);
      }
    };

    rive.on("event", handler);
    return () => {
      rive.off("event", handler);
    };
  }, [rive, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => rive?.cleanup();
  }, [rive]);

  return (
    <div className={className || "hero-animation-wrapper"}>
      <RiveComponent />
    </div>
  );
};
```

---

## References

### Official Documentation

- **Layout Guide**: https://rive.app/docs/runtimes/layout
- **React Runtime**: https://rive.app/docs/runtimes/react/react
- **Parameters & Return Values**: https://rive.app/docs/runtimes/react/parameters-and-return-values
- **Web (JS) Runtime**: https://rive.app/docs/runtimes/web/web-js
- **FAQ**: https://rive.app/docs/runtimes/web/faq

### GitHub Resources

- **rive-react Repository**: https://github.com/rive-app/rive-react
- **Type Definitions**: https://github.com/rive-app/rive-react/blob/main/src/types.ts
- **Examples**: https://github.com/rive-app/rive-react (Storybook)

### Package Versions

- **@rive-app/react-canvas**: 4.23.3 (latest as of 2025-11-09)
- **@rive-app/canvas**: 2.x
- **@rive-app/canvas-advanced**: 2.19.8+

### Additional Resources

- **Optimization Techniques**: https://pixelpoint.io/blog/rive-react-optimizations/
- **Next.js Integration**: Use `next/dynamic` with `{ ssr: false }`
- **Community Forum**: https://community.rive.app/

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-09 | Initial specification document |

---

## Contributors

- Research Team
- Based on official Rive documentation and community resources

---

## License

This specification document is part of the AstralisMotion Rive MCP Server project.
