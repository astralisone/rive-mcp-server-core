/**
 * Workflow engine for orchestrating multi-agent workflows
 */

import { EventEmitter } from 'events';
import {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  AgentOutput,
  WorkflowEvent,
  EventPayload,
} from '../types';
import { AgentRegistry } from './AgentRegistry';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowEngine extends EventEmitter {
  constructor(private registry: AgentRegistry) {
    super();
  }

  /**
   * Execute workflow
   */
  async execute(
    workflow: WorkflowDefinition,
    inputs: Record<string, any>
  ): Promise<WorkflowResult> {
    const executionId = uuidv4();
    const context: WorkflowContext = {
      workflowId: workflow.id,
      executionId,
      inputs,
      outputs: new Map(),
      state: new Map(),
      metadata: {
        startTime: new Date(),
        status: 'running',
      },
    };

    this.emitWorkflowEvent(WorkflowEvent.STARTED, { workflow, context });

    try {
      // Build dependency graph
      const graph = this.buildDependencyGraph(workflow.steps);

      // Execute steps based on mode
      switch (workflow.config?.mode || 'sequential') {
        case 'parallel':
          await this.executeParallel(workflow, context, graph);
          break;
        case 'sequential':
          await this.executeSequential(workflow, context, graph);
          break;
        case 'conditional':
          await this.executeConditional(workflow, context, graph);
          break;
      }

      context.metadata.status = 'completed';
      context.metadata.endTime = new Date();

      const result: WorkflowResult = {
        success: true,
        workflowId: workflow.id,
        executionId,
        outputs: context.outputs,
        duration: context.metadata.endTime.getTime() - context.metadata.startTime.getTime(),
      };

      this.emitWorkflowEvent(WorkflowEvent.COMPLETED, { result });
      return result;
    } catch (error) {
      context.metadata.status = 'failed';
      context.metadata.endTime = new Date();

      const result: WorkflowResult = {
        success: false,
        workflowId: workflow.id,
        executionId,
        outputs: context.outputs,
        duration: context.metadata.endTime!.getTime() - context.metadata.startTime.getTime(),
        error: (error as Error).message,
      };

      this.emitWorkflowEvent(WorkflowEvent.FAILED, { error, result });
      return result;
    }
  }

  /**
   * Execute steps in parallel
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    graph: Map<string, string[]>
  ): Promise<void> {
    const levels = this.topologicalSort(graph);

    for (const level of levels) {
      const stepPromises = level.map(stepId => {
        const step = workflow.steps.find(s => s.id === stepId)!;
        return this.executeStep(step, context);
      });

      await Promise.all(stepPromises);
    }
  }

  /**
   * Execute steps sequentially
   */
  private async executeSequential(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    graph: Map<string, string[]>
  ): Promise<void> {
    const order = this.topologicalSortFlat(graph);

    for (const stepId of order) {
      const step = workflow.steps.find(s => s.id === stepId)!;
      await this.executeStep(step, context);
    }
  }

  /**
   * Execute steps conditionally
   */
  private async executeConditional(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    graph: Map<string, string[]>
  ): Promise<void> {
    const order = this.topologicalSortFlat(graph);

    for (const stepId of order) {
      const step = workflow.steps.find(s => s.id === stepId)!;

      // Check condition
      if (step.condition) {
        const shouldExecute = await step.condition(context);
        if (!shouldExecute) {
          continue;
        }
      }

      await this.executeStep(step, context);
    }
  }

  /**
   * Execute single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<void> {
    context.metadata.currentStep = step.id;
    this.emitWorkflowEvent(WorkflowEvent.STEP_STARTED, { step, context });

    try {
      // Get agent
      const agent = this.registry.get(step.agentName);
      if (!agent) {
        throw new Error(`Agent not found: ${step.agentName}`);
      }

      // Resolve step inputs
      const inputs = typeof step.inputs === 'function'
        ? step.inputs(context)
        : this.resolveInputs(step.inputs, context);

      // Initialize agent if needed
      if (agent.status === 'idle') {
        await agent.initialize({
          workflowId: context.workflowId,
          taskId: `${context.executionId}-${step.id}`,
          inputs,
          state: context.state,
          metadata: {
            retryCount: 0,
            maxRetries: step.retry?.maxAttempts || 3,
            priority: 'normal',
          },
        });
      }

      // Execute with retry
      const output = await this.executeWithRetry(agent, inputs, step);

      // Store output
      context.outputs.set(step.id, output);

      // Store named outputs
      if (step.outputs && output.data) {
        step.outputs.forEach(key => {
          if (key in output.data) {
            context.state.set(key, output.data[key]);
          }
        });
      }

      this.emitWorkflowEvent(WorkflowEvent.STEP_COMPLETED, { step, output });
    } catch (error) {
      this.emitWorkflowEvent(WorkflowEvent.STEP_FAILED, { step, error });

      // Handle error
      if (step.onError) {
        await step.onError(error as Error, context);
      }

      throw error;
    }
  }

  /**
   * Execute step with retry logic
   */
  private async executeWithRetry(
    agent: any,
    inputs: any,
    step: WorkflowStep
  ): Promise<AgentOutput> {
    const maxAttempts = step.retry?.maxAttempts || 1;
    const backoff = step.retry?.backoff || 'linear';
    const delay = step.retry?.delay || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate backoff delay
          const backoffDelay = backoff === 'exponential'
            ? delay * Math.pow(2, attempt)
            : delay * (attempt + 1);

          await this.sleep(backoffDelay);
        }

        return await agent.execute(inputs);
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts - 1) {
          break;
        }
      }
    }

    throw lastError || new Error('Unknown error during step execution');
  }

  /**
   * Resolve input values from context
   */
  private resolveInputs(
    inputs: Record<string, any>,
    context: WorkflowContext
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to context value
        const refKey = value.substring(1);
        resolved[key] = context.state.get(refKey) || context.inputs[refKey];
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Build dependency graph from steps
   */
  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const step of steps) {
      graph.set(step.id, step.dependsOn || []);
    }

    return graph;
  }

  /**
   * Topological sort for parallel execution
   */
  private topologicalSort(graph: Map<string, string[]>): string[][] {
    const levels: string[][] = [];
    const inDegree = new Map<string, number>();
    const processed = new Set<string>();

    // Calculate in-degrees
    for (const [node, deps] of graph.entries()) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    while (processed.size < graph.size) {
      const level: string[] = [];

      for (const [node, degree] of inDegree.entries()) {
        if (degree === 0 && !processed.has(node)) {
          level.push(node);
        }
      }

      if (level.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      levels.push(level);

      for (const node of level) {
        processed.add(node);
        const deps = graph.get(node) || [];
        for (const dep of deps) {
          inDegree.set(dep, (inDegree.get(dep) || 0) - 1);
        }
      }
    }

    return levels;
  }

  /**
   * Topological sort for sequential execution
   */
  private topologicalSortFlat(graph: Map<string, string[]>): string[] {
    const levels = this.topologicalSort(graph);
    return levels.flat();
  }

  /**
   * Emit workflow event
   */
  private emitWorkflowEvent(type: WorkflowEvent, data: any): void {
    const payload: EventPayload = {
      type,
      timestamp: new Date(),
      data,
    };
    this.emit('event', payload);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
