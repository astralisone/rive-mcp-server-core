/**
 * Event Router and Component Coordination
 *
 * Manages event connections between components, state-based orchestration,
 * and cross-component communication.
 */

import type {
  EventConnection,
  SceneState,
  Transition,
  SceneComposition,
} from '../types/scene-spec';
import { SceneGraph } from './scene-graph';

/**
 * Event data structure
 */
export interface SceneEvent {
  source: string; // Component name
  eventName: string;
  payload?: any;
  timestamp: number;
}

/**
 * Event router for managing component interactions
 */
export class EventRouter {
  private connections: EventConnection[] = [];
  private eventListeners: Map<string, Set<(event: SceneEvent) => void>> =
    new Map();
  private sceneGraph: SceneGraph;
  private eventQueue: SceneEvent[] = [];
  private isProcessing: boolean = false;

  constructor(sceneGraph: SceneGraph, connections: EventConnection[] = []) {
    this.sceneGraph = sceneGraph;
    this.connections = connections;
  }

  /**
   * Emit an event from a component
   */
  emit(source: string, eventName: string, payload?: any): void {
    const event: SceneEvent = {
      source,
      eventName,
      payload,
      timestamp: performance.now(),
    };

    this.eventQueue.push(event);
    this.processQueue();
  }

  /**
   * Process event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      await this.processEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: SceneEvent): Promise<void> {
    // Find matching connections
    const matchingConnections = this.connections.filter(
      (conn) =>
        conn.source.componentName === event.source &&
        conn.source.eventName === event.eventName
    );

    // Process each connection
    for (const connection of matchingConnections) {
      await this.executeConnection(connection, event);
    }

    // Notify listeners
    this.notifyListeners(event);
  }

  /**
   * Execute a connection action
   */
  private async executeConnection(
    connection: EventConnection,
    event: SceneEvent
  ): Promise<void> {
    // Apply delay if specified
    if (connection.delay && connection.delay > 0) {
      await this.delay(connection.delay);
    }

    // Transform event data if transformer provided
    let actionData = event.payload;
    if (connection.transform) {
      actionData = connection.transform(event.payload);
    }

    // Get target node
    const targetNode = this.sceneGraph.getNode(
      connection.target.componentName
    );
    if (!targetNode) {
      console.warn(
        `Target component not found: ${connection.target.componentName}`
      );
      return;
    }

    // Execute action based on type
    switch (connection.target.action) {
      case 'trigger':
        // Trigger an event on the target component
        this.emit(
          connection.target.componentName,
          connection.target.parameter || 'triggered',
          actionData
        );
        break;

      case 'setInput':
        // Set an input value on the target component
        if (connection.target.parameter) {
          targetNode.metadata.inputs = targetNode.metadata.inputs || {};
          targetNode.metadata.inputs[connection.target.parameter] =
            connection.target.value ?? actionData;
        }
        break;

      case 'setState':
        // Change state of target component
        if (connection.target.parameter) {
          targetNode.metadata.state = connection.target.parameter;
        }
        break;
    }
  }

  /**
   * Subscribe to events
   */
  on(
    eventPattern: string,
    callback: (event: SceneEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventPattern)) {
      this.eventListeners.set(eventPattern, new Set());
    }
    this.eventListeners.get(eventPattern)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventPattern);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: SceneEvent): void {
    // Exact match
    const exactKey = `${event.source}.${event.eventName}`;
    const exactListeners = this.eventListeners.get(exactKey);
    if (exactListeners) {
      for (const listener of exactListeners) {
        listener(event);
      }
    }

    // Wildcard source
    const wildcardKey = `*.${event.eventName}`;
    const wildcardListeners = this.eventListeners.get(wildcardKey);
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        listener(event);
      }
    }

    // All events
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      for (const listener of allListeners) {
        listener(event);
      }
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add new connection at runtime
   */
  addConnection(connection: EventConnection): void {
    this.connections.push(connection);
  }

  /**
   * Remove connection
   */
  removeConnection(connection: EventConnection): boolean {
    const index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.connections.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.eventListeners.clear();
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.eventQueue = [];
    this.clearListeners();
  }
}

/**
 * State machine for managing scene states and transitions
 */
export class SceneStateMachine {
  private states: Map<string, SceneState> = new Map();
  private transitions: Transition[] = [];
  private currentState: string;
  private sceneGraph: SceneGraph;
  private eventRouter: EventRouter;
  private transitionCallbacks: Set<
    (from: string, to: string) => void
  > = new Set();

  constructor(
    spec: SceneComposition,
    sceneGraph: SceneGraph,
    eventRouter: EventRouter
  ) {
    this.sceneGraph = sceneGraph;
    this.eventRouter = eventRouter;

    // Initialize states
    if (spec.states) {
      for (const state of spec.states) {
        this.states.set(state.name, state);
      }
    }

    // Initialize transitions
    if (spec.transitions) {
      this.transitions = spec.transitions;
    }

    // Set initial state
    this.currentState = spec.initialState || 'default';
    if (this.states.has(this.currentState)) {
      this.applyState(this.currentState);
    }
  }

  /**
   * Get current state name
   */
  getCurrentState(): string {
    return this.currentState;
  }

  /**
   * Transition to a new state
   */
  async transitionTo(targetState: string): Promise<boolean> {
    if (!this.states.has(targetState)) {
      console.warn(`State not found: ${targetState}`);
      return false;
    }

    // Find valid transition
    const transition = this.transitions.find(
      (t) =>
        (t.from === this.currentState || t.from === '*') && t.to === targetState
    );

    if (!transition) {
      console.warn(
        `No transition from ${this.currentState} to ${targetState}`
      );
      return false;
    }

    // Execute transition animations
    if (transition.animations) {
      await this.executeTransitionAnimations(transition);
    }

    // Notify callbacks
    const fromState = this.currentState;
    this.currentState = targetState;
    this.notifyTransition(fromState, targetState);

    // Apply new state
    this.applyState(targetState);

    return true;
  }

  /**
   * Apply state configuration to scene
   */
  private applyState(stateName: string): void {
    const state = this.states.get(stateName);
    if (!state) {
      return;
    }

    for (const compState of state.componentStates) {
      const node = this.sceneGraph.getNode(compState.componentName);
      if (!node) {
        continue;
      }

      // Apply transform
      if (compState.transform) {
        node.setTransform(compState.transform);
      }

      // Set metadata for state machine and inputs
      node.metadata.stateMachine = compState.stateMachine;
      node.metadata.state = compState.state;
      node.metadata.inputs = compState.inputs;
    }
  }

  /**
   * Execute transition animations
   */
  private async executeTransitionAnimations(
    transition: Transition
  ): Promise<void> {
    if (!transition.animations || transition.animations.length === 0) {
      return;
    }

    const startTime = performance.now();
    const duration = transition.duration;

    return new Promise<void>((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Apply easing
        let easedProgress = progress;
        if (transition.easing) {
          const easingFn =
            typeof transition.easing === 'string'
              ? this.getEasingFunction(transition.easing)
              : transition.easing;
          easedProgress = easingFn(progress);
        }

        // Update each animation
        for (const anim of transition.animations!) {
          const node = this.sceneGraph.getNode(anim.componentName);
          if (!node) {
            continue;
          }

          // Interpolate value
          const value = this.interpolate(
            anim.from ?? 0,
            anim.to,
            easedProgress
          );

          // Apply to property
          if (anim.property.startsWith('transform.')) {
            const prop = anim.property.substring(10); // Remove 'transform.'
            const transform: any = {};
            this.setNestedProperty(transform, prop, value);
            node.setTransform(transform);
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Simple linear interpolation
   */
  private interpolate(from: any, to: any, t: number): any {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }
    return t < 0.5 ? from : to;
  }

  /**
   * Set nested property value
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get easing function by name
   */
  private getEasingFunction(name: string): (t: number) => number {
    const easings: Record<string, (t: number) => number> = {
      linear: (t) => t,
      'ease-in': (t) => t * t,
      'ease-out': (t) => t * (2 - t),
      'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    };
    return easings[name] || easings.linear;
  }

  /**
   * Subscribe to state transitions
   */
  onTransition(callback: (from: string, to: string) => void): () => void {
    this.transitionCallbacks.add(callback);
    return () => {
      this.transitionCallbacks.delete(callback);
    };
  }

  /**
   * Notify transition callbacks
   */
  private notifyTransition(from: string, to: string): void {
    for (const callback of this.transitionCallbacks) {
      callback(from, to);
    }
  }

  /**
   * Check if transition is valid
   */
  canTransitionTo(targetState: string): boolean {
    if (!this.states.has(targetState)) {
      return false;
    }
    return this.transitions.some(
      (t) =>
        (t.from === this.currentState || t.from === '*') && t.to === targetState
    );
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): string[] {
    return this.transitions
      .filter((t) => t.from === this.currentState || t.from === '*')
      .map((t) => t.to);
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.transitionCallbacks.clear();
  }
}
