/**
 * Scene Composer Package
 *
 * Orchestrates multiple Rive animations into cohesive, synchronized scenes.
 */

// Core exports
export { SceneGraph, SceneNode } from './core/scene-graph';
export { TimelinePlayer, KeyframeInterpolator, EasingFunctions } from './core/timeline';
export { EventRouter, SceneStateMachine } from './core/event-router';
export type { SceneEvent } from './core/event-router';

// Runtime
export { SceneRuntime } from './runtime/scene-runtime';

// Validation
export { SceneValidator, validateScene } from './validation/scene-validator';

// Code generation
export { RuntimeGenerator, generateRuntimeCode } from './codegen/runtime-generator';
export type { CodeGenOptions, GeneratedCode } from './codegen/runtime-generator';

// Types
export type {
  SceneComposition,
  ComponentLayout,
  ComponentReference,
  Timeline,
  TimelineTrack,
  Keyframe,
  EventConnection,
  Transition,
  SceneState,
  SceneInput,
  SceneEvent as SceneEventType,
  Transform,
  Position,
  Dimensions,
  EasingFunction,
  ValidationResult,
  SceneRuntimeConfig,
} from './types/scene-spec';

/**
 * Compose a scene from specification
 */
export function composeSceneFromSpec(spec: any) {
  const { validateScene } = require('./validation/scene-validator');
  const validation = validateScene(spec);

  return {
    status: validation.valid ? 'valid' : 'invalid',
    validation,
    spec
  };
}
