/**
 * Enhanced Compose Scene Tool
 *
 * Integrates with the scene-composer package to create
 * production-ready scene compositions with advanced orchestration.
 */

import type {
  SceneComposition,
  Timeline,
  EventConnection,
  SceneState,
  Transition,
} from '@astralismotion/scene-composer';
import { validateScene, generateRuntimeCode } from '@astralismotion/scene-composer';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Enhanced scene composition parameters
 */
export interface EnhancedComposeSceneParams {
  // Scene metadata
  id: string;
  name: string;
  description?: string;
  version?: string;

  // Components to include
  components: Array<{
    name: string;
    componentId: string;
    libraryId?: string;
    position: { x: number; y: number; z?: number };
    scale?: { x: number; y: number };
    rotation?: number;
    opacity?: number;
    zIndex?: number;
    artboardName?: string;
    stateMachineName?: string;
    visible?: boolean;
    interactive?: boolean;
  }>;

  // Scene dimensions
  viewport: {
    width: number;
    height: number;
    unit?: 'px' | '%' | 'vw' | 'vh';
  };

  // Timeline-based orchestration
  timeline?: {
    duration: number;
    tracks: Array<{
      componentName: string;
      keyframes: Array<{
        time: number;
        property: string;
        value: any;
        easing?: string;
      }>;
      stateMachineInputs?: Array<{
        time: number;
        inputName: string;
        value: any;
      }>;
      triggers?: Array<{
        time: number;
        eventName: string;
      }>;
    }>;
    loop?: boolean;
    playbackRate?: number;
  };

  // State machine orchestration
  states?: Array<{
    name: string;
    description?: string;
    componentStates: Array<{
      componentName: string;
      stateMachine?: string;
      state?: string;
      inputs?: Record<string, any>;
      transform?: {
        position?: { x: number; y: number; z?: number };
        scale?: { x: number; y: number };
        rotation?: number;
        opacity?: number;
      };
    }>;
  }>;

  // State transitions
  transitions?: Array<{
    from: string;
    to: string;
    duration: number;
    easing?: string;
    animations?: Array<{
      componentName: string;
      property: string;
      from?: any;
      to: any;
    }>;
  }>;

  initialState?: string;

  // Event connections between components
  eventConnections?: Array<{
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
    delay?: number;
  }>;

  // Scene inputs
  inputs?: Array<{
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
  }>;

  // Scene events
  events?: Array<{
    name: string;
    description?: string;
    payload?: Record<string, any>;
  }>;

  // Visual and motion guidelines
  guidelines?: {
    brand?: string;
    palette?: string[];
    motionStyle?: {
      duration?: string;
      easing?: string;
      keywords?: string[];
    };
  };

  // Performance hints
  performance?: {
    preload?: string[];
    lazyLoad?: string[];
    priority?: 'low' | 'normal' | 'high';
  };

  // Code generation options
  generate?: {
    frameworks?: Array<'react' | 'vue' | 'stencil' | 'vanilla'>;
    typescript?: boolean;
    outputPath?: string;
  };

  // Export to motion-scenes library
  export?: boolean;
}

/**
 * Compose a scene with enhanced orchestration capabilities
 */
export async function composeSceneEnhanced(
  params: EnhancedComposeSceneParams
): Promise<any> {
  try {
    // Build scene specification
    const spec: SceneComposition = {
      id: params.id,
      name: params.name,
      description: params.description,
      version: params.version || '1.0.0',
      viewport: params.viewport,
      components: params.components.map((comp) => ({
        id: comp.componentId,
        name: comp.name,
        componentId: comp.componentId,
        libraryId: comp.libraryId,
        artboardName: comp.artboardName,
        stateMachineName: comp.stateMachineName,
        transform: {
          position: comp.position,
          scale: comp.scale,
          rotation: comp.rotation,
          opacity: comp.opacity,
        },
        zIndex: comp.zIndex,
        visible: comp.visible,
        interactive: comp.interactive,
      })),
      metadata: {
        author: 'Rive MCP Server',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };

    // Add timeline if provided
    if (params.timeline) {
      spec.timeline = params.timeline as Timeline;
    }

    // Add state machine if provided
    if (params.states) {
      spec.states = params.states as SceneState[];
      spec.transitions = params.transitions as Transition[];
      spec.initialState = params.initialState;
    }

    // Add event connections if provided
    if (params.eventConnections) {
      spec.eventConnections = params.eventConnections as EventConnection[];
    }

    // Add inputs if provided
    if (params.inputs) {
      spec.inputs = params.inputs;
    }

    // Add events if provided
    if (params.events) {
      spec.events = params.events;
    }

    // Add guidelines if provided
    if (params.guidelines) {
      spec.guidelines = params.guidelines;
    }

    // Add performance hints if provided
    if (params.performance) {
      spec.performance = params.performance;
    }

    // Validate scene
    const validation = validateScene(spec);
    if (!validation.valid) {
      const errors = validation.errors.filter((e) => e.severity === 'error');
      return {
        success: false,
        error: 'Scene validation failed',
        validation: {
          valid: false,
          errors: errors,
          errorCount: errors.length,
        },
      };
    }

    // Generate runtime code if requested
    const generatedCode: any[] = [];
    if (params.generate && params.generate.frameworks) {
      for (const framework of params.generate.frameworks) {
        const code = generateRuntimeCode(spec, {
          framework,
          typescript: params.generate.typescript ?? true,
          includeTypes: true,
        });

        const fullCode = [
          ...code.imports,
          '',
          code.types || '',
          '',
          code.code,
        ].join('\n');

        generatedCode.push({
          framework,
          filename: code.filename,
          code: fullCode,
        });

        // Write to file if output path provided
        if (params.generate.outputPath) {
          const frameworkDir = path.join(
            params.generate.outputPath,
            framework
          );
          await fs.mkdir(frameworkDir, { recursive: true });
          const filePath = path.join(frameworkDir, code.filename);
          await fs.writeFile(filePath, fullCode, 'utf-8');
        }
      }
    }

    // Export to motion-scenes library if requested
    let exportPath = null;
    if (params.export) {
      const scenesDir = path.join(
        process.cwd(),
        'libs',
        'motion-scenes',
        params.id
      );
      await fs.mkdir(scenesDir, { recursive: true });

      // Write scene specification
      const specPath = path.join(scenesDir, `${params.id}-scene.json`);
      await fs.writeFile(specPath, JSON.stringify(spec, null, 2), 'utf-8');

      // Write README
      const readme = generateSceneReadme(spec, params);
      const readmePath = path.join(scenesDir, 'README.md');
      await fs.writeFile(readmePath, readme, 'utf-8');

      // Write generated code if available
      for (const gen of generatedCode) {
        const codePath = path.join(scenesDir, gen.filename);
        await fs.writeFile(codePath, gen.code, 'utf-8');
      }

      exportPath = scenesDir;
    }

    // Determine orchestration type
    const orchestrationType = determineOrchestrationType(spec);

    return {
      success: true,
      scene: {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        version: spec.version,
        componentCount: spec.components.length,
        orchestrationType,
        capabilities: {
          hasTimeline: !!spec.timeline,
          hasStateMachine: !!(spec.states && spec.states.length > 0),
          hasEventConnections: !!(
            spec.eventConnections && spec.eventConnections.length > 0
          ),
          stateCount: spec.states?.length || 0,
          transitionCount: spec.transitions?.length || 0,
          eventConnectionCount: spec.eventConnections?.length || 0,
          inputCount: spec.inputs?.length || 0,
          outputEventCount: spec.events?.length || 0,
        },
        viewport: spec.viewport,
      },
      specification: spec,
      validation: {
        valid: true,
        warnings: validation.errors.filter((e) => e.severity === 'warning'),
        warningCount: validation.errors.filter((e) => e.severity === 'warning')
          .length,
      },
      generated: generatedCode.length > 0
        ? {
            frameworks: generatedCode.map((g) => g.framework),
            files: generatedCode.map((g) => ({
              framework: g.framework,
              filename: g.filename,
            })),
            typescript: params.generate?.typescript ?? true,
          }
        : null,
      exported: params.export ? { path: exportPath } : null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
}

/**
 * Determine orchestration type from scene spec
 */
function determineOrchestrationType(spec: SceneComposition): string {
  const types: string[] = [];

  if (spec.timeline) {
    types.push('timeline');
  }
  if (spec.states && spec.states.length > 0) {
    types.push('state-machine');
  }
  if (spec.eventConnections && spec.eventConnections.length > 0) {
    types.push('event-driven');
  }

  if (types.length === 0) {
    return 'static';
  }
  if (types.length === 1) {
    return types[0];
  }
  return 'hybrid-' + types.join('-');
}

/**
 * Generate README for the scene
 */
function generateSceneReadme(
  spec: SceneComposition,
  params: EnhancedComposeSceneParams
): string {
  const orchestrationType = determineOrchestrationType(spec);

  let readme = `# ${spec.name}\n\n`;

  if (spec.description) {
    readme += `${spec.description}\n\n`;
  }

  readme += `## Overview\n\n`;
  readme += `- **Scene ID**: \`${spec.id}\`\n`;
  readme += `- **Version**: ${spec.version}\n`;
  readme += `- **Orchestration**: ${orchestrationType}\n`;
  readme += `- **Components**: ${spec.components.length}\n`;
  readme += `- **Viewport**: ${spec.viewport.width}x${spec.viewport.height}${spec.viewport.unit || 'px'}\n\n`;

  // Components section
  readme += `## Components\n\n`;
  for (const comp of spec.components) {
    readme += `### ${comp.name}\n\n`;
    readme += `- **Component ID**: \`${comp.componentId}\`\n`;
    if (comp.libraryId) {
      readme += `- **Library**: \`${comp.libraryId}\`\n`;
    }
    if (comp.artboardName) {
      readme += `- **Artboard**: \`${comp.artboardName}\`\n`;
    }
    if (comp.stateMachineName) {
      readme += `- **State Machine**: \`${comp.stateMachineName}\`\n`;
    }
    readme += `- **Position**: (${comp.transform.position?.x || 0}, ${comp.transform.position?.y || 0})\n`;
    readme += `- **Z-Index**: ${comp.zIndex || 0}\n\n`;
  }

  // Orchestration section
  if (spec.timeline) {
    readme += `## Timeline\n\n`;
    readme += `- **Duration**: ${spec.timeline.duration}ms\n`;
    readme += `- **Loop**: ${spec.timeline.loop ? 'Yes' : 'No'}\n`;
    readme += `- **Tracks**: ${spec.timeline.tracks.length}\n\n`;
  }

  if (spec.states && spec.states.length > 0) {
    readme += `## States\n\n`;
    for (const state of spec.states) {
      readme += `### ${state.name}\n\n`;
      if (state.description) {
        readme += `${state.description}\n\n`;
      }
    }

    if (spec.transitions && spec.transitions.length > 0) {
      readme += `## Transitions\n\n`;
      readme += `| From | To | Duration |\n`;
      readme += `|------|----|---------|\n`;
      for (const trans of spec.transitions) {
        readme += `| ${trans.from} | ${trans.to} | ${trans.duration}ms |\n`;
      }
      readme += `\n`;
    }
  }

  // Inputs section
  if (spec.inputs && spec.inputs.length > 0) {
    readme += `## Inputs\n\n`;
    for (const input of spec.inputs) {
      readme += `### ${input.name}\n\n`;
      readme += `- **Type**: \`${input.type}\`\n`;
      if (input.description) {
        readme += `- **Description**: ${input.description}\n`;
      }
      if (input.defaultValue !== undefined) {
        readme += `- **Default**: \`${JSON.stringify(input.defaultValue)}\`\n`;
      }
      readme += `\n`;
    }
  }

  // Events section
  if (spec.events && spec.events.length > 0) {
    readme += `## Events\n\n`;
    for (const event of spec.events) {
      readme += `### ${event.name}\n\n`;
      if (event.description) {
        readme += `${event.description}\n\n`;
      }
    }
  }

  // Usage section
  readme += `## Usage\n\n`;
  readme += `\`\`\`typescript\n`;
  readme += `import { SceneRuntime } from '@astralismotion/scene-composer';\n`;
  readme += `import sceneSpec from './${spec.id}-scene.json';\n\n`;
  readme += `const runtime = new SceneRuntime({\n`;
  readme += `  spec: sceneSpec,\n`;
  readme += `  canvas: document.getElementById('canvas'),\n`;
  readme += `  autoPlay: true,\n`;
  readme += `});\n\n`;
  readme += `await runtime.initialize();\n`;
  readme += `\`\`\`\n\n`;

  return readme;
}
