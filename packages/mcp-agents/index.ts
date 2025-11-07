/**
 * MCP Agents - Agent orchestration system for Rive MCP
 */

// Core
export { BaseAgent } from './src/core/BaseAgent';
export { MCPClient, MCPClientPool } from './src/core/MCPClient';

// Types
export * from './src/types';

// Orchestrator
export { Orchestrator } from './src/orchestrator/Orchestrator';
export { AgentRegistry } from './src/orchestrator/AgentRegistry';
export { TaskQueue } from './src/orchestrator/TaskQueue';
export { WorkflowEngine } from './src/orchestrator/WorkflowEngine';

// Agents
export { MotionSpecAgent } from './src/agents/MotionSpecAgent';
export { WrapperGeneratorAgent } from './src/agents/WrapperGeneratorAgent';
export { SceneComposerAgent } from './src/agents/SceneComposerAgent';
export { TelemetryAgent } from './src/agents/TelemetryAgent';
export { QAAgent } from './src/agents/QAAgent';

// Workflows
export * from './src/workflows/patterns';

// Configuration
export { ConfigManager, configManager } from './src/config';

// API
export { APIServer, createAPIServer } from './src/api/server';
