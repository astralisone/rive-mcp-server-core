# Agent Orchestration Architecture

## System Overview

The MCP Agents orchestration system is a sophisticated automation framework designed to coordinate multiple specialized agents that handle the entire Rive component lifecycle. The architecture follows enterprise-grade patterns for reliability, scalability, and maintainability.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   CLI    │  │   API    │  │  Direct  │  │ Custom   │       │
│  │Interface │  │ Server   │  │  Import  │  │Integration│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     Orchestrator Core       │
        │  ┌──────────────────────┐  │
        │  │  Configuration Mgr   │  │
        │  └──────────────────────┘  │
        │  ┌──────────────────────┐  │
        │  │   Agent Registry     │  │
        │  └──────────────────────┘  │
        │  ┌──────────────────────┐  │
        │  │    Task Queue        │  │
        │  └──────────────────────┘  │
        │  ┌──────────────────────┐  │
        │  │  Workflow Engine     │  │
        │  └──────────────────────┘  │
        │  ┌──────────────────────┐  │
        │  │  Metrics Collector   │  │
        │  └──────────────────────┘  │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     Agent Execution Layer   │
        │  ┌────┐ ┌────┐ ┌────┐ ┌───┐│
        │  │ MS │ │ WG │ │ SC │ │...││
        │  │Agt │ │Agt │ │Agt │ │   ││
        │  └──┬─┘ └──┬─┘ └──┬─┘ └─┬─┘│
        └─────┼──────┼──────┼──────┼───┘
              │      │      │      │
        ┌─────▼──────▼──────▼──────▼───┐
        │      MCP Client Pool          │
        └─────────────┬──────────────────┘
                      │
        ┌─────────────▼──────────────────┐
        │       MCP Server Layer          │
        │  ┌──────────────────────────┐  │
        │  │   Tool Implementations   │  │
        │  │  - list_libraries        │  │
        │  │  - generate_wrapper      │  │
        │  │  - compose_scene         │  │
        │  │  - analyze_performance   │  │
        │  └──────────────────────────┘  │
        └─────────────────────────────────┘
```

## Component Responsibilities

### 1. Orchestrator Core

**Purpose:** Central coordination and management of all agent operations.

**Responsibilities:**
- Agent registration and lifecycle management
- Task queue management with priority scheduling
- Workflow execution and dependency resolution
- Metrics collection and aggregation
- Error handling and retry coordination

**Key Classes:**
- `Orchestrator` - Main orchestration engine
- `AgentRegistry` - Agent discovery and management
- `TaskQueue` - Priority-based task scheduling
- `WorkflowEngine` - Multi-agent workflow execution
- `ConfigManager` - Configuration management

### 2. Agent Execution Layer

**Purpose:** Individual agent implementations with specialized capabilities.

**Responsibilities:**
- Execute specific domain tasks
- Manage agent-specific state and resources
- Validate inputs and outputs
- Handle errors and retries
- Emit lifecycle events

**Agents:**

1. **Motion Spec Agent**
   - Input: UX description
   - Output: CreationSpec JSON
   - MCP Tools: list_libraries, list_components
   - Location: libs/motion-specs/

2. **Wrapper Generator Agent**
   - Input: Component ID, framework
   - Output: Framework wrapper code
   - MCP Tools: get_runtime_surface, generate_wrapper
   - Location: libs/rive-components/

3. **Scene Composer Agent**
   - Input: Scene definition, components
   - Output: Orchestrated scene
   - MCP Tools: compose_scene
   - Location: libs/motion-scenes/

4. **Telemetry Agent**
   - Input: Performance metrics
   - Output: Analysis and recommendations
   - MCP Tools: analyze_performance
   - Location: N/A (analysis only)

5. **QA Agent**
   - Input: Target component/scene
   - Output: Validation report
   - MCP Tools: get_runtime_surface
   - Location: libs/motion-qa/

### 3. MCP Integration Layer

**Purpose:** Abstract MCP server communication and connection pooling.

**Responsibilities:**
- Maintain persistent connections to MCP servers
- Pool and reuse connections
- Handle connection failures and reconnection
- Translate agent requests to MCP tool invocations
- Manage timeouts and error propagation

**Key Classes:**
- `MCPClient` - Individual MCP server connection
- `MCPClientPool` - Connection pool management

## Agent Lifecycle

Each agent follows a standardized lifecycle:

```
┌──────────────┐
│   Created    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Initialize() │ ← Connect MCP, setup resources
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Validate()  │ ← Check input parameters
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Execute()   │ ← Run agent logic (with retry)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Cleanup()   │ ← Release resources
└──────────────┘
```

### Event Emission

Agents emit events at each lifecycle stage:

- `agent:initialized` - Initialization complete
- `agent:started` - Execution started
- `agent:retry` - Retry attempt
- `agent:completed` - Execution successful
- `agent:failed` - Execution failed
- `agent:cancelled` - Execution cancelled

## Workflow Execution

Workflows orchestrate multiple agents with dependency management:

### Execution Modes

1. **Sequential** - Execute steps in order
2. **Parallel** - Execute independent steps concurrently
3. **Conditional** - Execute steps based on conditions

### Dependency Resolution

The WorkflowEngine uses topological sorting to determine execution order:

```typescript
// Example workflow with dependencies
{
  steps: [
    { id: 'step-1', agentName: 'agent-A' },
    { id: 'step-2', agentName: 'agent-B', dependsOn: ['step-1'] },
    { id: 'step-3', agentName: 'agent-C', dependsOn: ['step-1'] },
    { id: 'step-4', agentName: 'agent-D', dependsOn: ['step-2', 'step-3'] }
  ]
}
```

Execution order:
```
Level 0: [step-1]
Level 1: [step-2, step-3]  // Parallel
Level 2: [step-4]
```

### Data Flow

Data flows between workflow steps using a shared context:

```typescript
// Step 1 output
{ componentId: 'button-1', spec: {...} }

// Step 2 input (references step 1 output)
{ componentId: '$componentId' }  // Resolves to 'button-1'
```

## Task Queue Management

### Priority Scheduling

Tasks are scheduled based on priority:

```
Priority Order: critical > high > normal > low
```

Within same priority, tasks are FIFO by default.

### Concurrency Control

The queue limits concurrent executions:

```typescript
{
  maxConcurrentAgents: 5  // Max 5 agents running simultaneously
}
```

### Queue Strategies

1. **FIFO** - First In First Out
2. **LIFO** - Last In First Out
3. **Priority** - Priority-based with FIFO tie-breaking

## Error Handling

### Retry Strategy

Agents automatically retry on failure with exponential backoff:

```typescript
// Retry configuration
{
  maxRetries: 3,
  backoff: 'exponential',  // delay = baseDelay * 2^attempt
  baseDelay: 1000          // 1s, 2s, 4s
}
```

### Failure Strategies

Workflows can handle failures differently:

1. **Abort** - Stop entire workflow on first failure
2. **Continue** - Continue with remaining steps
3. **Retry** - Retry failed step before continuing

### Error Propagation

```
Agent Error → Agent Output (success: false)
             ↓
Workflow Step Failed → Failure Strategy Applied
             ↓
Workflow Result (success: false if critical)
```

## Configuration Management

### Configuration Hierarchy

```
1. Default Configuration (built-in)
2. File Configuration (mcp-agents.config.json)
3. Runtime Configuration (programmatic)
4. Environment Variables (optional)
```

### Configuration Sections

```typescript
{
  orchestrator: {     // Orchestrator settings
    maxConcurrentAgents: 5,
    enableMetrics: true
  },
  mcp: {              // MCP connection
    serverCommand: 'node',
    serverArgs: ['./server.js']
  },
  agents: {           // Agent-specific settings
    'motion-spec-agent': {
      outputPath: 'libs/motion-specs'
    }
  },
  workflows: {        // Workflow configuration
    'full-component': {
      enabled: true
    }
  },
  api: {              // API server settings
    port: 3000,
    enableAuth: true
  }
}
```

## Metrics and Monitoring

### Agent Metrics

Tracked per agent:

```typescript
{
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted: Date;
}
```

### Queue Metrics

Real-time queue statistics:

```typescript
{
  queued: number;       // Tasks in queue
  processing: number;   // Currently executing
  capacity: number;     // Max concurrent
  available: number;    // Available slots
}
```

### Event Monitoring

Subscribe to orchestrator events:

```typescript
orchestrator.on('workflowEvent', (event) => {
  console.log(`[${event.type}] ${event.data}`);
});
```

## Security Considerations

### API Authentication

```typescript
{
  api: {
    enableAuth: true,
    apiKey: 'secret-key'
  }
}
```

All API requests require:
```
Authorization: Bearer <api-key>
```

### Input Validation

All agents validate inputs before execution:

```typescript
async doValidate(input: AgentInput): Promise<boolean> {
  // Check required fields
  // Validate types
  // Sanitize values
}
```

### Resource Limits

Prevent resource exhaustion:

```typescript
{
  timeout: 120000,        // Max execution time
  maxRetries: 3,          // Max retry attempts
  maxConcurrentAgents: 5  // Max parallel executions
}
```

## Scalability

### Horizontal Scaling

Multiple orchestrator instances can run in parallel:

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│Orchestrator│   │Orchestrator│   │Orchestrator│
│ Instance 1 │   │ Instance 2 │   │ Instance 3 │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │                │                │
      └────────────────┴────────────────┘
                       │
              ┌────────▼────────┐
              │  Shared MCP     │
              │  Server Pool    │
              └─────────────────┘
```

### Vertical Scaling

Adjust concurrency per instance:

```typescript
{
  maxConcurrentAgents: 10  // Increase for more parallelism
}
```

### Load Balancing

Distribute requests across instances using:
- Round-robin
- Least connections
- Random selection

## Extension Points

### Custom Agents

Extend BaseAgent to create custom agents:

```typescript
class CustomAgent extends BaseAgent {
  protected async onInitialize(context: AgentContext): Promise<void> {
    // Custom initialization
  }

  protected async doExecute(input: AgentInput): Promise<AgentOutput> {
    // Custom execution logic
  }
}
```

### Custom Workflows

Build workflows using WorkflowBuilder:

```typescript
const workflow = new WorkflowBuilder()
  .id('custom-workflow')
  .name('Custom Workflow')
  .addStep({...})
  .addStep({...})
  .build();
```

### Custom MCP Tools

Add new MCP tools and reference in agents:

```typescript
{
  usesTools: ['custom_tool_1', 'custom_tool_2']
}
```

## Performance Optimization

### Connection Pooling

Reuse MCP connections across agents:

```typescript
const pool = new MCPClientPool();
pool.register('default', {...});
const client = await pool.getClient('default');
```

### Lazy Initialization

Agents initialize only when needed:

```typescript
if (agent.status === 'idle') {
  await agent.initialize(context);
}
```

### Parallel Execution

Execute independent workflow steps in parallel:

```typescript
{
  mode: 'parallel',
  steps: [step1, step2, step3]  // All run concurrently
}
```

### Caching

Cache frequently used data:

```typescript
// Cache runtime surfaces
const runtimeSurface = cache.get(componentId) ||
  await fetchRuntimeSurface(componentId);
```

## Testing Strategy

### Unit Tests

Test individual components in isolation:

```typescript
describe('MotionSpecAgent', () => {
  it('should generate valid spec', async () => {
    const agent = new MotionSpecAgent(mockMCPClient);
    const result = await agent.execute({...});
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

Test agent orchestration:

```typescript
describe('Orchestrator', () => {
  it('should execute workflow', async () => {
    const result = await orchestrator.executeWorkflow(workflow, inputs);
    expect(result.success).toBe(true);
  });
});
```

### End-to-End Tests

Test complete workflows:

```typescript
describe('Full Component Workflow', () => {
  it('should generate component end-to-end', async () => {
    const workflow = createFullComponentWorkflow({...});
    const result = await orchestrator.executeWorkflow(workflow, inputs);

    // Verify all outputs exist
    expect(fs.existsSync(result.outputs.get('spec'))).toBe(true);
    expect(fs.existsSync(result.outputs.get('wrapper'))).toBe(true);
  });
});
```

## Future Enhancements

1. **Distributed Execution** - Execute agents across multiple machines
2. **Persistent Queue** - Save queue state to database
3. **Workflow Versioning** - Version control for workflow definitions
4. **Visual Workflow Builder** - GUI for building workflows
5. **Real-time Monitoring** - Dashboard for monitoring execution
6. **Agent Marketplace** - Share and discover custom agents
7. **Advanced Scheduling** - Cron-like scheduling for workflows
8. **Webhook Integration** - Trigger workflows via webhooks
9. **Audit Logging** - Detailed execution logs for compliance
10. **Multi-tenant Support** - Isolate agents per tenant

## Directory Structure

```
/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/packages/mcp-agents/
├── src/
│   ├── types/           # Type definitions
│   ├── core/            # Core framework
│   ├── orchestrator/    # Orchestration engine
│   ├── agents/          # Agent implementations
│   ├── workflows/       # Workflow patterns
│   ├── config/          # Configuration
│   ├── cli/             # CLI interface
│   └── api/             # API server
├── agents/              # Agent configs (JSON)
├── index.ts             # Main exports
├── package.json         # Package config
└── tsconfig.json        # TypeScript config
```
