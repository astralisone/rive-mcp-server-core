/**
 * Integration Tests for generateWrapper MCP Tool - React Generator Enhancements
 *
 * Tests the Phase 1 features:
 * - Layout controls (fit, alignment, autoResize)
 * - Playback controls via ref
 * - Multiple state machine support
 * - Error handling and loading states
 * - Lifecycle callbacks
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { generateReactComponent } from '../../src/generators/templates/react.template';
import { GeneratorContext } from '../../src/generators/types';

describe('generateWrapper MCP Tool - React Generator Phase 1', () => {
  let singleStateMachineSurface;
  let multipleStateMachineSurface;

  beforeAll(() => {
    // Single state machine component (Loading Spinner)
    singleStateMachineSurface = {
      componentId: 'ui-loading-spinner',
      stateMachines: [
        {
          name: 'LoadingStateMachine',
          inputs: [
            { name: 'isLoading', type: 'bool', defaultValue: true },
            { name: 'progress', type: 'number', defaultValue: 0 },
            { name: 'speed', type: 'number', defaultValue: 1.0 },
          ],
          events: [
            { name: 'LoadingStarted', description: 'Fired when loading begins' },
            { name: 'LoadingComplete', description: 'Fired when loading completes' },
          ],
        },
      ],
      runtimeVersion: 'web-v2.7.1',
    };

    // Multiple state machine component (Interactive Button)
    multipleStateMachineSurface = {
      componentId: 'ui-interactive-button',
      stateMachines: [
        {
          name: 'InteractionStateMachine',
          inputs: [
            { name: 'isPressed', type: 'bool', defaultValue: false },
            { name: 'isHovered', type: 'bool', defaultValue: false },
          ],
          events: [
            { name: 'ButtonClicked' },
            { name: 'HoverStart' },
          ],
        },
        {
          name: 'AnimationStateMachine',
          inputs: [
            { name: 'animationSpeed', type: 'number', defaultValue: 1.0 },
            { name: 'pulseEnabled', type: 'bool', defaultValue: false },
          ],
          events: [
            { name: 'AnimationComplete' },
          ],
        },
      ],
      runtimeVersion: 'web-v2.7.1',
    };
  });

  describe('Layout Controls', () => {
    it('should include fit prop in Props interface', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('fit?: "cover" | "contain" | "fill" | "fitWidth" | "fitHeight" | "none" | "scaleDown"');
      expect(code).toContain('How the animation should fit within its container');
      expect(code).toContain('@default "contain"');
    });

    it('should include alignment prop in Props interface', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('alignment?: "center" | "topLeft" | "topCenter" | "topRight" | "centerLeft" | "centerRight" | "bottomLeft" | "bottomCenter" | "bottomRight"');
      expect(code).toContain('Alignment of the animation within its container');
      expect(code).toContain('@default "center"');
    });

    it('should include autoResize prop in Props interface', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('autoResize?: boolean');
      expect(code).toContain('Automatically resize the animation when the window resizes');
      expect(code).toContain('@default false');
    });

    it('should destructure layout props in component', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('fit,');
      expect(code).toContain('alignment,');
      expect(code).toContain('autoResize,');
    });

    it('should use Layout, Fit, and Alignment imports from @rive-app/react-canvas', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas"');
    });

    it('should apply layout configuration to useRive hook', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('layout: new Layout({');
      expect(code).toContain('fit: fit ? Fit[fit] : Fit.Contain,');
      expect(code).toContain('alignment: alignment ? Alignment[alignment] : Alignment.Center,');
    });

    it('should include resize handler when autoResize is enabled', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('if (!autoResize || !rive) return;');
      expect(code).toContain('const handleResize = () => {');
      expect(code).toContain('window.addEventListener("resize", handleResize);');
      expect(code).toContain('return () => window.removeEventListener("resize", handleResize);');
      expect(code).toContain('Awaiting Rive resize API details from Agent 2');
    });
  });

  describe('Playback Controls', () => {
    it('should use forwardRef for component', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('forwardRef<LoadingSpinnerHandle, LoadingSpinnerProps>');
      expect(code).toContain('import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef }');
    });

    it('should generate Handle interface with all playback methods', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('export interface LoadingSpinnerHandle {');
      expect(code).toContain('play: () => void;');
      expect(code).toContain('pause: () => void;');
      expect(code).toContain('stop: () => void;');
      expect(code).toContain('reset: () => void;');
      expect(code).toContain('scrub: (time: number) => void;');
      expect(code).toContain('isPlaying: () => boolean;');
      expect(code).toContain('getTime: () => number;');
    });

    it('should include JSDoc for Handle interface methods', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('/** Start or resume animation playback */');
      expect(code).toContain('/** Pause animation playback */');
      expect(code).toContain('/** Stop animation playback and reset to beginning */');
      expect(code).toContain('/** Reset animation to initial state */');
      expect(code).toContain('/** Scrub to a specific time in the animation */');
      expect(code).toContain('/** Check if animation is currently playing */');
      expect(code).toContain('/** Get current playback time */');
    });

    it('should implement useImperativeHandle with all control methods', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('useImperativeHandle(ref, () => ({');
      expect(code).toContain('play: () => {');
      expect(code).toContain('pause: () => {');
      expect(code).toContain('stop: () => {');
      expect(code).toContain('reset: () => {');
      expect(code).toContain('scrub: (time: number) => {');
      expect(code).toContain('isPlaying: () => {');
      expect(code).toContain('getTime: () => {');
    });

    it('should include TODO comments for Agent 3 API research', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('// TODO: Implement based on Agent 3\'s Rive playback API research');
      expect(code).toContain('Awaiting Rive playback API details from Agent 3');
    });

    it('should set displayName for better debugging', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('LoadingSpinner.displayName = "LoadingSpinner";');
    });
  });

  describe('Error Handling and Loading States', () => {
    it('should include error and loading state management', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('const [loading, setLoading] = useState(true);');
      expect(code).toContain('const [error, setError] = useState<Error | null>(null);');
    });

    it('should handle onLoad callback', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('onLoad: () => {');
      expect(code).toContain('setLoading(false);');
      expect(code).toContain('onLoadComplete?.();');
    });

    it('should handle onLoadError callback', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('onLoadError: (err: any) => {');
      expect(code).toContain('const errorObj = err instanceof Error ? err : new Error(String(err));');
      expect(code).toContain('setError(errorObj);');
      expect(code).toContain('onError?.(errorObj);');
    });

    it('should render error state UI', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('if (error) {');
      expect(code).toContain('<div className="loadingspinner-error"');
      expect(code).toContain('Error loading animation: {error.message}');
    });

    it('should render loading state UI', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('if (loading) {');
      expect(code).toContain('<div className="loadingspinner-loading"');
      expect(code).toContain('Loading animation...');
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('should include onLoadingStateChange callback in Props', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('onLoadingStateChange?: (loading: boolean) => void;');
      expect(code).toContain('Called when loading state changes');
    });

    it('should include onError callback in Props', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('onError?: (error: Error) => void;');
      expect(code).toContain('Called when an error occurs during loading');
    });

    it('should include onLoadComplete callback in Props', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('onLoadComplete?: () => void;');
      expect(code).toContain('Called when the animation has finished loading');
    });

    it('should call onLoadingStateChange when loading state changes', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('useEffect(() => {');
      expect(code).toContain('onLoadingStateChange?.(loading);');
      expect(code).toContain('}, [loading, onLoadingStateChange]);');
    });
  });

  describe('Multiple State Machine Support', () => {
    it('should detect multiple state machines', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      // Should include state machine selector prop
      expect(code).toContain('stateMachine?:');
      expect(code).toContain('"InteractionStateMachine" | "AnimationStateMachine"');
    });

    it('should include all state machines in selector prop', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('Available state machines: InteractionStateMachine, AnimationStateMachine');
      expect(code).toContain('@default "InteractionStateMachine"');
    });

    it('should use activeStateMachine for input hooks when multiple SMs exist', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('const activeStateMachine = stateMachine || surface.stateMachines[0].name');
      expect(code).toContain('useStateMachineInput(rive, activeStateMachine,');
    });

    it('should collect inputs from all state machines', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      // Inputs from InteractionStateMachine
      expect(code).toContain('isPressed');
      expect(code).toContain('isHovered');

      // Inputs from AnimationStateMachine
      expect(code).toContain('animationSpeed');
      expect(code).toContain('pulseEnabled');
    });

    it('should collect events from all state machines', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      // Events from InteractionStateMachine
      expect(code).toContain('onButtonClicked');
      expect(code).toContain('onHoverStart');

      // Events from AnimationStateMachine
      expect(code).toContain('onAnimationComplete');
    });

    it('should use hardcoded state machine name for single SM', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('const activeStateMachine = "LoadingStateMachine"');
      expect(code).toContain('useStateMachineInput(rive, "LoadingStateMachine",');
    });

    it('should NOT include stateMachine prop for single SM', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).not.toContain('/** State Machine Selection */');
      expect(code).not.toContain('stateMachine?: "LoadingStateMachine"');
    });
  });

  describe('TypeScript Types and Interfaces', () => {
    it('should generate valid TypeScript interface syntax', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('export interface LoadingSpinnerHandle {');
      expect(code).toContain('export interface LoadingSpinnerProps {');
    });

    it('should make all input props optional', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('isLoading?: boolean;');
      expect(code).toContain('progress?: number;');
      expect(code).toContain('speed?: number;');
    });

    it('should include JSDoc comments for all props', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('/**');
      expect(code).toContain('* State machine input: isLoading');
      expect(code).toContain('* @default true');
      expect(code).toContain('*/');
    });

    it('should include section headers in Props interface', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('/** Layout & Rendering */');
      expect(code).toContain('/** Lifecycle Callbacks */');
    });
  });

  describe('Component Features Documentation', () => {
    it('should include features list in component JSDoc', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('* Features:');
      expect(code).toContain('* - Layout controls (fit, alignment, autoResize)');
      expect(code).toContain('* - Playback controls via ref (play, pause, stop, reset, scrub)');
      expect(code).toContain('* - Error handling and loading states');
      expect(code).toContain('* - Lifecycle callbacks');
    });

    it('should indicate single state machine in features for single SM components', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('* - Single state machine');
    });

    it('should indicate multiple state machines in features for multi-SM components', () => {
      const context = {
        surface: multipleStateMachineSurface,
        framework: 'react',
        componentName: 'InteractiveButton',
        riveSrc: '/animations/button.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('* - Multiple state machine support');
    });
  });

  describe('Input Handling', () => {
    it('should check for undefined before setting input values', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('if (isLoadingInput && isLoading !== undefined) {');
      expect(code).toContain('isLoadingInput.value = isLoading;');
    });
  });

  describe('Container and Refs', () => {
    it('should create a container ref', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('const containerRef = useRef<HTMLDivElement>(null);');
      expect(code).toContain('<div ref={containerRef}');
    });

    it('should add appropriate CSS class to wrapper', () => {
      const context = {
        surface: singleStateMachineSurface,
        framework: 'react',
        componentName: 'LoadingSpinner',
        riveSrc: '/animations/loading-spinner.riv',
      };

      const code = generateReactComponent(context);

      expect(code).toContain('className="loadingspinner-wrapper"');
    });
  });
});
