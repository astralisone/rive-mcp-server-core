/**
 * REST API server for agent orchestration
 */

import express, { Request, Response, NextFunction } from 'express';
import { Orchestrator } from '../orchestrator/Orchestrator';
import { MCPClient, MCPClientPool } from '../core/MCPClient';
import { MotionSpecAgent } from '../agents/MotionSpecAgent';
import { WrapperGeneratorAgent } from '../agents/WrapperGeneratorAgent';
import { SceneComposerAgent } from '../agents/SceneComposerAgent';
import { TelemetryAgent } from '../agents/TelemetryAgent';
import { QAAgent } from '../agents/QAAgent';
import {
  createFullComponentWorkflow,
  createQAValidationWorkflow,
  createPerformanceOptimizationWorkflow,
  createMultiFrameworkWorkflow,
  createSceneOrchestrationWorkflow,
} from '../workflows/patterns';
import * as path from 'path';

export interface APIServerConfig {
  port?: number;
  host?: string;
  mcpServerPath?: string;
  corsOrigins?: string[];
  enableAuth?: boolean;
  apiKey?: string;
}

export class APIServer {
  private app: express.Application;
  private orchestrator?: Orchestrator;
  private clientPool?: MCPClientPool;
  private config: Required<APIServerConfig>;

  constructor(config?: APIServerConfig) {
    this.config = {
      port: config?.port || 3000,
      host: config?.host || '0.0.0.0',
      mcpServerPath: config?.mcpServerPath || '',
      corsOrigins: config?.corsOrigins || ['*'],
      enableAuth: config?.enableAuth || false,
      apiKey: config?.apiKey || '',
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json());

    // CORS
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (
        this.config.corsOrigins.includes('*') ||
        (origin && this.config.corsOrigins.includes(origin))
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Authentication
    if (this.config.enableAuth) {
      this.app.use((req, res, next) => {
        if (req.path === '/health' || req.path === '/') {
          return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${this.config.apiKey}`) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        next();
      });
    }

    // Error handling
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        name: 'MCP Agent Orchestration API',
        version: '1.0.0',
        endpoints: {
          agents: '/api/agents',
          workflows: '/api/workflows',
          metrics: '/api/metrics',
          queue: '/api/queue',
        },
      });
    });

    // Agent routes
    this.setupAgentRoutes();

    // Workflow routes
    this.setupWorkflowRoutes();

    // Metrics routes
    this.setupMetricsRoutes();

    // Queue routes
    this.setupQueueRoutes();
  }

  /**
   * Setup agent routes
   */
  private setupAgentRoutes(): void {
    // List agents
    this.app.get('/api/agents', async (req, res) => {
      try {
        const agents = this.orchestrator!.listAgents();
        res.json({ agents });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Execute agent
    this.app.post('/api/agents/:name/execute', async (req, res) => {
      try {
        const { name } = req.params;
        const { input, options } = req.body;

        const result = await this.orchestrator!.executeAgent(name, input, options);
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Queue agent
    this.app.post('/api/agents/:name/queue', async (req, res) => {
      try {
        const { name } = req.params;
        const { input, options } = req.body;

        const taskId = await this.orchestrator!.queueAgent(name, input, options);
        res.json({ taskId });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  /**
   * Setup workflow routes
   */
  private setupWorkflowRoutes(): void {
    // Execute workflow
    this.app.post('/api/workflows/execute', async (req, res) => {
      try {
        const { workflow, inputs } = req.body;
        const result = await this.orchestrator!.executeWorkflow(workflow, inputs);
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Full component generation
    this.app.post('/api/workflows/full-component', async (req, res) => {
      try {
        const { description, framework, sceneName, includeQA } = req.body;

        const workflow = createFullComponentWorkflow({
          description,
          framework,
          sceneName,
          includeQA,
        });

        const result = await this.orchestrator!.executeWorkflow(workflow, {
          description,
          framework,
        });

        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // QA validation
    this.app.post('/api/workflows/qa-validation', async (req, res) => {
      try {
        const { targets } = req.body;
        const workflow = createQAValidationWorkflow(targets);
        const result = await this.orchestrator!.executeWorkflow(workflow, { targets });
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Performance optimization
    this.app.post('/api/workflows/performance-optimization', async (req, res) => {
      try {
        const { componentId, componentPath, threshold } = req.body;
        const workflow = createPerformanceOptimizationWorkflow({
          componentId,
          componentPath,
          threshold,
        });
        const result = await this.orchestrator!.executeWorkflow(workflow, {
          componentId,
          componentPath,
          threshold,
        });
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Multi-framework generation
    this.app.post('/api/workflows/multi-framework', async (req, res) => {
      try {
        const { componentId, frameworks, includeQA } = req.body;
        const workflow = createMultiFrameworkWorkflow({
          componentId,
          frameworks,
          includeQA,
        });
        const result = await this.orchestrator!.executeWorkflow(workflow, {
          componentId,
          frameworks,
          includeQA,
        });
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Scene orchestration
    this.app.post('/api/workflows/scene-orchestration', async (req, res) => {
      try {
        const { sceneName, components, layout, orchestration } = req.body;
        const workflow = createSceneOrchestrationWorkflow({
          sceneName,
          components,
          layout,
          orchestration,
        });
        const result = await this.orchestrator!.executeWorkflow(workflow, {
          sceneName,
          components,
          layout,
          orchestration,
        });
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  /**
   * Setup metrics routes
   */
  private setupMetricsRoutes(): void {
    // Get all metrics
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = this.orchestrator!.getMetrics();
        const metricsObj = Object.fromEntries(metrics as Map<string, any>);
        res.json({ metrics: metricsObj });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get agent-specific metrics
    this.app.get('/api/metrics/:agentName', async (req, res) => {
      try {
        const { agentName } = req.params;
        const metrics = this.orchestrator!.getMetrics(agentName);
        res.json({ metrics });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  /**
   * Setup queue routes
   */
  private setupQueueRoutes(): void {
    // Get queue stats
    this.app.get('/api/queue/stats', async (req, res) => {
      try {
        const stats = this.orchestrator!.getQueueStats();
        res.json({ stats });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  /**
   * Initialize orchestrator
   */
  async initialize(): Promise<void> {
    this.orchestrator = new Orchestrator({
      maxConcurrentAgents: 5,
      enableMetrics: true,
      enableLogging: true,
      logLevel: 'info',
    });

    // Initialize MCP client pool
    this.clientPool = new MCPClientPool();
    this.clientPool.register('default', {
      serverCommand: this.config.mcpServerPath || 'node',
      serverArgs: [path.join(__dirname, '../../../mcp-server/src/index.js')],
    });

    const mcpClient = await this.clientPool.getClient('default');

    // Register agents
    this.orchestrator.registerAgent(new MotionSpecAgent(mcpClient));
    this.orchestrator.registerAgent(new WrapperGeneratorAgent(mcpClient));
    this.orchestrator.registerAgent(new SceneComposerAgent(mcpClient));
    this.orchestrator.registerAgent(new TelemetryAgent(mcpClient));
    this.orchestrator.registerAgent(new QAAgent(mcpClient));

    console.log('✓ Orchestrator initialized with 5 agents');
  }

  /**
   * Start server
   */
  async start(): Promise<void> {
    await this.initialize();

    return new Promise((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        console.log(`API server listening on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
    if (this.clientPool) {
      await this.clientPool.disconnectAll();
    }
  }
}

// Export convenience function
export function createAPIServer(config?: APIServerConfig): APIServer {
  return new APIServer(config);
}
