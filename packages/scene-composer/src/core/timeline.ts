/**
 * Timeline Management System
 *
 * Handles time-based orchestration of multiple Rive components,
 * including keyframe interpolation, playback control, and synchronization.
 */

import type {
  Timeline,
  TimelineTrack,
  Keyframe,
  EasingFunction,
} from '../types/scene-spec';
import { SceneGraph, SceneNode } from './scene-graph';

/**
 * Easing function implementations
 */
export class EasingFunctions {
  static linear(t: number): number {
    return t;
  }

  static ease(t: number): number {
    return this.cubicBezier(0.25, 0.1, 0.25, 1.0, t);
  }

  static easeIn(t: number): number {
    return this.cubicBezier(0.42, 0, 1.0, 1.0, t);
  }

  static easeOut(t: number): number {
    return this.cubicBezier(0, 0, 0.58, 1.0, t);
  }

  static easeInOut(t: number): number {
    return this.cubicBezier(0.42, 0, 0.58, 1.0, t);
  }

  /**
   * Parse and evaluate CSS cubic-bezier easing
   */
  static cubicBezier(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number
  ): number {
    // Simplified cubic bezier calculation
    // For production, use a proper bezier solver
    const cx = 3.0 * x1;
    const bx = 3.0 * (x2 - x1) - cx;
    const ax = 1.0 - cx - bx;

    const cy = 3.0 * y1;
    const by = 3.0 * (y2 - y1) - cy;
    const ay = 1.0 - cy - by;

    const tSquared = t * t;
    const tCubed = tSquared * t;

    return ay * tCubed + by * tSquared + cy * t;
  }

  /**
   * Resolve easing function from string
   */
  static resolve(easing: EasingFunction): (t: number) => number {
    if (typeof easing === 'function') {
      return easing;
    }

    switch (easing) {
      case 'linear':
        return this.linear;
      case 'ease':
        return this.ease;
      case 'ease-in':
        return this.easeIn;
      case 'ease-out':
        return this.easeOut;
      case 'ease-in-out':
        return this.easeInOut;
      default:
        // Parse cubic-bezier(x1, y1, x2, y2)
        const match = easing.match(
          /cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/
        );
        if (match) {
          const [, x1, y1, x2, y2] = match.map(parseFloat);
          return (t: number) => this.cubicBezier(x1, y1, x2, y2, t);
        }
        return this.linear;
    }
  }
}

/**
 * Keyframe interpolator
 */
export class KeyframeInterpolator {
  private keyframes: Keyframe[];
  private easingCache: Map<string, (t: number) => number> = new Map();

  constructor(keyframes: Keyframe[]) {
    this.keyframes = [...keyframes].sort((a, b) => a.time - b.time);
  }

  /**
   * Get interpolated value at specific time
   */
  getValueAt(time: number, property: string): any {
    const propertyKeyframes = this.keyframes.filter(
      (kf) => kf.property === property
    );

    if (propertyKeyframes.length === 0) {
      return undefined;
    }

    // Before first keyframe
    if (time <= propertyKeyframes[0].time) {
      return propertyKeyframes[0].value;
    }

    // After last keyframe
    const lastKf = propertyKeyframes[propertyKeyframes.length - 1];
    if (time >= lastKf.time) {
      return lastKf.value;
    }

    // Find surrounding keyframes
    let startKf: Keyframe | null = null;
    let endKf: Keyframe | null = null;

    for (let i = 0; i < propertyKeyframes.length - 1; i++) {
      if (
        propertyKeyframes[i].time <= time &&
        propertyKeyframes[i + 1].time >= time
      ) {
        startKf = propertyKeyframes[i];
        endKf = propertyKeyframes[i + 1];
        break;
      }
    }

    if (!startKf || !endKf) {
      return lastKf.value;
    }

    // Calculate interpolation factor
    const duration = endKf.time - startKf.time;
    const elapsed = time - startKf.time;
    let t = duration > 0 ? elapsed / duration : 0;

    // Apply easing
    if (endKf.easing) {
      const easingFn = this.getEasingFunction(endKf.easing);
      t = easingFn(t);
    }

    // Interpolate based on value type
    return this.interpolate(startKf.value, endKf.value, t);
  }

  /**
   * Interpolate between two values
   */
  private interpolate(start: any, end: any, t: number): any {
    // Number interpolation
    if (typeof start === 'number' && typeof end === 'number') {
      return start + (end - start) * t;
    }

    // Object interpolation (for positions, etc.)
    if (typeof start === 'object' && typeof end === 'object') {
      const result: any = {};
      for (const key in start) {
        if (key in end) {
          result[key] = this.interpolate(start[key], end[key], t);
        } else {
          result[key] = start[key];
        }
      }
      return result;
    }

    // String/boolean - no interpolation
    return t < 0.5 ? start : end;
  }

  /**
   * Get cached easing function
   */
  private getEasingFunction(easing: EasingFunction): (t: number) => number {
    const key = typeof easing === 'string' ? easing : 'custom';
    if (!this.easingCache.has(key)) {
      this.easingCache.set(key, EasingFunctions.resolve(easing));
    }
    return this.easingCache.get(key)!;
  }
}

/**
 * Timeline player
 */
export class TimelinePlayer {
  private timeline: Timeline;
  private sceneGraph: SceneGraph;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private animationFrameId: number | null = null;
  private trackInterpolators: Map<string, KeyframeInterpolator> = new Map();
  private eventCallbacks: Map<string, ((data: any) => void)[]> = new Map();

  constructor(timeline: Timeline, sceneGraph: SceneGraph) {
    this.timeline = timeline;
    this.sceneGraph = sceneGraph;
    this.initializeInterpolators();
  }

  /**
   * Initialize keyframe interpolators for each track
   */
  private initializeInterpolators(): void {
    for (const track of this.timeline.tracks) {
      if (track.keyframes.length > 0) {
        this.trackInterpolators.set(
          track.componentName,
          new KeyframeInterpolator(track.keyframes)
        );
      }
    }
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.startTime = performance.now() - this.pausedTime;
    this.tick();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    this.pausedTime = this.currentTime;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    this.pause();
    this.currentTime = 0;
    this.pausedTime = 0;
    this.seek(0);
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.timeline.duration));
    this.pausedTime = this.currentTime;
    this.startTime = performance.now() - this.currentTime;
    this.updateScene(this.currentTime);
  }

  /**
   * Main animation loop
   */
  private tick = (): void => {
    if (!this.isPlaying) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.currentTime = elapsed * (this.timeline.playbackRate ?? 1);

    // Handle looping
    if (this.currentTime >= this.timeline.duration) {
      if (this.timeline.loop) {
        this.currentTime = this.currentTime % this.timeline.duration;
        this.startTime = now - this.currentTime;
      } else {
        this.pause();
        this.emit('complete', {});
        return;
      }
    }

    this.updateScene(this.currentTime);
    this.processTriggers(this.currentTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Update scene based on current timeline position
   */
  private updateScene(time: number): void {
    for (const track of this.timeline.tracks) {
      const interpolator = this.trackInterpolators.get(track.componentName);
      if (!interpolator) {
        continue;
      }

      const node = this.sceneGraph.getNode(track.componentName);
      if (!node) {
        continue;
      }

      // Get all unique properties from keyframes
      const properties = new Set(
        track.keyframes.map((kf) => kf.property)
      );

      for (const property of properties) {
        const value = interpolator.getValueAt(time, property);
        if (value !== undefined) {
          this.applyPropertyValue(node, property, value);
        }
      }
    }
  }

  /**
   * Apply interpolated value to scene node property
   */
  private applyPropertyValue(
    node: SceneNode,
    property: string,
    value: any
  ): void {
    const parts = property.split('.');

    if (parts[0] === 'transform') {
      const transformProp = parts.slice(1).join('.');
      const currentTransform = node.transform;

      if (transformProp === 'position.x') {
        node.setTransform({
          position: { ...(currentTransform.position ?? { x: 0, y: 0 }), x: value },
        });
      } else if (transformProp === 'position.y') {
        node.setTransform({
          position: { ...(currentTransform.position ?? { x: 0, y: 0 }), y: value },
        });
      } else if (transformProp === 'opacity') {
        node.setTransform({ opacity: value });
      } else if (transformProp === 'rotation') {
        node.setTransform({ rotation: value });
      } else if (transformProp === 'scale.x') {
        node.setTransform({
          scale: { ...(currentTransform.scale ?? { x: 1, y: 1 }), x: value },
        });
      } else if (transformProp === 'scale.y') {
        node.setTransform({
          scale: { ...(currentTransform.scale ?? { x: 1, y: 1 }), y: value },
        });
      }
    } else if (property === 'visible') {
      node.visible = value;
    }
  }

  /**
   * Process timeline triggers at current time
   */
  private processTriggers(time: number): void {
    for (const track of this.timeline.tracks) {
      if (track.triggers) {
        for (const trigger of track.triggers) {
          // Check if trigger should fire (within current frame)
          const lastFrameTime = this.currentTime - (1000 / 60); // ~16ms
          if (trigger.time > lastFrameTime && trigger.time <= time) {
            this.emit(trigger.eventName, {
              componentName: track.componentName,
              time: trigger.time,
            });
          }
        }
      }
    }
  }

  /**
   * Register event listener
   */
  on(eventName: string, callback: (data: any) => void): void {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(eventName: string, callback: (data: any) => void): void {
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(eventName: string, data: any): void {
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  /**
   * Get current playback state
   */
  getState(): {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    progress: number;
  } {
    return {
      currentTime: this.currentTime,
      duration: this.timeline.duration,
      isPlaying: this.isPlaying,
      progress: this.currentTime / this.timeline.duration,
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.trackInterpolators.clear();
    this.eventCallbacks.clear();
  }
}
