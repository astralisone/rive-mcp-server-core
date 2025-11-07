/**
 * Scene Composition Validator
 *
 * Validates scene composition specifications for correctness,
 * completeness, and adherence to best practices.
 */

import type {
  SceneComposition,
  ValidationResult,
  ComponentLayout,
  EventConnection,
  Transition,
  SceneState,
} from '../types/scene-spec';

/**
 * Validation error
 */
interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Scene composition validator
 */
export class SceneValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate a scene composition
   */
  validate(spec: SceneComposition): ValidationResult {
    this.errors = [];

    // Required fields
    this.validateRequired(spec);

    // Validate components
    this.validateComponents(spec);

    // Validate timeline
    if (spec.timeline) {
      this.validateTimeline(spec);
    }

    // Validate states and transitions
    if (spec.states || spec.transitions) {
      this.validateStateMachine(spec);
    }

    // Validate event connections
    if (spec.eventConnections) {
      this.validateEventConnections(spec);
    }

    // Validate inputs
    if (spec.inputs) {
      this.validateInputs(spec);
    }

    // Validate cross-references
    this.validateReferences(spec);

    return {
      valid: this.errors.filter((e) => e.severity === 'error').length === 0,
      errors: this.errors,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequired(spec: SceneComposition): void {
    if (!spec.id) {
      this.addError('id', 'Scene ID is required', 'error');
    }

    if (!spec.name) {
      this.addError('name', 'Scene name is required', 'error');
    }

    if (!spec.version) {
      this.addError('version', 'Scene version is required', 'error');
    }

    if (!spec.viewport) {
      this.addError('viewport', 'Viewport dimensions are required', 'error');
    } else {
      if (spec.viewport.width <= 0) {
        this.addError(
          'viewport.width',
          'Viewport width must be positive',
          'error'
        );
      }
      if (spec.viewport.height <= 0) {
        this.addError(
          'viewport.height',
          'Viewport height must be positive',
          'error'
        );
      }
    }

    if (!spec.components || spec.components.length === 0) {
      this.addError(
        'components',
        'Scene must have at least one component',
        'error'
      );
    }
  }

  /**
   * Validate components
   */
  private validateComponents(spec: SceneComposition): void {
    if (!spec.components) {
      return;
    }

    const componentNames = new Set<string>();

    for (let i = 0; i < spec.components.length; i++) {
      const component = spec.components[i];
      const path = `components[${i}]`;

      // Check required fields
      if (!component.name) {
        this.addError(`${path}.name`, 'Component name is required', 'error');
      } else {
        // Check for duplicate names
        if (componentNames.has(component.name)) {
          this.addError(
            `${path}.name`,
            `Duplicate component name: ${component.name}`,
            'error'
          );
        }
        componentNames.add(component.name);
      }

      if (!component.componentId) {
        this.addError(
          `${path}.componentId`,
          'Component ID is required',
          'error'
        );
      }

      if (!component.transform) {
        this.addError(
          `${path}.transform`,
          'Component transform is required',
          'error'
        );
      }

      // Validate transform values
      if (component.transform) {
        if (
          component.transform.opacity !== undefined &&
          (component.transform.opacity < 0 || component.transform.opacity > 1)
        ) {
          this.addError(
            `${path}.transform.opacity`,
            'Opacity must be between 0 and 1',
            'error'
          );
        }
      }

      // Validate z-index
      if (component.zIndex !== undefined && component.zIndex < 0) {
        this.addError(
          `${path}.zIndex`,
          'Z-index cannot be negative',
          'warning'
        );
      }
    }
  }

  /**
   * Validate timeline
   */
  private validateTimeline(spec: SceneComposition): void {
    const timeline = spec.timeline!;
    const path = 'timeline';

    if (timeline.duration <= 0) {
      this.addError(
        `${path}.duration`,
        'Timeline duration must be positive',
        'error'
      );
    }

    if (!timeline.tracks || timeline.tracks.length === 0) {
      this.addError(
        `${path}.tracks`,
        'Timeline must have at least one track',
        'warning'
      );
    }

    // Validate tracks
    if (timeline.tracks) {
      for (let i = 0; i < timeline.tracks.length; i++) {
        const track = timeline.tracks[i];
        const trackPath = `${path}.tracks[${i}]`;

        if (!track.componentName) {
          this.addError(
            `${trackPath}.componentName`,
            'Track component name is required',
            'error'
          );
        }

        // Validate keyframes
        if (track.keyframes) {
          for (let j = 0; j < track.keyframes.length; j++) {
            const keyframe = track.keyframes[j];
            const kfPath = `${trackPath}.keyframes[${j}]`;

            if (keyframe.time < 0) {
              this.addError(
                `${kfPath}.time`,
                'Keyframe time cannot be negative',
                'error'
              );
            }

            if (keyframe.time > timeline.duration) {
              this.addError(
                `${kfPath}.time`,
                'Keyframe time exceeds timeline duration',
                'warning'
              );
            }

            if (!keyframe.property) {
              this.addError(
                `${kfPath}.property`,
                'Keyframe property is required',
                'error'
              );
            }
          }
        }
      }
    }
  }

  /**
   * Validate state machine
   */
  private validateStateMachine(spec: SceneComposition): void {
    if (!spec.states || spec.states.length === 0) {
      if (spec.transitions && spec.transitions.length > 0) {
        this.addError(
          'states',
          'States must be defined when transitions exist',
          'error'
        );
      }
      return;
    }

    const stateNames = new Set<string>();

    // Validate states
    for (let i = 0; i < spec.states.length; i++) {
      const state = spec.states[i];
      const path = `states[${i}]`;

      if (!state.name) {
        this.addError(`${path}.name`, 'State name is required', 'error');
      } else {
        if (stateNames.has(state.name)) {
          this.addError(
            `${path}.name`,
            `Duplicate state name: ${state.name}`,
            'error'
          );
        }
        stateNames.add(state.name);
      }

      if (!state.componentStates || state.componentStates.length === 0) {
        this.addError(
          `${path}.componentStates`,
          'State must define component states',
          'warning'
        );
      }
    }

    // Validate initial state
    if (spec.initialState && !stateNames.has(spec.initialState)) {
      this.addError(
        'initialState',
        `Initial state '${spec.initialState}' not found in states`,
        'error'
      );
    }

    // Validate transitions
    if (spec.transitions) {
      for (let i = 0; i < spec.transitions.length; i++) {
        const transition = spec.transitions[i];
        const path = `transitions[${i}]`;

        if (transition.from !== '*' && !stateNames.has(transition.from)) {
          this.addError(
            `${path}.from`,
            `Source state '${transition.from}' not found`,
            'error'
          );
        }

        if (!stateNames.has(transition.to)) {
          this.addError(
            `${path}.to`,
            `Target state '${transition.to}' not found`,
            'error'
          );
        }

        if (transition.duration <= 0) {
          this.addError(
            `${path}.duration`,
            'Transition duration must be positive',
            'error'
          );
        }
      }
    }
  }

  /**
   * Validate event connections
   */
  private validateEventConnections(spec: SceneComposition): void {
    if (!spec.eventConnections) {
      return;
    }

    for (let i = 0; i < spec.eventConnections.length; i++) {
      const connection = spec.eventConnections[i];
      const path = `eventConnections[${i}]`;

      if (!connection.source?.componentName) {
        this.addError(
          `${path}.source.componentName`,
          'Source component name is required',
          'error'
        );
      }

      if (!connection.source?.eventName) {
        this.addError(
          `${path}.source.eventName`,
          'Source event name is required',
          'error'
        );
      }

      if (!connection.target?.componentName) {
        this.addError(
          `${path}.target.componentName`,
          'Target component name is required',
          'error'
        );
      }

      if (!connection.target?.action) {
        this.addError(
          `${path}.target.action`,
          'Target action is required',
          'error'
        );
      }

      if (
        connection.delay !== undefined &&
        connection.delay < 0
      ) {
        this.addError(
          `${path}.delay`,
          'Delay cannot be negative',
          'error'
        );
      }
    }
  }

  /**
   * Validate inputs
   */
  private validateInputs(spec: SceneComposition): void {
    if (!spec.inputs) {
      return;
    }

    const inputNames = new Set<string>();

    for (let i = 0; i < spec.inputs.length; i++) {
      const input = spec.inputs[i];
      const path = `inputs[${i}]`;

      if (!input.name) {
        this.addError(`${path}.name`, 'Input name is required', 'error');
      } else {
        if (inputNames.has(input.name)) {
          this.addError(
            `${path}.name`,
            `Duplicate input name: ${input.name}`,
            'error'
          );
        }
        inputNames.add(input.name);
      }

      if (!input.type) {
        this.addError(`${path}.type`, 'Input type is required', 'error');
      }

      // Validate validation rules
      if (input.validation) {
        if (
          input.validation.min !== undefined &&
          input.validation.max !== undefined &&
          input.validation.min > input.validation.max
        ) {
          this.addError(
            `${path}.validation`,
            'Min value cannot exceed max value',
            'error'
          );
        }
      }
    }
  }

  /**
   * Validate cross-references
   */
  private validateReferences(spec: SceneComposition): void {
    if (!spec.components) {
      return;
    }

    const componentNames = new Set(spec.components.map((c) => c.name));

    // Check timeline track references
    if (spec.timeline?.tracks) {
      for (const track of spec.timeline.tracks) {
        if (!componentNames.has(track.componentName)) {
          this.addError(
            'timeline',
            `Timeline references unknown component: ${track.componentName}`,
            'error'
          );
        }
      }
    }

    // Check state component references
    if (spec.states) {
      for (const state of spec.states) {
        for (const compState of state.componentStates) {
          if (!componentNames.has(compState.componentName)) {
            this.addError(
              'states',
              `State '${state.name}' references unknown component: ${compState.componentName}`,
              'error'
            );
          }
        }
      }
    }

    // Check event connection references
    if (spec.eventConnections) {
      for (const connection of spec.eventConnections) {
        if (!componentNames.has(connection.source.componentName)) {
          this.addError(
            'eventConnections',
            `Event connection references unknown source: ${connection.source.componentName}`,
            'error'
          );
        }
        if (!componentNames.has(connection.target.componentName)) {
          this.addError(
            'eventConnections',
            `Event connection references unknown target: ${connection.target.componentName}`,
            'error'
          );
        }
      }
    }
  }

  /**
   * Add validation error
   */
  private addError(
    path: string,
    message: string,
    severity: 'error' | 'warning'
  ): void {
    this.errors.push({ path, message, severity });
  }
}

/**
 * Convenience function to validate a scene
 */
export function validateScene(spec: SceneComposition): ValidationResult {
  const validator = new SceneValidator();
  return validator.validate(spec);
}
