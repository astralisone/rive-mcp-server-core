# Quick Start Guide

## Installation

```bash
cd /Users/gregorystarr/projects/rive-projects/rive-mcp-server-core
npm install
```

## Basic Usage

### 1. Programmatic Usage

```typescript
import {
  Orchestrator,
  MCPClient,
  MotionSpecAgent,
  WrapperGeneratorAgent,
  SceneComposerAgent,
  TelemetryAgent,
  QAAgent,
  createFullComponentWorkflow
} from '@astralismotion/mcp-agents';

// Initialize orchestrator
const orchestrator = new Orchestrator({
  maxConcurrentAgents: 5,
  enableMetrics: true,
  logLevel: 'info'
});

// Setup MCP client
const mcpClient = new MCPClient({
  serverCommand: 'node',
  serverArgs: ['./packages/mcp-server/src/index.js']
});
await mcpClient.connect();

// Register agents
orchestrator.registerAgent(new MotionSpecAgent(mcpClient));
orchestrator.registerAgent(new WrapperGeneratorAgent(mcpClient));
orchestrator.registerAgent(new SceneComposerAgent(mcpClient));
orchestrator.registerAgent(new TelemetryAgent(mcpClient));
orchestrator.registerAgent(new QAAgent(mcpClient));

// Execute a workflow
const workflow = createFullComponentWorkflow({
  description: 'Animated button with hover effect',
  framework: 'react',
  includeQA: true
});

const result = await orchestrator.executeWorkflow(workflow, {
  description: 'Animated button with hover effect'
});

console.log('Success:', result.success);
console.log('Outputs:', result.outputs);
```

### 2. CLI Usage

```bash
# Build the package first
cd packages/mcp-agents
npm run build

# List available agents
./dist/cli/index.js agent:list

# Execute an agent
./dist/cli/index.js agent:run \
  --agent motion-spec-agent \
  --input '{"description": "Loading spinner with smooth animation"}'

# Execute a workflow
./dist/cli/index.js workflow:generate \
  --description "Toggle switch with slide animation" \
  --framework react \
  --qa

# Check metrics
./dist/cli/index.js metrics:show

# Queue stats
./dist/cli/index.js queue:stats
```

### 3. API Server

```typescript
import { createAPIServer } from '@astralismotion/mcp-agents';

// Create and start server
const server = createAPIServer({
  port: 3000,
  host: '0.0.0.0',
  enableAuth: true,
  apiKey: 'your-secret-key'
});

await server.start();
console.log('API server running on http://localhost:3000');
```

Then use the API:

```bash
# Health check
curl http://localhost:3000/health

# List agents
curl http://localhost:3000/api/agents

# Execute workflow
curl -X POST http://localhost:3000/api/workflows/full-component \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "description": "Animated loading bar",
    "framework": "react",
    "includeQA": true
  }'

# Get metrics
curl http://localhost:3000/api/metrics
```

## Common Workflows

### Full Component Generation

```typescript
import { createFullComponentWorkflow } from '@astralismotion/mcp-agents';

const workflow = createFullComponentWorkflow({
  description: 'Smooth animated toggle',
  framework: 'react',
  sceneName: 'settings-scene',
  includeQA: true
});

const result = await orchestrator.executeWorkflow(workflow, {
  description: 'Smooth animated toggle'
});

// Generated files:
// - libs/motion-specs/smooth-animated-toggle.spec.json
// - libs/rive-components/react/SmoothAnimatedToggle/...
// - libs/motion-scenes/settings-scene/... (if sceneName provided)
// - libs/motion-qa/smooth-animated-toggle-validation.json (if includeQA)
```

### Multi-Framework Generation

```typescript
import { createMultiFrameworkWorkflow } from '@astralismotion/mcp-agents';

const workflow = createMultiFrameworkWorkflow({
  componentId: 'universal-button',
  frameworks: ['react', 'vue', 'stencil'],
  includeQA: true
});

const result = await orchestrator.executeWorkflow(workflow, {
  componentId: 'universal-button',
  frameworks: ['react', 'vue', 'stencil']
});

// Generates wrappers for all 3 frameworks in parallel
```

### Performance Analysis

```typescript
import { createPerformanceOptimizationWorkflow } from '@astralismotion/mcp-agents';

const workflow = createPerformanceOptimizationWorkflow({
  componentId: 'complex-animation',
  componentPath: './components/complex-animation',
  threshold: {
    fps: 30,
    frameTime: 33,
    memory: 100 * 1024 * 1024
  }
});

const result = await orchestrator.executeWorkflow(workflow, {
  componentId: 'complex-animation'
});

// Returns performance analysis with optimization recommendations
```

### QA Validation

```typescript
import { createQAValidationWorkflow } from '@astralismotion/mcp-agents';

const workflow = createQAValidationWorkflow([
  { type: 'wrapper', id: 'button-1', path: './components/button' },
  { type: 'scene', id: 'home', path: './scenes/home' },
  { type: 'spec', id: 'loader', path: './specs/loader.json' }
]);

const result = await orchestrator.executeWorkflow(workflow, {
  targets: [...]
});

// Validates all targets in parallel
```

### Custom Workflow

```typescript
import { WorkflowBuilder } from '@astralismotion/mcp-agents';

const workflow = new WorkflowBuilder()
  .id('custom-pipeline')
  .name('Custom Processing')
  .addStep({
    id: 'generate-spec',
    agentName: 'motion-spec-agent',
    inputs: { description: '$description' },
    outputs: ['spec', 'componentId']
  })
  .addStep({
    id: 'generate-react',
    agentName: 'wrapper-generator-agent',
    inputs: { componentId: '$componentId', framework: 'react' },
    outputs: ['reactWrapper'],
    dependsOn: ['generate-spec']
  })
  .addStep({
    id: 'generate-vue',
    agentName: 'wrapper-generator-agent',
    inputs: { componentId: '$componentId', framework: 'vue' },
    outputs: ['vueWrapper'],
    dependsOn: ['generate-spec']
  })
  .mode('sequential')
  .failureStrategy('abort')
  .maxRetries(3)
  .build();

const result = await orchestrator.executeWorkflow(workflow, {
  description: 'My component'
});
```

## Agent Reference

### Motion Spec Agent

**Input:**
```typescript
{
  description: string;           // Component description
  componentType?: string;         // Optional type hint
  framework?: 'react'|'vue'|'stencil';
  outputPath?: string;           // Override output path
}
```

**Output:**
```typescript
{
  spec: CreationSpec;            // Generated spec
  filePath: string;              // Output file path
  fileName: string;              // Output file name
}
```

### Wrapper Generator Agent

**Input:**
```typescript
{
  componentId: string;           // Component identifier
  framework: 'react'|'vue'|'stencil';
  runtimeSurface?: any;          // Optional pre-fetched surface
  outputPath?: string;           // Override output path
  options?: {
    typescript?: boolean;        // Generate TypeScript (default: true)
    includeTypes?: boolean;      // Generate type definitions (default: true)
    includeTests?: boolean;      // Generate tests (default: false)
  };
}
```

**Output:**
```typescript
{
  wrapper: GeneratedWrapper;     // Generated wrapper code
  filePath: string;              // Main file path
  componentPath: string;         // Component directory path
}
```

### Scene Composer Agent

**Input:**
```typescript
{
  sceneName: string;             // Scene name
  components: Array<{
    id: string;                  // Component ID
    position?: {x: number; y: number};
    zIndex?: number;
    animations?: string[];
  }>;
  layout?: 'grid'|'flex'|'absolute'|'custom';
  orchestration?: {
    sequence?: Array<{
      componentId: string;
      animation: string;
      delay?: number;
    }>;
    triggers?: Array<{
      event: string;
      actions: Array<{
        componentId: string;
        animation: string;
      }>;
    }>;
  };
  outputPath?: string;
}
```

**Output:**
```typescript
{
  scene: ComposedScene;          // Scene definition
  scenePath: string;             // Scene directory
  definitionFile: string;        // scene.json path
  codeFile: string;              // index.ts path
}
```

### Telemetry Agent

**Input:**
```typescript
{
  componentId?: string;
  sceneName?: string;
  metricsData?: {
    fps: number;
    frameTime: number;
    memory: number;
    renderCount: number;
    animationCount: number;
  };
  analysisType?: 'performance'|'usage'|'errors'|'all';
  threshold?: {
    fps?: number;
    frameTime?: number;
    memory?: number;
  };
}
```

**Output:**
```typescript
{
  analysis: PerformanceAnalysis; // Analysis results
  report: string;                // Markdown report
  status: 'optimal'|'warning'|'critical';
}
```

### QA Agent

**Input:**
```typescript
{
  targetType: 'wrapper'|'scene'|'spec';
  targetId: string;              // Target identifier
  targetPath?: string;           // Path to target file
  runtimeSurface?: any;          // Optional runtime surface
  rules?: QARule[];              // Custom validation rules
  outputPath?: string;           // Override output path
}
```

**Output:**
```typescript
{
  validation: QAValidation;      // Validation results
  reportPath: string;            // JSON report path
  readableReportPath: string;    // Markdown report path
}
```

## Configuration

Create `mcp-agents.config.json`:

```json
{
  "orchestrator": {
    "maxConcurrentAgents": 5,
    "defaultTimeout": 30000,
    "defaultMaxRetries": 3,
    "enableMetrics": true,
    "enableLogging": true,
    "logLevel": "info"
  },
  "mcp": {
    "serverCommand": "node",
    "serverArgs": ["./packages/mcp-server/src/index.js"],
    "timeout": 30000
  },
  "agents": {
    "motion-spec-agent": {
      "enabled": true,
      "outputPath": "libs/motion-specs"
    }
  },
  "api": {
    "enabled": true,
    "port": 3000,
    "enableAuth": true,
    "apiKey": "secret"
  }
}
```

Load configuration:

```typescript
import { configManager } from '@astralismotion/mcp-agents';

await configManager.loadWithDefaults('./mcp-agents.config.json');
const config = configManager.get();
```

## Monitoring

### Agent Metrics

```typescript
// Get metrics for specific agent
const metrics = orchestrator.getMetrics('motion-spec-agent');
console.log({
  total: metrics.totalExecutions,
  success: metrics.successCount,
  failed: metrics.failureCount,
  avgDuration: metrics.averageDuration
});

// Get all metrics
const allMetrics = orchestrator.getMetrics();
```

### Queue Statistics

```typescript
const stats = orchestrator.getQueueStats();
console.log({
  queued: stats.queued,
  processing: stats.processing,
  capacity: stats.capacity,
  available: stats.available
});
```

### Event Monitoring

```typescript
orchestrator.on('workflowEvent', (event) => {
  console.log(`[${event.type}]`, event.timestamp, event.data);
});
```

## Troubleshooting

### Connection Issues

```typescript
// Check if MCP client is connected
if (!mcpClient.isConnected()) {
  await mcpClient.connect();
}
```

### Agent Failures

```typescript
// Agents automatically retry on failure
// Adjust retry settings:
const workflow = createFullComponentWorkflow({...});
workflow.config.maxRetries = 5;
```

### Queue Overload

```typescript
// Increase concurrency
const orchestrator = new Orchestrator({
  maxConcurrentAgents: 10  // Default is 5
});
```

### Timeout Issues

```typescript
// Increase timeout for specific agent
orchestrator.executeAgent('motion-spec-agent', input, {
  timeout: 120000  // 2 minutes
});
```

## File Locations

All generated files are organized:

```
libs/
├── motion-specs/          # CreationSpec JSON files
├── rive-components/       # Generated wrappers
│   ├── react/
│   ├── vue/
│   └── stencil/
├── motion-scenes/         # Composed scenes
└── motion-qa/             # Validation reports
```

## Next Steps

1. Review [README.md](./README.md) for detailed documentation
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. See [SUMMARY.md](./SUMMARY.md) for complete implementation overview
4. Explore workflow patterns in `src/workflows/patterns.ts`
5. Build your first custom workflow!
