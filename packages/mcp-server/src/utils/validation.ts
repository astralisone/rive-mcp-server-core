/**
 * Validation utilities for Rive MCP Server
 * Provides type-safe validation functions for runtime configuration and components
 */

import { FitMode, Alignment, RiveRuntimeSurface, RiveStateMachine } from '../types';

/**
 * Valid fit modes for Rive canvas rendering
 */
const VALID_FIT_MODES: FitMode[] = [
  'cover',
  'contain',
  'fill',
  'fitWidth',
  'fitHeight',
  'none',
  'scaleDown'
];

/**
 * Valid alignment values for Rive canvas positioning
 */
const VALID_ALIGNMENTS: Alignment[] = [
  'center',
  'topLeft',
  'topCenter',
  'topRight',
  'centerLeft',
  'centerRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight'
];

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates if a string is a valid FitMode
 * @param fit - The fit mode string to validate
 * @returns true if valid, false otherwise
 */
export function validateFitMode(fit: string): boolean {
  return VALID_FIT_MODES.includes(fit as FitMode);
}

/**
 * Validates if a string is a valid Alignment
 * @param alignment - The alignment string to validate
 * @returns true if valid, false otherwise
 */
export function validateAlignment(alignment: string): boolean {
  return VALID_ALIGNMENTS.includes(alignment as Alignment);
}

/**
 * Validates a component ID format
 * Component IDs should be alphanumeric with hyphens or underscores
 * @param id - The component ID to validate
 * @returns true if valid, false otherwise
 */
export function validateComponentId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Component ID should be non-empty and contain only valid characters
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  return validIdPattern.test(id) && id.length > 0 && id.length <= 255;
}

/**
 * Validates a runtime surface object for completeness and correctness
 * @param surface - The runtime surface to validate
 * @returns ValidationResult with detailed error information
 */
export function validateRuntimeSurface(surface: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if surface is an object
  if (!surface || typeof surface !== 'object') {
    return {
      valid: false,
      errors: ['Runtime surface must be a valid object'],
    };
  }

  // Validate componentId
  if (!surface.componentId) {
    errors.push('Runtime surface must have a componentId');
  } else if (!validateComponentId(surface.componentId)) {
    errors.push(`Invalid componentId format: ${surface.componentId}`);
  }

  // Validate artboards
  if (!Array.isArray(surface.artboards)) {
    errors.push('Runtime surface must have an artboards array');
  } else if (surface.artboards.length === 0) {
    warnings.push('Runtime surface has no artboards');
  } else {
    // Validate each artboard
    surface.artboards.forEach((artboard: any, index: number) => {
      if (!artboard.name) {
        errors.push(`Artboard at index ${index} missing name`);
      }
      if (typeof artboard.width !== 'number' || artboard.width <= 0) {
        errors.push(`Artboard '${artboard.name || index}' has invalid width`);
      }
      if (typeof artboard.height !== 'number' || artboard.height <= 0) {
        errors.push(`Artboard '${artboard.name || index}' has invalid height`);
      }
    });
  }

  // Validate state machines
  if (!Array.isArray(surface.stateMachines)) {
    errors.push('Runtime surface must have a stateMachines array');
  } else if (surface.stateMachines.length === 0) {
    warnings.push('Runtime surface has no state machines');
  } else {
    // Validate each state machine
    surface.stateMachines.forEach((sm: any, index: number) => {
      if (!sm.name) {
        errors.push(`State machine at index ${index} missing name`);
      }
      if (!Array.isArray(sm.inputs)) {
        errors.push(`State machine '${sm.name || index}' missing inputs array`);
      } else {
        // Validate inputs
        sm.inputs.forEach((input: any, inputIndex: number) => {
          if (!input.name) {
            errors.push(`Input at index ${inputIndex} in state machine '${sm.name}' missing name`);
          }
          if (!['bool', 'number', 'trigger'].includes(input.type)) {
            errors.push(`Input '${input.name}' in state machine '${sm.name}' has invalid type: ${input.type}`);
          }
        });
      }
      if (typeof sm.layerCount !== 'number') {
        warnings.push(`State machine '${sm.name}' missing or invalid layerCount`);
      }
    });
  }

  // Validate events
  if (!Array.isArray(surface.events)) {
    warnings.push('Runtime surface missing events array');
  } else {
    surface.events.forEach((event: any, index: number) => {
      if (!event.name) {
        errors.push(`Event at index ${index} missing name`);
      }
    });
  }

  // Validate metadata
  if (!surface.metadata) {
    warnings.push('Runtime surface missing metadata');
  } else {
    if (typeof surface.metadata.fileSize !== 'number') {
      warnings.push('Metadata missing valid fileSize');
    }
    if (!surface.metadata.parseDate) {
      warnings.push('Metadata missing parseDate');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates state machine structure
 * @param stateMachine - The state machine to validate
 * @returns ValidationResult with detailed error information
 */
export function validateStateMachine(stateMachine: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!stateMachine || typeof stateMachine !== 'object') {
    return {
      valid: false,
      errors: ['State machine must be a valid object'],
    };
  }

  if (!stateMachine.name || typeof stateMachine.name !== 'string') {
    errors.push('State machine must have a valid name');
  }

  if (!Array.isArray(stateMachine.inputs)) {
    errors.push('State machine must have an inputs array');
  } else {
    stateMachine.inputs.forEach((input: any, index: number) => {
      if (!input.name) {
        errors.push(`Input at index ${index} missing name`);
      }
      if (!['bool', 'number', 'trigger'].includes(input.type)) {
        errors.push(`Input '${input.name || index}' has invalid type: ${input.type}`);
      }
    });
  }

  if (typeof stateMachine.layerCount !== 'number') {
    warnings.push('State machine missing layerCount');
  }

  if (stateMachine.inputCount !== undefined && typeof stateMachine.inputCount !== 'number') {
    warnings.push('State machine has invalid inputCount');
  }

  if (stateMachine.eventNames !== undefined && !Array.isArray(stateMachine.eventNames)) {
    warnings.push('State machine has invalid eventNames (must be array)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates a file path format
 * @param filePath - The file path to validate
 * @returns true if valid, false otherwise
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // File path should end with .riv extension
  if (!filePath.endsWith('.riv')) {
    return false;
  }

  // Should not contain invalid characters
  const invalidChars = /[<>"|?*\x00-\x1F]/;
  return !invalidChars.test(filePath);
}

/**
 * Get list of valid fit modes
 * @returns Array of valid FitMode values
 */
export function getValidFitModes(): FitMode[] {
  return [...VALID_FIT_MODES];
}

/**
 * Get list of valid alignments
 * @returns Array of valid Alignment values
 */
export function getValidAlignments(): Alignment[] {
  return [...VALID_ALIGNMENTS];
}
