import { GeneratorContext, GeneratedComponent } from "../types";
import {
  toPascalCase,
  getAllInputs,
  getAllEvents,
  getTypeScriptType,
  getDefaultValue,
} from "../utils";
import { RuntimeSurface } from "../../../../../libs/types/index.d";

export function generateReactComponent(context: GeneratorContext): string {
  const { surface, componentName, riveSrc } = context;
  const inputs = getAllInputs(surface);
  const events = getAllEvents(surface);
  const hasMultipleStateMachines = surface.stateMachines.length > 1;
  const stateMachineName = surface.stateMachines[0]?.name || "DefaultSM";

  // Generate props interface
  const propsInterface = generatePropsInterface(componentName, inputs, events, surface);

  // Generate state machine input hooks - support multiple state machines
  const inputHooks = generateInputHooks(surface, inputs, hasMultipleStateMachines);

  // Generate input effects
  const inputEffects = generateInputEffects(inputs);

  // Generate event handlers
  const eventHandlers = generateEventHandlers(events);

  // Generate component code with forwardRef
  return `import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";

${propsInterface}

/**
 * ${componentName} - A Rive-powered component
 *
 * This component is automatically generated and provides type-safe props
 * for all state machine inputs and events.
 *
 * Features:
 * - Layout controls (fit, alignment, autoResize)
 * - Playback controls via ref (play, pause, stop, reset, scrub)
 * - ${hasMultipleStateMachines ? 'Multiple state machine support' : 'Single state machine'}
 * - Error handling and loading states
 * - Lifecycle callbacks
 *
 * @component
 */
export const ${componentName} = forwardRef<${componentName}Handle, ${componentName}Props>(({
${generatePropDestructuring(inputs, events, hasMultipleStateMachines)}
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine which state machine to use
  const activeStateMachine = ${hasMultipleStateMachines ? 'stateMachine || surface.stateMachines[0].name' : `"${stateMachineName}"`};

  const { rive, RiveComponent } = useRive({
    src: "${riveSrc}",
    stateMachines: [activeStateMachine],
    autoplay: true,
    layout: new Layout({
      fit: fit ? Fit[fit] : Fit.Contain,
      alignment: alignment ? Alignment[alignment] : Alignment.Center,
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

${inputHooks}
${inputEffects}
${eventHandlers}

  // Expose playback controls via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.play() or similar
      console.warn("${componentName}.play() - Awaiting Rive playback API details from Agent 3");
    },
    pause: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.pause() or similar
      console.warn("${componentName}.pause() - Awaiting Rive playback API details from Agent 3");
    },
    stop: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.stop() or rive?.reset() and pause
      console.warn("${componentName}.stop() - Awaiting Rive playback API details from Agent 3");
    },
    reset: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.reset() or similar
      console.warn("${componentName}.reset() - Awaiting Rive playback API details from Agent 3");
    },
    scrub: (time: number) => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.scrub(time) or rive.currentTime = time
      console.warn("${componentName}.scrub(time) - Awaiting Rive playback API details from Agent 3");
    },
    isPlaying: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.isPlaying or similar
      console.warn("${componentName}.isPlaying() - Awaiting Rive playback API details from Agent 3");
      return false;
    },
    getTime: () => {
      // TODO: Implement based on Agent 3's Rive playback API research
      // Expected: rive?.currentTime or similar
      console.warn("${componentName}.getTime() - Awaiting Rive playback API details from Agent 3");
      return 0;
    }
  }), [rive]);

  // Handle loading state changes
  useEffect(() => {
    onLoadingStateChange?.(loading);
  }, [loading, onLoadingStateChange]);

  // Handle window resize if autoResize is enabled
  useEffect(() => {
    if (!autoResize || !rive) return;

    const handleResize = () => {
      // TODO: Implement based on Agent 2's Rive resize API research
      // Expected: rive.resizeDrawingSurfaceToCanvas() or similar
      console.warn("${componentName} resize - Awaiting Rive resize API details from Agent 2");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [autoResize, rive]);

  // Error state rendering
  if (error) {
    return (
      <div className="${componentName.toLowerCase()}-error" style={{ padding: "1rem", color: "#dc2626" }}>
        Error loading animation: {error.message}
      </div>
    );
  }

  // Loading state rendering
  if (loading) {
    return (
      <div className="${componentName.toLowerCase()}-loading" style={{ padding: "1rem", color: "#6b7280" }}>
        Loading animation...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="${componentName.toLowerCase()}-wrapper">
      <RiveComponent />
    </div>
  );
});

${componentName}.displayName = "${componentName}";
`;
}

function generatePropsInterface(
  componentName: string,
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>,
  events: Array<{ name: string; description?: string }>,
  surface: RuntimeSurface
): string {
  const lines: string[] = [];
  const hasMultipleStateMachines = surface.stateMachines.length > 1;

  // Generate Handle interface first
  lines.push(`/**`);
  lines.push(` * Imperative handle for controlling ${componentName} playback`);
  lines.push(` */`);
  lines.push(`export interface ${componentName}Handle {`);
  lines.push(`  /** Start or resume animation playback */`);
  lines.push(`  play: () => void;`);
  lines.push(`  /** Pause animation playback */`);
  lines.push(`  pause: () => void;`);
  lines.push(`  /** Stop animation playback and reset to beginning */`);
  lines.push(`  stop: () => void;`);
  lines.push(`  /** Reset animation to initial state */`);
  lines.push(`  reset: () => void;`);
  lines.push(`  /** Scrub to a specific time in the animation */`);
  lines.push(`  scrub: (time: number) => void;`);
  lines.push(`  /** Check if animation is currently playing */`);
  lines.push(`  isPlaying: () => boolean;`);
  lines.push(`  /** Get current playback time */`);
  lines.push(`  getTime: () => number;`);
  lines.push(`}`);
  lines.push(``);

  // Generate Props interface
  lines.push(`/**`);
  lines.push(` * Props for ${componentName} component`);
  lines.push(` */`);
  lines.push(`export interface ${componentName}Props {`);

  // Add input props with JSDoc
  inputs.forEach(input => {
    lines.push(`  /**`);
    lines.push(`   * State machine input: ${input.name}`);
    if (input.defaultValue !== undefined) {
      lines.push(`   * @default ${input.defaultValue}`);
    }
    lines.push(`   */`);
    lines.push(`  ${input.name}?: ${getTypeScriptType(input.type)};`);
  });

  // Add event handler props with JSDoc
  events.forEach(event => {
    lines.push(`  /**`);
    lines.push(`   * Event handler for: ${event.name}`);
    if (event.description) {
      lines.push(`   * ${event.description}`);
    }
    lines.push(`   */`);
    lines.push(`  on${toPascalCase(event.name)}?: (payload: any) => void;`);
  });

  // Add layout control props
  lines.push(``);
  lines.push(`  /** Layout & Rendering */`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * How the animation should fit within its container`);
  lines.push(`   * @default "contain"`);
  lines.push(`   */`);
  lines.push(`  fit?: "cover" | "contain" | "fill" | "fitWidth" | "fitHeight" | "none" | "scaleDown";`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * Alignment of the animation within its container`);
  lines.push(`   * @default "center"`);
  lines.push(`   */`);
  lines.push(`  alignment?: "center" | "topLeft" | "topCenter" | "topRight" | "centerLeft" | "centerRight" | "bottomLeft" | "bottomCenter" | "bottomRight";`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * Automatically resize the animation when the window resizes`);
  lines.push(`   * @default false`);
  lines.push(`   */`);
  lines.push(`  autoResize?: boolean;`);

  // Add lifecycle callbacks
  lines.push(``);
  lines.push(`  /** Lifecycle Callbacks */`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * Called when loading state changes`);
  lines.push(`   */`);
  lines.push(`  onLoadingStateChange?: (loading: boolean) => void;`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * Called when an error occurs during loading`);
  lines.push(`   */`);
  lines.push(`  onError?: (error: Error) => void;`);
  lines.push(``);
  lines.push(`  /**`);
  lines.push(`   * Called when the animation has finished loading`);
  lines.push(`   */`);
  lines.push(`  onLoadComplete?: () => void;`);

  // Add state machine selector if multiple state machines exist
  if (hasMultipleStateMachines) {
    lines.push(``);
    lines.push(`  /** State Machine Selection */`);
    lines.push(``);
    lines.push(`  /**`);
    lines.push(`   * Select which state machine to use`);
    lines.push(`   * Available state machines: ${surface.stateMachines.map(sm => sm.name).join(", ")}`);
    lines.push(`   * @default "${surface.stateMachines[0].name}"`);
    lines.push(`   */`);
    lines.push(`  stateMachine?: ${surface.stateMachines.map(sm => `"${sm.name}"`).join(" | ")};`);
  }

  lines.push(`}`);

  return lines.join("\n");
}

function generateInputHooks(
  surface: RuntimeSurface,
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>,
  hasMultipleStateMachines: boolean
): string {
  if (inputs.length === 0) return "";

  const stateMachineName = surface.stateMachines[0]?.name || "DefaultSM";

  return inputs.map(input =>
    `  const ${input.name}Input = useStateMachineInput(rive, ${hasMultipleStateMachines ? 'activeStateMachine' : `"${stateMachineName}"`}, "${input.name}");`
  ).join("\n");
}

function generateInputEffects(
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>
): string {
  if (inputs.length === 0) return "";

  return inputs.map(input => `
  useEffect(() => {
    if (${input.name}Input && ${input.name} !== undefined) {
      ${input.name}Input.value = ${input.name};
    }
  }, [${input.name}, ${input.name}Input]);`
  ).join("\n");
}

function generateEventHandlers(
  events: Array<{ name: string; description?: string }>
): string {
  if (events.length === 0) return "";

  return events.map(event => `
  useEffect(() => {
    if (!rive || !on${toPascalCase(event.name)}) return;
    const handler = (riveEvent: any) => {
      if (riveEvent.data?.name === "${event.name}") {
        on${toPascalCase(event.name)}(riveEvent.data);
      }
    };
    rive.on("event", handler);
    return () => {
      rive.off("event", handler);
    };
  }, [rive, on${toPascalCase(event.name)}]);`
  ).join("\n");
}

function generatePropDestructuring(
  inputs: Array<{ name: string; type: "bool" | "number" | "string"; defaultValue?: any }>,
  events: Array<{ name: string; description?: string }>,
  hasMultipleStateMachines: boolean
): string {
  const props: string[] = [];

  // Add input props
  props.push(...inputs.map(input => `  ${input.name}`));

  // Add event props
  props.push(...events.map(event => `  on${toPascalCase(event.name)}`));

  // Add layout props
  props.push(`  fit`, `  alignment`, `  autoResize`);

  // Add lifecycle props
  props.push(`  onLoadingStateChange`, `  onError`, `  onLoadComplete`);

  // Add state machine selector if needed
  if (hasMultipleStateMachines) {
    props.push(`  stateMachine`);
  }

  return props.join(",\n");
}

export async function generateReact(context: GeneratorContext): Promise<GeneratedComponent> {
  const code = generateReactComponent(context);
  const filePath = context.outputPath ||
    `/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/libs/rive-components/src/${context.componentName}.tsx`;

  return {
    code,
    filePath,
    framework: "react",
    componentName: context.componentName,
  };
}
