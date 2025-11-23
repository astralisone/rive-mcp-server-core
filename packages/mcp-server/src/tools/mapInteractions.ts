/**
 * map_interactions MCP Tool
 * Infer and configure mappings between UX interactions and Rive state machine inputs/events
 */

import { getRuntimeSurface } from './getRuntimeSurface';
import { MCPToolResponse, RiveStateMachineInput, RiveStateMachineEvent } from '../types';
import { logger } from '../utils/logger';

/**
 * Supported UX interaction types
 */
export type InteractionType =
  | 'hover'
  | 'click'
  | 'tap'
  | 'press'
  | 'focus'
  | 'blur'
  | 'scroll_progress'
  | 'route_change'
  | 'visible_in_viewport'
  | 'custom';

/**
 * Supported framework targets
 */
export type FrameworkTarget = 'react' | 'vue' | 'stencil' | 'none';

export interface MapInteractionsParams {
  componentId: string;
  interactions: InteractionType[];
  customInteractionNames?: string[];
  framework?: FrameworkTarget;
  autoInfer?: boolean;
}

export interface InteractionMapping {
  interaction: InteractionType | string;
  input?: string;
  event?: string;
  type: 'trigger' | 'bool' | 'number';
  confidence: 'high' | 'medium' | 'low';
  frameworkExample?: string;
  notes?: string;
}

export interface MapInteractionsResponse {
  status: 'ok';
  componentId: string;
  mappings: InteractionMapping[];
  unmappedInteractions: string[];
  availableInputs: RiveStateMachineInput[];
  availableEvents: RiveStateMachineEvent[];
  integrationHints: Record<string, string>;
}

/**
 * Interaction to input name patterns for auto-inference
 */
const INTERACTION_PATTERNS: Record<InteractionType, string[]> = {
  hover: ['hover', 'hovered', 'isHover', 'isHovered', 'onHover', 'mouseOver', 'pointerOver'],
  click: ['click', 'clicked', 'onClick', 'press', 'pressed', 'tap', 'trigger', 'activate'],
  tap: ['tap', 'tapped', 'onTap', 'click', 'touch', 'pressed'],
  press: ['press', 'pressed', 'isPressed', 'down', 'mouseDown', 'pointerDown', 'hold'],
  focus: ['focus', 'focused', 'isFocused', 'onFocus', 'active', 'selected'],
  blur: ['blur', 'blurred', 'onBlur', 'unfocus', 'deselect'],
  scroll_progress: ['scroll', 'progress', 'scrollProgress', 'position', 'value', 'percent'],
  route_change: ['route', 'page', 'screen', 'state', 'navigate', 'transition'],
  visible_in_viewport: ['visible', 'inView', 'isVisible', 'onScreen', 'appear', 'show'],
  custom: [],
};

/**
 * Generate framework-specific code examples
 */
function generateFrameworkExample(
  interaction: InteractionType | string,
  inputName: string,
  inputType: 'trigger' | 'bool' | 'number',
  framework: FrameworkTarget
): string {
  if (framework === 'none') {
    return '';
  }

  const examples: Record<FrameworkTarget, Record<InteractionType | string, (name: string, type: string) => string>> = {
    react: {
      hover: (name, type) =>
        type === 'bool'
          ? `onMouseEnter={() => rive?.setBooleanInput('${name}', true)}\nonMouseLeave={() => rive?.setBooleanInput('${name}', false)}`
          : `onMouseEnter={() => rive?.fireTrigger('${name}')}`,
      click: (name, type) =>
        type === 'trigger'
          ? `onClick={() => rive?.fireTrigger('${name}')}`
          : `onClick={() => rive?.setBooleanInput('${name}', true)}`,
      tap: (name, type) =>
        type === 'trigger'
          ? `onTouchEnd={() => rive?.fireTrigger('${name}')}`
          : `onTouchEnd={() => rive?.setBooleanInput('${name}', true)}`,
      press: (name, type) =>
        type === 'bool'
          ? `onMouseDown={() => rive?.setBooleanInput('${name}', true)}\nonMouseUp={() => rive?.setBooleanInput('${name}', false)}`
          : `onMouseDown={() => rive?.fireTrigger('${name}')}`,
      focus: (name, type) =>
        type === 'bool'
          ? `onFocus={() => rive?.setBooleanInput('${name}', true)}`
          : `onFocus={() => rive?.fireTrigger('${name}')}`,
      blur: (name, type) =>
        type === 'bool'
          ? `onBlur={() => rive?.setBooleanInput('${name}', false)}`
          : `onBlur={() => rive?.fireTrigger('${name}')}`,
      scroll_progress: (name) =>
        `onScroll={(e) => {\n  const progress = e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight);\n  rive?.setNumberInput('${name}', progress * 100);\n}}`,
      route_change: (name, type) =>
        type === 'trigger'
          ? `useEffect(() => rive?.fireTrigger('${name}'), [location.pathname])`
          : `useEffect(() => rive?.setBooleanInput('${name}', true), [location.pathname])`,
      visible_in_viewport: (name, type) =>
        `// Use Intersection Observer\nuseEffect(() => {\n  const observer = new IntersectionObserver(([entry]) => {\n    ${type === 'bool' ? `rive?.setBooleanInput('${name}', entry.isIntersecting)` : `if (entry.isIntersecting) rive?.fireTrigger('${name}')`}\n  });\n  observer.observe(ref.current);\n  return () => observer.disconnect();\n}, [])`,
      custom: (name, type) =>
        type === 'trigger'
          ? `// Custom: rive?.fireTrigger('${name}')`
          : `// Custom: rive?.setBooleanInput('${name}', value)`,
    },
    vue: {
      hover: (name, type) =>
        type === 'bool'
          ? `@mouseenter="rive?.setBooleanInput('${name}', true)"\n@mouseleave="rive?.setBooleanInput('${name}', false)"`
          : `@mouseenter="rive?.fireTrigger('${name}')"`,
      click: (name, type) =>
        type === 'trigger'
          ? `@click="rive?.fireTrigger('${name}')"`
          : `@click="rive?.setBooleanInput('${name}', true)"`,
      tap: (name, type) =>
        type === 'trigger'
          ? `@touchend="rive?.fireTrigger('${name}')"`
          : `@touchend="rive?.setBooleanInput('${name}', true)"`,
      press: (name, type) =>
        type === 'bool'
          ? `@mousedown="rive?.setBooleanInput('${name}', true)"\n@mouseup="rive?.setBooleanInput('${name}', false)"`
          : `@mousedown="rive?.fireTrigger('${name}')"`,
      focus: (name, type) =>
        type === 'bool'
          ? `@focus="rive?.setBooleanInput('${name}', true)"`
          : `@focus="rive?.fireTrigger('${name}')"`,
      blur: (name, type) =>
        type === 'bool'
          ? `@blur="rive?.setBooleanInput('${name}', false)"`
          : `@blur="rive?.fireTrigger('${name}')"`,
      scroll_progress: (name) =>
        `@scroll="(e) => rive?.setNumberInput('${name}', (e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight)) * 100)"`,
      route_change: (name, type) =>
        type === 'trigger'
          ? `watch(() => route.path, () => rive?.fireTrigger('${name}'))`
          : `watch(() => route.path, () => rive?.setBooleanInput('${name}', true))`,
      visible_in_viewport: (name, type) =>
        `// Use v-intersect directive or Intersection Observer\nonMounted(() => {\n  const observer = new IntersectionObserver(([entry]) => {\n    ${type === 'bool' ? `rive?.setBooleanInput('${name}', entry.isIntersecting)` : `if (entry.isIntersecting) rive?.fireTrigger('${name}')`}\n  });\n  observer.observe(el);\n})`,
      custom: (name, type) =>
        type === 'trigger'
          ? `// Custom: rive?.fireTrigger('${name}')`
          : `// Custom: rive?.setBooleanInput('${name}', value)`,
    },
    stencil: {
      hover: (name, type) =>
        type === 'bool'
          ? `onMouseEnter={() => this.rive?.setBooleanInput('${name}', true)}\nonMouseLeave={() => this.rive?.setBooleanInput('${name}', false)}`
          : `onMouseEnter={() => this.rive?.fireTrigger('${name}')}`,
      click: (name, type) =>
        type === 'trigger'
          ? `onClick={() => this.rive?.fireTrigger('${name}')}`
          : `onClick={() => this.rive?.setBooleanInput('${name}', true)}`,
      tap: (name, type) =>
        type === 'trigger'
          ? `onTouchEnd={() => this.rive?.fireTrigger('${name}')}`
          : `onTouchEnd={() => this.rive?.setBooleanInput('${name}', true)}`,
      press: (name, type) =>
        type === 'bool'
          ? `onMouseDown={() => this.rive?.setBooleanInput('${name}', true)}\nonMouseUp={() => this.rive?.setBooleanInput('${name}', false)}`
          : `onMouseDown={() => this.rive?.fireTrigger('${name}')}`,
      focus: (name, type) =>
        type === 'bool'
          ? `onFocus={() => this.rive?.setBooleanInput('${name}', true)}`
          : `onFocus={() => this.rive?.fireTrigger('${name}')}`,
      blur: (name, type) =>
        type === 'bool'
          ? `onBlur={() => this.rive?.setBooleanInput('${name}', false)}`
          : `onBlur={() => this.rive?.fireTrigger('${name}')}`,
      scroll_progress: (name) =>
        `onScroll={(e: Event) => {\n  const target = e.target as HTMLElement;\n  const progress = target.scrollTop / (target.scrollHeight - target.clientHeight);\n  this.rive?.setNumberInput('${name}', progress * 100);\n}}`,
      route_change: (name, type) =>
        type === 'trigger'
          ? `// Listen to route changes\n@Listen('routeChanged')\nhandleRouteChange() { this.rive?.fireTrigger('${name}'); }`
          : `// Listen to route changes\n@Listen('routeChanged')\nhandleRouteChange() { this.rive?.setBooleanInput('${name}', true); }`,
      visible_in_viewport: (name, type) =>
        `// Use Intersection Observer in componentDidLoad\ncomponentDidLoad() {\n  const observer = new IntersectionObserver(([entry]) => {\n    ${type === 'bool' ? `this.rive?.setBooleanInput('${name}', entry.isIntersecting)` : `if (entry.isIntersecting) this.rive?.fireTrigger('${name}')`}\n  });\n  observer.observe(this.el);\n}`,
      custom: (name, type) =>
        type === 'trigger'
          ? `// Custom: this.rive?.fireTrigger('${name}')`
          : `// Custom: this.rive?.setBooleanInput('${name}', value)`,
    },
    none: {
      hover: () => '',
      click: () => '',
      tap: () => '',
      press: () => '',
      focus: () => '',
      blur: () => '',
      scroll_progress: () => '',
      route_change: () => '',
      visible_in_viewport: () => '',
      custom: () => '',
    },
  };

  const interactionKey = interaction as InteractionType;
  const generator = examples[framework][interactionKey] || examples[framework].custom;
  return generator(inputName, inputType);
}

/**
 * Calculate match confidence between interaction and input name
 */
function calculateMatchConfidence(
  interaction: InteractionType,
  inputName: string
): 'high' | 'medium' | 'low' {
  const patterns = INTERACTION_PATTERNS[interaction];
  const lowerInputName = inputName.toLowerCase();

  // Exact match
  if (patterns.some((p) => lowerInputName === p.toLowerCase())) {
    return 'high';
  }

  // Contains pattern
  if (patterns.some((p) => lowerInputName.includes(p.toLowerCase()))) {
    return 'medium';
  }

  // Partial match or best guess
  return 'low';
}

/**
 * Find best matching input for an interaction
 */
function findBestMatch(
  interaction: InteractionType,
  inputs: RiveStateMachineInput[]
): { input: RiveStateMachineInput; confidence: 'high' | 'medium' | 'low' } | null {
  const patterns = INTERACTION_PATTERNS[interaction];

  // Try exact matches first
  for (const input of inputs) {
    const lowerName = input.name.toLowerCase();
    if (patterns.some((p) => lowerName === p.toLowerCase())) {
      return { input, confidence: 'high' };
    }
  }

  // Try contains matches
  for (const input of inputs) {
    const lowerName = input.name.toLowerCase();
    if (patterns.some((p) => lowerName.includes(p.toLowerCase()))) {
      return { input, confidence: 'medium' };
    }
  }

  // Try type-based heuristics
  if (interaction === 'scroll_progress') {
    const numberInputs = inputs.filter((i) => i.type === 'number');
    if (numberInputs.length === 1) {
      return { input: numberInputs[0], confidence: 'low' };
    }
  }

  if (['click', 'tap', 'press'].includes(interaction)) {
    const triggers = inputs.filter((i) => i.type === 'trigger');
    if (triggers.length === 1) {
      return { input: triggers[0], confidence: 'low' };
    }
  }

  if (['hover', 'focus', 'blur'].includes(interaction)) {
    const bools = inputs.filter((i) => i.type === 'bool');
    if (bools.length === 1) {
      return { input: bools[0], confidence: 'low' };
    }
  }

  return null;
}

/**
 * Map UX interactions to Rive state machine inputs/events
 */
export async function mapInteractions(
  params: MapInteractionsParams
): Promise<MCPToolResponse<MapInteractionsResponse>> {
  logger.info('mapInteractions called', {
    componentId: params.componentId,
    interactions: params.interactions,
    framework: params.framework,
    autoInfer: params.autoInfer,
  });

  try {
    // Validate parameters
    if (!params.componentId) {
      return {
        status: 'error',
        tool: 'mapInteractions',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'componentId is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.interactions || params.interactions.length === 0) {
      return {
        status: 'error',
        tool: 'mapInteractions',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'At least one interaction is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Get runtime surface using existing tool
    const surfaceResult = await getRuntimeSurface({ componentId: params.componentId });

    if (surfaceResult.status === 'error' || !surfaceResult.data) {
      return {
        status: 'error',
        tool: 'mapInteractions',
        error: surfaceResult.error || {
          code: 'RUNTIME_SURFACE_ERROR',
          message: 'Failed to get runtime surface',
        },
        timestamp: new Date().toISOString(),
      };
    }

    const surface = surfaceResult.data;
    const framework = params.framework || 'none';
    const autoInfer = params.autoInfer !== false; // Default to true

    // Collect all inputs from all state machines
    const allInputs: RiveStateMachineInput[] = [];
    for (const sm of surface.stateMachines) {
      allInputs.push(...sm.inputs);
    }

    const mappings: InteractionMapping[] = [];
    const unmappedInteractions: string[] = [];

    // Process each interaction
    for (const interaction of params.interactions) {
      if (interaction === 'custom') {
        // Handle custom interactions
        const customNames = params.customInteractionNames || [];
        for (const customName of customNames) {
          // Try to find a matching input
          const matchingInput = allInputs.find(
            (input) => input.name.toLowerCase() === customName.toLowerCase()
          );

          if (matchingInput) {
            mappings.push({
              interaction: customName,
              input: matchingInput.name,
              type: matchingInput.type,
              confidence: 'high',
              frameworkExample: generateFrameworkExample(
                'custom',
                matchingInput.name,
                matchingInput.type,
                framework
              ),
            });
          } else {
            unmappedInteractions.push(customName);
          }
        }
        continue;
      }

      if (autoInfer) {
        // Auto-infer mapping
        const match = findBestMatch(interaction, allInputs);

        if (match) {
          mappings.push({
            interaction,
            input: match.input.name,
            type: match.input.type,
            confidence: match.confidence,
            frameworkExample: generateFrameworkExample(
              interaction,
              match.input.name,
              match.input.type,
              framework
            ),
            notes:
              match.confidence === 'low'
                ? 'Low confidence match - verify this mapping is correct'
                : undefined,
          });
        } else {
          unmappedInteractions.push(interaction);
        }
      } else {
        // Without auto-infer, just report what's available
        unmappedInteractions.push(interaction);
      }
    }

    // Generate integration hints
    const integrationHints: Record<string, string> = {};

    if (framework === 'react') {
      integrationHints.setup = `import { useRive, useStateMachineInput } from '@rive-app/react-canvas';`;
      integrationHints.hook = `const { rive, RiveComponent } = useRive({ src: 'path/to/${params.componentId}.riv', stateMachines: '${surface.stateMachines[0]?.name || 'StateMachine'}', autoplay: true });`;
    } else if (framework === 'vue') {
      integrationHints.setup = `import Rive from '@rive-app/canvas';`;
      integrationHints.init = `const rive = new Rive({ src: 'path/to/${params.componentId}.riv', canvas: canvasRef.value, stateMachines: '${surface.stateMachines[0]?.name || 'StateMachine'}', autoplay: true });`;
    } else if (framework === 'stencil') {
      integrationHints.setup = `import Rive from '@rive-app/canvas';`;
      integrationHints.init = `this.rive = new Rive({ src: 'path/to/${params.componentId}.riv', canvas: this.canvas, stateMachines: '${surface.stateMachines[0]?.name || 'StateMachine'}', autoplay: true });`;
    }

    logger.info('mapInteractions completed', {
      componentId: params.componentId,
      mappingsCount: mappings.length,
      unmappedCount: unmappedInteractions.length,
    });

    return {
      status: 'success',
      tool: 'mapInteractions',
      data: {
        status: 'ok',
        componentId: params.componentId,
        mappings,
        unmappedInteractions,
        availableInputs: allInputs,
        availableEvents: surface.events,
        integrationHints,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('mapInteractions failed', {
      componentId: params.componentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 'error',
      tool: 'mapInteractions',
      error: {
        code: 'MAP_INTERACTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
