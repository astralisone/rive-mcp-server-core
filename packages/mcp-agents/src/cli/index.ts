#!/usr/bin/env node

/**
 * CLI for agent orchestration
 */

import { Command } from 'commander';
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
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

// Global orchestrator instance
let orchestrator: Orchestrator;
let clientPool: MCPClientPool;

/**
 * Initialize orchestrator with agents
 */
async function initializeOrchestrator(mcpServerPath?: string): Promise<void> {
  if (orchestrator) {
    return;
  }

  orchestrator = new Orchestrator({
    maxConcurrentAgents: 5,
    enableMetrics: true,
    enableLogging: true,
    logLevel: 'info',
  });

  // Initialize MCP client pool
  clientPool = new MCPClientPool();
  clientPool.register('default', {
    serverCommand: mcpServerPath || 'node',
    serverArgs: [path.join(__dirname, '../../../mcp-server/src/index.js')],
  });

  const mcpClient = await clientPool.getClient('default');

  // Register agents
  orchestrator.registerAgent(new MotionSpecAgent(mcpClient));
  orchestrator.registerAgent(new WrapperGeneratorAgent(mcpClient));
  orchestrator.registerAgent(new SceneComposerAgent(mcpClient));
  orchestrator.registerAgent(new TelemetryAgent(mcpClient));
  orchestrator.registerAgent(new QAAgent(mcpClient));

  console.log('✓ Orchestrator initialized with 5 agents');
}

/**
 * Shutdown orchestrator
 */
async function shutdownOrchestrator(): Promise<void> {
  if (orchestrator) {
    await orchestrator.shutdown();
  }
  if (clientPool) {
    await clientPool.disconnectAll();
  }
}

// CLI Configuration
program
  .name('mcp-agents')
  .description('Agent orchestration CLI for Rive MCP')
  .version('1.0.0')
  .option('-s, --server <path>', 'Path to MCP server executable');

// Agent execution commands

program
  .command('agent:run')
  .description('Execute a single agent')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .requiredOption('-i, --input <json>', 'Input JSON string or file path')
  .option('-p, --priority <level>', 'Priority level (low, normal, high, critical)', 'normal')
  .action(async (options) => {
    try {
      await initializeOrchestrator(program.opts().server);

      // Parse input
      let input;
      try {
        input = JSON.parse(options.input);
      } catch {
        // Try reading as file
        const content = await fs.readFile(options.input, 'utf-8');
        input = JSON.parse(content);
      }

      console.log(`Executing agent: ${options.agent}`);
      const result = await orchestrator.executeAgent(options.agent, input, {
        priority: options.priority,
      });

      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

program
  .command('agent:queue')
  .description('Queue an agent for execution')
  .requiredOption('-a, --agent <name>', 'Agent name')
  .requiredOption('-i, --input <json>', 'Input JSON string or file path')
  .option('-p, --priority <level>', 'Priority level', 'normal')
  .action(async (options) => {
    try {
      await initializeOrchestrator(program.opts().server);

      let input;
      try {
        input = JSON.parse(options.input);
      } catch {
        const content = await fs.readFile(options.input, 'utf-8');
        input = JSON.parse(content);
      }

      const taskId = await orchestrator.queueAgent(options.agent, input, {
        priority: options.priority,
      });

      console.log(`Task queued: ${taskId}`);
      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

program
  .command('agent:list')
  .description('List registered agents')
  .action(async () => {
    try {
      await initializeOrchestrator(program.opts().server);

      const agents = orchestrator.listAgents();
      console.log('\nRegistered Agents:');
      agents.forEach((agent) => {
        console.log(`\n- ${agent.name}`);
        console.log(`  Description: ${agent.description}`);
        console.log(`  Tools: ${agent.usesTools.join(', ')}`);
        console.log(`  Tags: ${agent.tags?.join(', ') || 'none'}`);
      });

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

// Workflow commands

program
  .command('workflow:run')
  .description('Execute a workflow')
  .requiredOption('-w, --workflow <name>', 'Workflow name or definition file')
  .requiredOption('-i, --input <json>', 'Input JSON string or file path')
  .action(async (options) => {
    try {
      await initializeOrchestrator(program.opts().server);

      // Parse input
      let input;
      try {
        input = JSON.parse(options.input);
      } catch {
        const content = await fs.readFile(options.input, 'utf-8');
        input = JSON.parse(content);
      }

      // Load workflow
      let workflow;
      if (options.workflow.endsWith('.json')) {
        const content = await fs.readFile(options.workflow, 'utf-8');
        workflow = JSON.parse(content);
      } else {
        // Use predefined workflow
        workflow = getPredefinedWorkflow(options.workflow, input);
      }

      console.log(`Executing workflow: ${workflow.name}`);
      const result = await orchestrator.executeWorkflow(workflow, input);

      console.log('\nWorkflow Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

program
  .command('workflow:generate')
  .description('Generate a component workflow')
  .requiredOption('-d, --description <text>', 'Component description')
  .requiredOption('-f, --framework <name>', 'Framework (react, vue, stencil)')
  .option('-s, --scene <name>', 'Scene name (optional)')
  .option('--qa', 'Include QA validation', false)
  .action(async (options) => {
    try {
      await initializeOrchestrator(program.opts().server);

      const workflow = createFullComponentWorkflow({
        description: options.description,
        framework: options.framework,
        sceneName: options.scene,
        includeQA: options.qa,
      });

      console.log(`Executing component generation workflow`);
      const result = await orchestrator.executeWorkflow(workflow, {
        description: options.description,
        framework: options.framework,
      });

      console.log('\nGeneration Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

// Metrics commands

program
  .command('metrics:show')
  .description('Show agent metrics')
  .option('-a, --agent <name>', 'Specific agent name')
  .action(async (options) => {
    try {
      await initializeOrchestrator(program.opts().server);

      if (options.agent) {
        const metrics = orchestrator.getMetrics(options.agent);
        console.log(`\nMetrics for ${options.agent}:`, JSON.stringify(metrics, null, 2));
      } else {
        const allMetrics = orchestrator.getMetrics();
        console.log('\nAll Agent Metrics:');
        (allMetrics as Map<string, any>).forEach((metrics, name) => {
          console.log(`\n${name}:`, JSON.stringify(metrics, null, 2));
        });
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

program
  .command('queue:stats')
  .description('Show queue statistics')
  .action(async () => {
    try {
      await initializeOrchestrator(program.opts().server);

      const stats = orchestrator.getQueueStats();
      console.log('\nQueue Statistics:', JSON.stringify(stats, null, 2));

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    } finally {
      await shutdownOrchestrator();
    }
  });

/**
 * Get predefined workflow by name
 */
function getPredefinedWorkflow(name: string, input: any): any {
  switch (name) {
    case 'full-component':
      return createFullComponentWorkflow(input);
    case 'qa-validation':
      return createQAValidationWorkflow(input.targets);
    case 'performance-optimization':
      return createPerformanceOptimizationWorkflow(input);
    case 'multi-framework':
      return createMultiFrameworkWorkflow(input);
    case 'scene-orchestration':
      return createSceneOrchestrationWorkflow(input);
    default:
      throw new Error(`Unknown workflow: ${name}`);
  }
}

// Error handling
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await shutdownOrchestrator();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled rejection:', error);
  await shutdownOrchestrator();
  process.exit(1);
});

// Parse arguments
program.parse();
