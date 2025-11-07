/**
 * Base agent implementation providing common functionality
 */

import { EventEmitter } from 'events';
import {
  IAgent,
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentLifecycleHooks,
  AgentEvent,
  EventPayload,
} from '../types';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  private _status: AgentStatus = 'idle';
  private _context?: AgentContext;
  private readonly hooks: AgentLifecycleHooks;

  constructor(
    public readonly config: AgentConfig,
    hooks?: AgentLifecycleHooks
  ) {
    super();
    this.hooks = hooks || {};
  }

  get status(): AgentStatus {
    return this._status;
  }

  get context(): AgentContext | undefined {
    return this._context;
  }

  /**
   * Initialize the agent with context
   */
  async initialize(context: AgentContext): Promise<void> {
    this.setStatus('initializing');
    this._context = context;

    try {
      await this.hooks.onInitialize?.(context);
      await this.onInitialize(context);
      this.setStatus('idle');
      this.emitEvent(AgentEvent.INITIALIZED, { config: this.config, context });
    } catch (error) {
      this.setStatus('failed');
      throw error;
    }
  }

  /**
   * Execute the agent with given input
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    if (!this._context) {
      throw new Error('Agent not initialized');
    }

    const startTime = Date.now();
    this.setStatus('running');
    this._context.metadata.startTime = new Date();

    try {
      // Validate input
      const isValid = await this.validate(input);
      if (!isValid) {
        throw new Error('Invalid input for agent');
      }

      await this.hooks.onBeforeExecute?.(this._context);
      this.emitEvent(AgentEvent.STARTED, { input });

      // Execute agent logic with retry
      const output = await this.executeWithRetry(input);

      this._context.metadata.endTime = new Date();
      await this.hooks.onAfterExecute?.(this._context, output);

      this.setStatus('completed');
      this.emitEvent(AgentEvent.COMPLETED, { output, duration: Date.now() - startTime });

      return output;
    } catch (error) {
      this._context.metadata.endTime = new Date();
      await this.hooks.onError?.(this._context, error as Error);

      this.setStatus('failed');
      this.emitEvent(AgentEvent.FAILED, { error: (error as Error).message });

      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(input: AgentInput): Promise<AgentOutput> {
    const maxRetries = this._context?.metadata.maxRetries || this.config.maxRetries || 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.emitEvent(AgentEvent.RETRY, { attempt, maxRetries });
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }

        const output = await this.doExecute(input);

        if (this._context) {
          this._context.metadata.retryCount = attempt;
        }

        return output;
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError || new Error('Unknown error during execution');
  }

  /**
   * Validate input against schema
   */
  async validate(input: AgentInput): Promise<boolean> {
    if (!this.config.inputSchema) {
      return true;
    }

    return this.doValidate(input);
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this._context) {
        await this.hooks.onCleanup?.(this._context);
      }
      await this.doCleanup();
      this._context = undefined;
      this.setStatus('idle');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Cancel agent execution
   */
  async cancel(): Promise<void> {
    this.setStatus('cancelled');
    this.emitEvent(AgentEvent.CANCELLED, {});
    await this.cleanup();
  }

  /**
   * Set agent status and emit status change event
   */
  protected setStatus(status: AgentStatus): void {
    this._status = status;
    this.emit('statusChange', status);
  }

  /**
   * Emit agent event
   */
  protected emitEvent(type: AgentEvent, data: any): void {
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
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get value from context state
   */
  protected getState<T = any>(key: string): T | undefined {
    return this._context?.state.get(key);
  }

  /**
   * Set value in context state
   */
  protected setState(key: string, value: any): void {
    this._context?.state.set(key, value);
  }

  // Abstract methods to be implemented by concrete agents

  /**
   * Initialize agent-specific resources
   */
  protected abstract onInitialize(context: AgentContext): Promise<void>;

  /**
   * Execute agent-specific logic
   */
  protected abstract doExecute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Validate agent-specific input
   */
  protected abstract doValidate(input: AgentInput): Promise<boolean>;

  /**
   * Cleanup agent-specific resources
   */
  protected abstract doCleanup(): Promise<void>;
}
