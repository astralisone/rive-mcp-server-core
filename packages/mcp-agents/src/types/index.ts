/**
 * Core type definitions for the agent orchestration system
 */

export type AgentStatus = 'idle' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';

export type AgentPriority = 'low' | 'normal' | 'high' | 'critical';

export type WorkflowExecutionMode = 'parallel' | 'sequential' | 'conditional';

/**
 * Input schema for agent execution
 */
export interface AgentInput {
  [key: string]: any;
}

/**
 * Output from agent execution
 */
export interface AgentOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    retries?: number;
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Agent execution context
 */
export interface AgentContext {
  workflowId?: string;
  taskId: string;
  parentTaskId?: string;
  inputs: AgentInput;
  state: Map<string, any>;
  metadata: {
    startTime?: Date;
    endTime?: Date;
    retryCount: number;
    maxRetries: number;
    timeout?: number;
    priority: AgentPriority;
    [key: string]: any;
  };
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  description: string;
  version?: string;
  usesTools: string[];
  writes?: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  timeout?: number;
  maxRetries?: number;
  priority?: AgentPriority;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Agent lifecycle hooks
 */
export interface AgentLifecycleHooks {
  onInitialize?: (context: AgentContext) => Promise<void>;
  onBeforeExecute?: (context: AgentContext) => Promise<void>;
  onAfterExecute?: (context: AgentContext, output: AgentOutput) => Promise<void>;
  onError?: (context: AgentContext, error: Error) => Promise<void>;
  onCleanup?: (context: AgentContext) => Promise<void>;
}

/**
 * Base agent interface
 */
export interface IAgent {
  readonly config: AgentConfig;
  readonly status: AgentStatus;
  readonly context?: AgentContext;

  initialize(context: AgentContext): Promise<void>;
  execute(input: AgentInput): Promise<AgentOutput>;
  validate(input: AgentInput): Promise<boolean>;
  cleanup(): Promise<void>;
  cancel(): Promise<void>;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version?: string;
  steps: WorkflowStep[];
  config?: {
    mode?: WorkflowExecutionMode;
    failureStrategy?: 'abort' | 'continue' | 'retry';
    maxRetries?: number;
    timeout?: number;
    [key: string]: any;
  };
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  agentName: string;
  inputs: Record<string, any> | ((context: WorkflowContext) => Record<string, any>);
  outputs?: string[];
  dependsOn?: string[];
  condition?: (context: WorkflowContext) => boolean | Promise<boolean>;
  onError?: (error: Error, context: WorkflowContext) => Promise<void>;
  retry?: {
    maxAttempts: number;
    backoff?: 'linear' | 'exponential';
    delay?: number;
  };
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  inputs: Record<string, any>;
  outputs: Map<string, AgentOutput>;
  state: Map<string, any>;
  metadata: {
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    currentStep?: string;
    [key: string]: any;
  };
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  executionId: string;
  outputs: Map<string, AgentOutput>;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
  agent: IAgent;
  config: AgentConfig;
  metadata: {
    registered: Date;
    lastUsed?: Date;
    usageCount: number;
    [key: string]: any;
  };
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxConcurrentAgents?: number;
  defaultTimeout?: number;
  defaultMaxRetries?: number;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  queueStrategy?: 'fifo' | 'priority' | 'lifo';
}

/**
 * Task queue item
 */
export interface QueuedTask {
  id: string;
  agentName: string;
  context: AgentContext;
  priority: AgentPriority;
  queuedAt: Date;
  startAfter?: Date;
}

/**
 * MCP tool invocation
 */
export interface MCPToolInvocation {
  tool: string;
  parameters: Record<string, any>;
  timeout?: number;
}

/**
 * Performance metrics
 */
export interface AgentMetrics {
  agentName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted?: Date;
}

/**
 * Event types for agent lifecycle
 */
export enum AgentEvent {
  INITIALIZED = 'agent:initialized',
  STARTED = 'agent:started',
  COMPLETED = 'agent:completed',
  FAILED = 'agent:failed',
  CANCELLED = 'agent:cancelled',
  RETRY = 'agent:retry',
}

/**
 * Event types for workflow lifecycle
 */
export enum WorkflowEvent {
  STARTED = 'workflow:started',
  STEP_STARTED = 'workflow:step:started',
  STEP_COMPLETED = 'workflow:step:completed',
  STEP_FAILED = 'workflow:step:failed',
  COMPLETED = 'workflow:completed',
  FAILED = 'workflow:failed',
  CANCELLED = 'workflow:cancelled',
}

/**
 * Event payload
 */
export interface EventPayload {
  type: AgentEvent | WorkflowEvent;
  timestamp: Date;
  data: any;
}

/**
 * Event listener
 */
export type EventListener = (payload: EventPayload) => void | Promise<void>;
