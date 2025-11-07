/**
 * Common workflow patterns for agent orchestration
 */

import { WorkflowDefinition, WorkflowContext } from '../types';

/**
 * Full component generation workflow
 * Spec → Wrapper → Scene → QA
 */
export function createFullComponentWorkflow(config: {
  description: string;
  framework: 'react' | 'vue' | 'stencil';
  sceneName?: string;
  includeQA?: boolean;
}): WorkflowDefinition {
  const steps = [
    {
      id: 'generate-spec',
      agentName: 'motion-spec-agent',
      inputs: {
        description: config.description,
        framework: config.framework,
      },
      outputs: ['spec', 'componentId'],
    },
    {
      id: 'generate-wrapper',
      agentName: 'wrapper-generator-agent',
      inputs: {
        componentId: '$componentId',
        framework: config.framework,
        options: {
          typescript: true,
          includeTypes: true,
          includeTests: true,
        },
      },
      outputs: ['wrapper', 'componentPath'],
      dependsOn: ['generate-spec'],
    },
  ];

  // Add scene composition if scene name provided
  if (config.sceneName) {
    steps.push({
      id: 'compose-scene',
      agentName: 'scene-composer-agent',
      inputs: {
        components: [
          {
            id: '$componentId',
          },
        ],
        layout: 'flex',
      } as any,
      outputs: ['scene', 'scenePath'],
      dependsOn: ['generate-wrapper'],
    });
  }

  // Add QA validation if requested
  if (config.includeQA) {
    steps.push({
      id: 'qa-wrapper',
      agentName: 'qa-agent',
      inputs: {
        targetId: '$componentId',
        targetPath: '$componentPath',
      } as any,
      outputs: ['validation'],
      dependsOn: config.sceneName ? ['compose-scene'] : ['generate-wrapper'],
    });
  }

  return {
    id: 'full-component-generation',
    name: 'Full Component Generation',
    description: 'Generate component from spec through wrapper to scene with QA',
    version: '1.0.0',
    steps,
    config: {
      mode: 'sequential',
      failureStrategy: 'abort',
      maxRetries: 2,
    },
  };
}

/**
 * QA validation pipeline workflow
 * Validates multiple targets in parallel
 */
export function createQAValidationWorkflow(targets: Array<{
  type: 'wrapper' | 'scene' | 'spec';
  id: string;
  path?: string;
}>): WorkflowDefinition {
  const steps = targets.map((target, index) => ({
    id: `qa-${target.type}-${index}`,
    agentName: 'qa-agent',
    inputs: {
      targetType: target.type,
      targetId: target.id,
      targetPath: target.path,
    },
    outputs: [`validation-${index}`],
  }));

  return {
    id: 'qa-validation-pipeline',
    name: 'QA Validation Pipeline',
    description: 'Validate multiple targets in parallel',
    version: '1.0.0',
    steps,
    config: {
      mode: 'parallel',
      failureStrategy: 'continue',
      maxRetries: 1,
    },
  };
}

/**
 * Performance optimization workflow
 * Analyze → Generate optimizations → Re-validate
 */
export function createPerformanceOptimizationWorkflow(config: {
  componentId: string;
  componentPath: string;
  threshold?: {
    fps?: number;
    frameTime?: number;
    memory?: number;
  };
}): WorkflowDefinition {
  return {
    id: 'performance-optimization',
    name: 'Performance Optimization',
    description: 'Analyze performance and generate optimizations',
    version: '1.0.0',
    steps: [
      {
        id: 'analyze-performance',
        agentName: 'telemetry-agent',
        inputs: {
          componentId: config.componentId,
          threshold: config.threshold || {},
        },
        outputs: ['analysis', 'optimizations'],
      },
      {
        id: 'validate-post-optimization',
        agentName: 'qa-agent',
        inputs: {
          targetType: 'wrapper',
          targetId: config.componentId,
          targetPath: config.componentPath,
        },
        outputs: ['validation'],
        dependsOn: ['analyze-performance'],
        condition: async (context: WorkflowContext) => {
          const analysis = context.state.get('analysis');
          return analysis && analysis.status !== 'optimal';
        },
      },
    ],
    config: {
      mode: 'sequential',
      failureStrategy: 'continue',
      maxRetries: 1,
    },
  };
}

/**
 * Multi-framework wrapper generation workflow
 * Generates wrappers for multiple frameworks in parallel
 */
export function createMultiFrameworkWorkflow(config: {
  componentId: string;
  frameworks: Array<'react' | 'vue' | 'stencil'>;
  includeQA?: boolean;
}): WorkflowDefinition {
  const steps = config.frameworks.map((framework, index) => ({
    id: `generate-${framework}-wrapper`,
    agentName: 'wrapper-generator-agent',
    inputs: {
      componentId: config.componentId,
      framework,
      options: {
        typescript: true,
        includeTypes: true,
        includeTests: true,
      },
    },
    outputs: [`wrapper-${framework}`, `path-${framework}`],
  }));

  // Add QA for each framework if requested
  if (config.includeQA) {
    config.frameworks.forEach((framework, index) => {
      steps.push({
        id: `qa-${framework}`,
        agentName: 'qa-agent',
        inputs: {
          targetId: `${config.componentId}-${framework}`,
          targetPath: `$path-${framework}`,
        } as any,
        outputs: [`validation-${framework}`],
        dependsOn: [`generate-${framework}-wrapper`],
      } as any);
    });
  }

  return {
    id: 'multi-framework-generation',
    name: 'Multi-Framework Wrapper Generation',
    description: 'Generate wrappers for multiple frameworks in parallel',
    version: '1.0.0',
    steps,
    config: {
      mode: 'parallel',
      failureStrategy: 'continue',
      maxRetries: 2,
    },
  };
}

/**
 * Scene orchestration workflow
 * Composes scene from multiple components with validation
 */
export function createSceneOrchestrationWorkflow(config: {
  sceneName: string;
  components: Array<{
    id: string;
    framework: 'react' | 'vue' | 'stencil';
  }>;
  layout?: 'grid' | 'flex' | 'absolute';
  orchestration?: any;
}): WorkflowDefinition {
  // Generate wrappers for each component if needed
  const wrapperSteps = config.components.map((component, index) => ({
    id: `generate-wrapper-${index}`,
    agentName: 'wrapper-generator-agent',
    inputs: {
      componentId: component.id,
      framework: component.framework,
      options: {
        typescript: true,
        includeTypes: true,
      },
    },
    outputs: [`wrapper-${index}`],
  }));

  // Compose scene
  const sceneStep = {
    id: 'compose-scene',
    agentName: 'scene-composer-agent',
    inputs: {
      sceneName: config.sceneName,
      components: config.components.map(c => ({ id: c.id })),
      layout: config.layout || 'flex',
      orchestration: config.orchestration,
    },
    outputs: ['scene', 'scenePath'],
    dependsOn: wrapperSteps.map((_, i) => `generate-wrapper-${i}`),
  };

  // Validate scene
  const qaStep = {
    id: 'qa-scene',
    agentName: 'qa-agent',
    inputs: {
      targetType: 'scene',
      targetId: config.sceneName,
      targetPath: '$scenePath',
    },
    outputs: ['validation'],
    dependsOn: ['compose-scene'],
  };

  return {
    id: 'scene-orchestration',
    name: 'Scene Orchestration',
    description: 'Compose and validate multi-component scene',
    version: '1.0.0',
    steps: [...wrapperSteps, sceneStep, qaStep],
    config: {
      mode: 'sequential',
      failureStrategy: 'abort',
      maxRetries: 2,
    },
  };
}

/**
 * Continuous validation workflow
 * Monitors and validates changes continuously
 */
export function createContinuousValidationWorkflow(config: {
  targets: Array<{
    type: 'wrapper' | 'scene' | 'spec';
    id: string;
    path: string;
  }>;
  interval?: number;
}): WorkflowDefinition {
  const qaSteps = config.targets.map((target, index) => ({
    id: `qa-${index}`,
    agentName: 'qa-agent',
    inputs: {
      targetType: target.type,
      targetId: target.id,
      targetPath: target.path,
    },
    outputs: [`validation-${index}`],
  }));

  const telemetrySteps = config.targets
    .filter(t => t.type === 'wrapper' || t.type === 'scene')
    .map((target, index) => ({
      id: `telemetry-${index}`,
      agentName: 'telemetry-agent',
      inputs: {
        [target.type === 'wrapper' ? 'componentId' : 'sceneName']: target.id,
      },
      outputs: [`analysis-${index}`],
      dependsOn: [`qa-${index}`],
      condition: async (context: WorkflowContext) => {
        const validation = context.state.get(`validation-${index}`);
        return validation && validation.valid;
      },
    }));

  return {
    id: 'continuous-validation',
    name: 'Continuous Validation',
    description: 'Continuously validate and analyze targets',
    version: '1.0.0',
    steps: [...qaSteps, ...telemetrySteps],
    config: {
      mode: 'parallel',
      failureStrategy: 'continue',
      maxRetries: 1,
    },
  };
}

/**
 * Custom workflow builder
 */
export class WorkflowBuilder {
  private workflow: Partial<WorkflowDefinition> = {
    steps: [],
  };

  id(id: string): this {
    this.workflow.id = id;
    return this;
  }

  name(name: string): this {
    this.workflow.name = name;
    return this;
  }

  description(description: string): this {
    this.workflow.description = description;
    return this;
  }

  version(version: string): this {
    this.workflow.version = version;
    return this;
  }

  addStep(step: WorkflowDefinition['steps'][0]): this {
    this.workflow.steps!.push(step);
    return this;
  }

  mode(mode: 'parallel' | 'sequential' | 'conditional'): this {
    if (!this.workflow.config) {
      this.workflow.config = {};
    }
    this.workflow.config.mode = mode;
    return this;
  }

  failureStrategy(strategy: 'abort' | 'continue' | 'retry'): this {
    if (!this.workflow.config) {
      this.workflow.config = {};
    }
    this.workflow.config.failureStrategy = strategy;
    return this;
  }

  maxRetries(retries: number): this {
    if (!this.workflow.config) {
      this.workflow.config = {};
    }
    this.workflow.config.maxRetries = retries;
    return this;
  }

  build(): WorkflowDefinition {
    if (!this.workflow.id || !this.workflow.name || !this.workflow.steps?.length) {
      throw new Error('Workflow must have id, name, and at least one step');
    }

    return this.workflow as WorkflowDefinition;
  }
}
