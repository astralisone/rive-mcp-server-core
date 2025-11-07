/**
 * Main orchestrator for managing agents and workflows
 */

import { EventEmitter } from 'events';
import {
  IAgent,
  AgentContext,
  AgentInput,
  AgentOutput,
  WorkflowDefinition,
  WorkflowResult,
  OrchestratorConfig,
  QueuedTask,
  AgentMetrics,
} from '../types';
import { AgentRegistry } from './AgentRegistry';
import { TaskQueue } from './TaskQueue';
import { WorkflowEngine } from './WorkflowEngine';
import { v4 as uuidv4 } from 'uuid';

export class Orchestrator extends EventEmitter {
  private registry: AgentRegistry;
  private queue: TaskQueue;
  private engine: WorkflowEngine;
  private config: OrchestratorConfig;
  private metrics: Map<string, AgentMetrics>;

  constructor(config?: OrchestratorConfig) {
    super();

    this.config = {
      maxConcurrentAgents: 5,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      enableMetrics: true,
      enableLogging: true,
      logLevel: 'info',
      queueStrategy: 'priority',
      ...config,
    };

    this.registry = new AgentRegistry();
    this.queue = new TaskQueue(
      this.config.maxConcurrentAgents!,
      this.config.queueStrategy!
    );
    this.engine = new WorkflowEngine(this.registry);
    this.metrics = new Map();

    this.setupEventHandlers();
  }

  /**
   * Register an agent
   */
  registerAgent(agent: IAgent): void {
    this.registry.register(agent);
    this.log('info', `Agent registered: ${agent.config.name}`);

    // Initialize metrics
    if (this.config.enableMetrics) {
      this.metrics.set(agent.config.name, {
        agentName: agent.config.name,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      });
    }
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(name: string): void {
    this.registry.unregister(name);
    this.metrics.delete(name);
    this.log('info', `Agent unregistered: ${name}`);
  }

  /**
   * Execute agent directly
   */
  async executeAgent(
    agentName: string,
    input: AgentInput,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      maxRetries?: number;
    }
  ): Promise<AgentOutput> {
    const agent = this.registry.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const taskId = uuidv4();
    const context: AgentContext = {
      taskId,
      inputs: input,
      state: new Map(),
      metadata: {
        retryCount: 0,
        maxRetries: options?.maxRetries || this.config.defaultMaxRetries!,
        timeout: options?.timeout || this.config.defaultTimeout,
        priority: options?.priority || 'normal',
      },
    };

    // Initialize agent
    await agent.initialize(context);

    // Execute
    const startTime = Date.now();
    const output = await agent.execute(input);
    const duration = Date.now() - startTime;

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(agentName, output.success, duration);
    }

    // Cleanup
    await agent.cleanup();

    return output;
  }

  /**
   * Queue agent execution
   */
  async queueAgent(
    agentName: string,
    input: AgentInput,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      maxRetries?: number;
      startAfter?: Date;
    }
  ): Promise<string> {
    const agent = this.registry.get(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const taskId = uuidv4();
    const context: AgentContext = {
      taskId,
      inputs: input,
      state: new Map(),
      metadata: {
        retryCount: 0,
        maxRetries: options?.maxRetries || this.config.defaultMaxRetries!,
        timeout: options?.timeout || this.config.defaultTimeout,
        priority: options?.priority || 'normal',
      },
    };

    const task: QueuedTask = {
      id: taskId,
      agentName,
      context,
      priority: options?.priority || 'normal',
      queuedAt: new Date(),
      startAfter: options?.startAfter,
    };

    this.queue.enqueue(task);
    this.log('info', `Task queued: ${taskId} for agent: ${agentName}`);

    return taskId;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    inputs: Record<string, any>
  ): Promise<WorkflowResult> {
    this.log('info', `Starting workflow: ${workflow.id}`);
    const result = await this.engine.execute(workflow, inputs);
    this.log('info', `Workflow completed: ${workflow.id}`, { result });
    return result;
  }

  /**
   * Get agent metrics
   */
  getMetrics(agentName?: string): AgentMetrics | Map<string, AgentMetrics> {
    if (agentName) {
      const metrics = this.metrics.get(agentName);
      if (!metrics) {
        throw new Error(`No metrics found for agent: ${agentName}`);
      }
      return metrics;
    }
    return new Map(this.metrics);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }

  /**
   * List registered agents
   */
  listAgents() {
    return this.registry.list();
  }

  /**
   * Find agents by criteria
   */
  findAgents(criteria: { tag?: string; tool?: string }) {
    if (criteria.tag) {
      return this.registry.findByTag(criteria.tag);
    }
    if (criteria.tool) {
      return this.registry.findByTool(criteria.tool);
    }
    return [];
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down orchestrator');
    this.queue.clear();
    this.registry.clear();
    this.removeAllListeners();
  }

  /**
   * Update agent metrics
   */
  private updateMetrics(
    agentName: string,
    success: boolean,
    duration: number
  ): void {
    const metrics = this.metrics.get(agentName);
    if (!metrics) {
      return;
    }

    metrics.totalExecutions++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);

    // Update average duration
    metrics.averageDuration =
      (metrics.averageDuration * (metrics.totalExecutions - 1) + duration) /
      metrics.totalExecutions;

    metrics.lastExecuted = new Date();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Queue events
    this.queue.on('taskStarted', async (task: QueuedTask) => {
      try {
        const agent = this.registry.get(task.agentName);
        if (!agent) {
          this.queue.fail(task.id, new Error(`Agent not found: ${task.agentName}`));
          return;
        }

        await agent.initialize(task.context);
        const startTime = Date.now();
        const output = await agent.execute(task.context.inputs);
        const duration = Date.now() - startTime;

        if (this.config.enableMetrics) {
          this.updateMetrics(task.agentName, output.success, duration);
        }

        await agent.cleanup();
        this.queue.complete(task.id);
      } catch (error) {
        this.queue.fail(task.id, error as Error);
      }
    });

    // Workflow events
    this.engine.on('event', (payload) => {
      this.emit('workflowEvent', payload);
    });
  }

  /**
   * Log message
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableLogging) {
      return;
    }

    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel!);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const logData = data ? ` ${JSON.stringify(data)}` : '';
      console[level as 'log'](`[Orchestrator] ${message}${logData}`);
    }
  }
}
