# MCP Agents - Agent Orchestration System

A comprehensive agent orchestration framework for automating Rive component generation, validation, and optimization workflows.

## Overview

The MCP Agents system provides a robust orchestration layer for coordinating five specialized agents that automate the entire Rive component lifecycle:

1. **Motion Spec Agent** - Converts UX descriptions to CreationSpec JSON
2. **Wrapper Generator Agent** - Generates framework wrappers (React, Vue, Stencil)
3. **Scene Composer Agent** - Builds multi-component orchestrated scenes
4. **Telemetry Agent** - Analyzes performance metrics and optimizations
5. **QA Agent** - Validates components against runtime surfaces and rules

## Architecture

### Core Components

- **BaseAgent** - Abstract base class providing lifecycle management, retry logic, and event handling
- **Orchestrator** - Main orchestration engine managing agent registry, task queue, and execution
- **WorkflowEngine** - Executes multi-agent workflows with dependency management
- **MCPClient** - Connects to MCP server for tool invocation
- **TaskQueue** - Priority-based task scheduling with concurrency control

### Agent Lifecycle

```
Initialize → Validate Input → Execute (with retry) → Cleanup
```

Each agent follows a standardized lifecycle with automatic retry, error handling, and cleanup.

## Quick Start

### Installation

```bash
npm install @astralismotion/mcp-agents
```

### CLI Usage

```bash
# List available agents
mcp-agents agent:list

# Execute an agent
mcp-agents agent:run \
  --agent motion-spec-agent \
  --input '{"description": "Animated button with hover effect"}'

# Execute a workflow
mcp-agents workflow:generate \
  --description "Animated loading spinner" \
  --framework react \
  --qa
```

### Programmatic Usage

```typescript
import {
  Orchestrator,
  MotionSpecAgent,
  WrapperGeneratorAgent,
  MCPClient,
  createFullComponentWorkflow
} from '@astralismotion/mcp-agents';

// Initialize orchestrator
const orchestrator = new Orchestrator({
  maxConcurrentAgents: 5,
  enableMetrics: true
});

// Setup MCP client and register agents
const mcpClient = new MCPClient({
  serverCommand: 'node',
  serverArgs: ['./mcp-server/dist/index.js']
});
await mcpClient.connect();

orchestrator.registerAgent(new MotionSpecAgent(mcpClient));
orchestrator.registerAgent(new WrapperGeneratorAgent(mcpClient));

// Execute workflow
const workflow = createFullComponentWorkflow({
  description: 'Loading spinner',
  framework: 'react',
  includeQA: true
});

const result = await orchestrator.executeWorkflow(workflow, {
  description: 'Loading spinner'
});
```

## File Structure

```
/Users/gregorystarr/projects/rive-projects/rive-mcp-server-core/packages/mcp-agents/
├── index.ts                           # Main exports
├── package.json                       # Package configuration
├── tsconfig.json                      # TypeScript configuration
├── src/
│   ├── types/
│   │   └── index.ts                   # Type definitions
│   ├── core/
│   │   ├── BaseAgent.ts              # Base agent implementation
│   │   └── MCPClient.ts              # MCP client for tool invocation
│   ├── orchestrator/
│   │   ├── Orchestrator.ts           # Main orchestrator
│   │   ├── AgentRegistry.ts          # Agent registration
│   │   ├── TaskQueue.ts              # Task queue management
│   │   └── WorkflowEngine.ts         # Workflow execution
│   ├── agents/
│   │   ├── MotionSpecAgent.ts        # Motion spec generation
│   │   ├── WrapperGeneratorAgent.ts  # Wrapper generation
│   │   ├── SceneComposerAgent.ts     # Scene composition
│   │   ├── TelemetryAgent.ts         # Performance analysis
│   │   └── QAAgent.ts                # Quality validation
│   ├── workflows/
│   │   └── patterns.ts               # Workflow patterns & templates
│   ├── config/
│   │   └── index.ts                  # Configuration management
│   ├── cli/
│   │   └── index.ts                  # CLI interface
│   └── api/
│       └── server.ts                 # REST API server
└── agents/
    ├── motion-spec-agent.json        # Agent configuration
    ├── wrapper-generator-agent.json
    ├── scene-composer-agent.json
    ├── telemetry-agent.json
    └── qa-agent.json
```

## Workflows

### Full Component Generation

Generates complete component from description through wrapper to scene:

```typescript
const workflow = createFullComponentWorkflow({
  description: 'Animated toggle switch',
  framework: 'react',
  sceneName: 'settings-scene',
  includeQA: true
});
// Steps: Spec → Wrapper → Scene → QA
```

### QA Validation Pipeline

Validates multiple targets in parallel:

```typescript
const workflow = createQAValidationWorkflow([
  { type: 'wrapper', id: 'button-1', path: './components/button' },
  { type: 'scene', id: 'home-scene', path: './scenes/home' }
]);
```

### Performance Optimization

Analyzes performance and generates recommendations:

```typescript
const workflow = createPerformanceOptimizationWorkflow({
  componentId: 'complex-animation',
  componentPath: './components/complex-animation',
  threshold: { fps: 30, frameTime: 33 }
});
```

### Multi-Framework Generation

Generates wrappers for multiple frameworks in parallel:

```typescript
const workflow = createMultiFrameworkWorkflow({
  componentId: 'universal-button',
  frameworks: ['react', 'vue', 'stencil'],
  includeQA: true
});
```

### Scene Orchestration

Composes complex scenes from multiple components:

```typescript
const workflow = createSceneOrchestrationWorkflow({
  sceneName: 'dashboard',
  components: [
    { id: 'header', framework: 'react' },
    { id: 'sidebar', framework: 'react' },
    { id: 'chart', framework: 'react' }
  ],
  layout: 'grid'
});
```

## API Server

Start the REST API server:

```typescript
import { createAPIServer } from '@astralismotion/mcp-agents';

const server = createAPIServer({
  port: 3000,
  enableAuth: true,
  apiKey: 'your-api-key'
});

await server.start();
```

API Endpoints:

- `GET /api/agents` - List agents
- `POST /api/agents/:name/execute` - Execute agent
- `POST /api/workflows/full-component` - Full component workflow
- `POST /api/workflows/qa-validation` - QA validation workflow
- `GET /api/metrics` - Get metrics
- `GET /api/queue/stats` - Queue statistics

## Configuration

Create `mcp-agents.config.json`:

```json
{
  "orchestrator": {
    "maxConcurrentAgents": 5,
    "enableMetrics": true,
    "logLevel": "info"
  },
  "mcp": {
    "serverCommand": "node",
    "serverArgs": ["./dist/mcp-server/index.js"]
  },
  "agents": {
    "motion-spec-agent": {
      "enabled": true,
      "outputPath": "libs/motion-specs"
    }
  }
}
```

## Monitoring

Track agent performance:

```typescript
const metrics = orchestrator.getMetrics('motion-spec-agent');
console.log({
  totalExecutions: metrics.totalExecutions,
  successRate: metrics.successCount / metrics.totalExecutions,
  averageDuration: metrics.averageDuration
});
```

Monitor task queue:

```typescript
const stats = orchestrator.getQueueStats();
console.log({
  queued: stats.queued,
  processing: stats.processing,
  available: stats.available
});
```

## License

MIT