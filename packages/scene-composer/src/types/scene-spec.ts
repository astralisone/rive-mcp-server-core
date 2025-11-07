/**
 * Scene Composition Type Definitions
 *
 * Defines the structure for orchestrating multiple Rive animations
 * into cohesive, synchronized scenes.
 */

/**
 * Timing function for animations and transitions
 */
export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | string; // CSS cubic-bezier format

/**
 * Coordinate system for positioning
 */
export interface Position {
  x: number;
  y: number;
  z?: number; // For layering/depth
}

/**
 * Dimensions for components
 */
export interface Dimensions {
  width: number;
  height: number;
  unit?: 'px' | '%' | 'vw' | 'vh';
}

/**
 * Transform operations for positioning and animation
 */
export interface Transform {
  position?: Position;
  scale?: { x: number; y: number };
  rotation?: number; // degrees
  opacity?: number; // 0-1
  anchor?: Position; // Transform origin
}

/**
 * Reference to a Rive component/animation
 */
export interface ComponentReference {
  id: string;
  libraryId?: string;
  componentId: string;
  artboardName?: string;
  stateMachineName?: string;
}

/**
 * Layout configuration for a component in the scene
 */
export interface ComponentLayout extends ComponentReference {
  name: string; // Unique identifier within the scene
  transform: Transform;
  dimensions?: Dimensions;
  zIndex?: number;
  visible?: boolean;
  interactive?: boolean;
}

/**
 * Animation keyframe for timeline-based animations
 */
export interface Keyframe {
  time: number; // milliseconds
  property: string; // e.g., 'transform.position.x', 'transform.opacity'
  value: any;
  easing?: EasingFunction;
}

/**
 * Timeline track for a single component
 */
export interface TimelineTrack {
  componentName: string;
  keyframes: Keyframe[];
  stateMachineInputs?: Array<{
    time: number;
    inputName: string;
    value: any;
  }>;
  triggers?: Array<{
    time: number;
    eventName: string;
  }>;
}

/**
 * Scene timeline orchestrating multiple components
 */
export interface Timeline {
  duration: number; // Total scene duration in milliseconds
  tracks: TimelineTrack[];
  loop?: boolean;
  playbackRate?: number;
}

/**
 * Event connection between components
 */
export interface EventConnection {
  source: {
    componentName: string;
    eventName: string;
  };
  target: {
    componentName: string;
    action: 'trigger' | 'setInput' | 'setState';
    parameter?: string;
    value?: any;
  };
  transform?: (eventData: any) => any; // Optional data transformation
  delay?: number; // milliseconds
}

/**
 * Transition between scene states
 */
export interface Transition {
  from: string; // State name or '*' for any
  to: string;
  duration: number;
  easing?: EasingFunction;
  animations?: Array<{
    componentName: string;
    property: string;
    from?: any;
    to: any;
  }>;
}

/**
 * Scene state configuration
 */
export interface SceneState {
  name: string;
  description?: string;
  componentStates: Array<{
    componentName: string;
    stateMachine?: string;
    state?: string;
    inputs?: Record<string, any>;
    transform?: Transform;
  }>;
}

/**
 * Input parameter for the scene
 */
export interface SceneInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
}

/**
 * Scene output event
 */
export interface SceneEvent {
  name: string;
  description?: string;
  payload?: Record<string, any>;
}

/**
 * Complete scene composition specification
 */
export interface SceneComposition {
  id: string;
  name: string;
  description?: string;
  version: string;

  // Component layout and positioning
  components: ComponentLayout[];

  // Scene dimensions
  viewport: Dimensions;

  // Timeline-based orchestration
  timeline?: Timeline;

  // State-based orchestration
  states?: SceneState[];
  transitions?: Transition[];
  initialState?: string;

  // Event routing between components
  eventConnections?: EventConnection[];

  // Scene inputs and outputs
  inputs?: SceneInput[];
  events?: SceneEvent[];

  // Metadata
  metadata?: {
    author?: string;
    created?: string;
    modified?: string;
    tags?: string[];
    category?: string;
  };

  // Visual and motion guidelines
  guidelines?: {
    brand?: string;
    palette?: string[];
    motionStyle?: {
      duration?: string;
      easing?: EasingFunction;
      keywords?: string[];
    };
  };

  // Performance hints
  performance?: {
    preload?: string[]; // Component IDs to preload
    lazyLoad?: string[]; // Component IDs to lazy load
    priority?: 'low' | 'normal' | 'high';
  };
}

/**
 * Scene validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Runtime scene instance configuration
 */
export interface SceneRuntimeConfig {
  spec: SceneComposition;
  canvas: HTMLCanvasElement | string; // Canvas element or selector
  autoPlay?: boolean;
  inputs?: Record<string, any>;
  onEvent?: (eventName: string, payload: any) => void;
  onStateChange?: (fromState: string, toState: string) => void;
  onError?: (error: Error) => void;
}
