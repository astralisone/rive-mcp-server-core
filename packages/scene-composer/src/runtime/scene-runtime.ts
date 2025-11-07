/**
 * Scene Runtime
 *
 * Main runtime class for executing scene compositions.
 * Coordinates scene graph, timeline, event routing, and state management.
 */

import type {
  SceneComposition,
  SceneRuntimeConfig,
} from '../types/scene-spec';
import { SceneGraph } from '../core/scene-graph';
import { TimelinePlayer } from '../core/timeline';
import { EventRouter, SceneStateMachine } from '../core/event-router';
import { validateScene } from '../validation/scene-validator';

/**
 * Scene runtime execution engine
 */
export class SceneRuntime {
  private spec: SceneComposition;
  private canvas: HTMLCanvasElement;
  private config: SceneRuntimeConfig;

  // Core systems
  private sceneGraph: SceneGraph | null = null;
  private timeline: TimelinePlayer | null = null;
  private eventRouter: EventRouter | null = null;
  private stateMachine: SceneStateMachine | null = null;

  // State
  private initialized: boolean = false;
  private disposed: boolean = false;

  // Rive instances (placeholder for actual Rive integration)
  private riveInstances: Map<string, any> = new Map();

  constructor(config: SceneRuntimeConfig) {
    this.spec = config.spec;
    this.config = config;

    // Resolve canvas
    if (typeof config.canvas === 'string') {
      const element = document.querySelector(config.canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas not found: ${config.canvas}`);
      }
      this.canvas = element;
    } else {
      this.canvas = config.canvas;
    }
  }

  /**
   * Initialize the scene runtime
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Validate scene specification
      const validation = validateScene(this.spec);
      if (!validation.valid) {
        const errors = validation.errors
          .filter((e) => e.severity === 'error')
          .map((e) => `${e.path}: ${e.message}`)
          .join(', ');
        throw new Error(`Scene validation failed: ${errors}`);
      }

      // Initialize scene graph
      this.sceneGraph = new SceneGraph(this.spec);

      // Initialize event router
      this.eventRouter = new EventRouter(
        this.sceneGraph,
        this.spec.eventConnections || []
      );

      // Initialize state machine if states are defined
      if (this.spec.states && this.spec.states.length > 0) {
        this.stateMachine = new SceneStateMachine(
          this.spec,
          this.sceneGraph,
          this.eventRouter
        );

        // Subscribe to state changes
        this.stateMachine.onTransition((from, to) => {
          if (this.config.onStateChange) {
            this.config.onStateChange(from, to);
          }
        });
      }

      // Initialize timeline if defined
      if (this.spec.timeline) {
        this.timeline = new TimelinePlayer(
          this.spec.timeline,
          this.sceneGraph
        );

        // Subscribe to timeline events
        this.timeline.on('complete', () => {
          if (this.config.onEvent) {
            this.config.onEvent('timelineComplete', {});
          }
        });
      }

      // Subscribe to event router
      this.eventRouter.on('*', (event) => {
        if (this.config.onEvent) {
          this.config.onEvent(event.eventName, event.payload);
        }
      });

      // Load Rive components
      await this.loadComponents();

      // Apply initial inputs
      if (this.config.inputs) {
        this.setInputs(this.config.inputs);
      }

      // Auto-play if configured
      if (this.config.autoPlay && this.timeline) {
        this.timeline.play();
      }

      this.initialized = true;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Load Rive components
   */
  private async loadComponents(): Promise<void> {
    if (!this.sceneGraph) {
      throw new Error('Scene graph not initialized');
    }

    // Placeholder for actual Rive component loading
    // In production, this would load .riv files and create Rive instances
    const loadPromises = this.spec.components.map(async (component) => {
      // TODO: Integrate with actual Rive runtime
      // const rive = await loadRiveComponent(component.componentId);
      // this.riveInstances.set(component.name, rive);

      // For now, just create a placeholder
      this.riveInstances.set(component.name, {
        id: component.componentId,
        name: component.name,
        loaded: true,
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * Play timeline
   */
  play(): void {
    this.assertInitialized();
    if (this.timeline) {
      this.timeline.play();
    }
  }

  /**
   * Pause timeline
   */
  pause(): void {
    this.assertInitialized();
    if (this.timeline) {
      this.timeline.pause();
    }
  }

  /**
   * Stop timeline
   */
  stop(): void {
    this.assertInitialized();
    if (this.timeline) {
      this.timeline.stop();
    }
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.assertInitialized();
    if (this.timeline) {
      this.timeline.seek(time);
    }
  }

  /**
   * Get timeline state
   */
  getTimelineState(): {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    progress: number;
  } | null {
    this.assertInitialized();
    return this.timeline?.getState() || null;
  }

  /**
   * Set scene input
   */
  setInput(name: string, value: any): void {
    this.assertInitialized();

    // Find input definition
    const inputDef = this.spec.inputs?.find((inp) => inp.name === name);
    if (!inputDef) {
      console.warn(`Unknown input: ${name}`);
      return;
    }

    // Validate input
    if (inputDef.validation) {
      if (inputDef.validation.required && value === undefined) {
        throw new Error(`Input ${name} is required`);
      }

      if (typeof value === 'number') {
        if (
          inputDef.validation.min !== undefined &&
          value < inputDef.validation.min
        ) {
          throw new Error(
            `Input ${name} must be >= ${inputDef.validation.min}`
          );
        }
        if (
          inputDef.validation.max !== undefined &&
          value > inputDef.validation.max
        ) {
          throw new Error(
            `Input ${name} must be <= ${inputDef.validation.max}`
          );
        }
      }
    }

    // Emit input change event
    this.eventRouter?.emit('scene', 'inputChanged', { name, value });
  }

  /**
   * Set multiple inputs
   */
  setInputs(inputs: Record<string, any>): void {
    for (const [name, value] of Object.entries(inputs)) {
      this.setInput(name, value);
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): string | null {
    this.assertInitialized();
    return this.stateMachine?.getCurrentState() || null;
  }

  /**
   * Transition to new state
   */
  async transitionTo(state: string): Promise<boolean> {
    this.assertInitialized();
    if (!this.stateMachine) {
      console.warn('State machine not configured');
      return false;
    }
    return this.stateMachine.transitionTo(state);
  }

  /**
   * Check if transition is possible
   */
  canTransitionTo(state: string): boolean {
    this.assertInitialized();
    if (!this.stateMachine) {
      return false;
    }
    return this.stateMachine.canTransitionTo(state);
  }

  /**
   * Get available transitions
   */
  getAvailableTransitions(): string[] {
    this.assertInitialized();
    if (!this.stateMachine) {
      return [];
    }
    return this.stateMachine.getAvailableTransitions();
  }

  /**
   * Subscribe to events
   */
  on(eventName: string, callback: (data: any) => void): () => void {
    this.assertInitialized();
    if (!this.eventRouter) {
      return () => {};
    }
    return this.eventRouter.on(eventName, (event) => {
      callback(event.payload);
    });
  }

  /**
   * Emit custom event
   */
  emit(eventName: string, payload?: any): void {
    this.assertInitialized();
    this.eventRouter?.emit('scene', eventName, payload);
  }

  /**
   * Get scene graph (for debugging)
   */
  getSceneGraph(): SceneGraph | null {
    return this.sceneGraph;
  }

  /**
   * Get scene specification
   */
  getSpec(): SceneComposition {
    return this.spec;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    // Cleanup timeline
    this.timeline?.dispose();
    this.timeline = null;

    // Cleanup state machine
    this.stateMachine?.dispose();
    this.stateMachine = null;

    // Cleanup event router
    this.eventRouter?.dispose();
    this.eventRouter = null;

    // Cleanup scene graph
    this.sceneGraph?.dispose();
    this.sceneGraph = null;

    // Cleanup Rive instances
    for (const instance of this.riveInstances.values()) {
      // TODO: Properly dispose Rive instances
      // instance.dispose();
    }
    this.riveInstances.clear();

    this.disposed = true;
    this.initialized = false;
  }

  /**
   * Assert runtime is initialized
   */
  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('Runtime not initialized. Call initialize() first.');
    }
    if (this.disposed) {
      throw new Error('Runtime has been disposed');
    }
  }
}
