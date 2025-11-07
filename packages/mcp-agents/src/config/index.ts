/**
 * Configuration management for agent orchestration
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentOrchestratorConfig {
  orchestrator: {
    maxConcurrentAgents?: number;
    defaultTimeout?: number;
    defaultMaxRetries?: number;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    queueStrategy?: 'fifo' | 'priority' | 'lifo';
  };
  mcp: {
    serverCommand: string;
    serverArgs?: string[];
    timeout?: number;
  };
  agents: {
    [agentName: string]: {
      enabled?: boolean;
      outputPath?: string;
      timeout?: number;
      maxRetries?: number;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      customConfig?: Record<string, any>;
    };
  };
  workflows: {
    [workflowName: string]: {
      enabled?: boolean;
      config?: Record<string, any>;
    };
  };
  api?: {
    enabled?: boolean;
    port?: number;
    host?: string;
    corsOrigins?: string[];
    enableAuth?: boolean;
    apiKey?: string;
  };
}

export class ConfigManager {
  private config?: AgentOrchestratorConfig;
  private configPath?: string;

  /**
   * Load configuration from file
   */
  async load(configPath: string): Promise<AgentOrchestratorConfig> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(content);
      this.configPath = configPath;
      return this.config!;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration with defaults
   */
  async loadWithDefaults(configPath?: string): Promise<AgentOrchestratorConfig> {
    const defaults = this.getDefaults();

    if (!configPath) {
      this.config = defaults;
      return defaults;
    }

    try {
      await this.load(configPath);
      this.config = this.mergeConfigs(defaults, this.config!);
      return this.config!;
    } catch (error) {
      console.warn(`Failed to load config, using defaults: ${(error as Error).message}`);
      this.config = defaults;
      return defaults;
    }
  }

  /**
   * Save configuration to file
   */
  async save(configPath?: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    const targetPath = configPath || this.configPath;
    if (!targetPath) {
      throw new Error('No configuration path specified');
    }

    try {
      await fs.writeFile(targetPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Get current configuration
   */
  get(): AgentOrchestratorConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  update(updates: Partial<AgentOrchestratorConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    this.config = this.mergeConfigs(this.config, updates);
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentName: string): AgentOrchestratorConfig['agents'][string] {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config.agents[agentName] || {};
  }

  /**
   * Update agent configuration
   */
  updateAgentConfig(
    agentName: string,
    updates: AgentOrchestratorConfig['agents'][string]
  ): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    this.config.agents[agentName] = {
      ...this.config.agents[agentName],
      ...updates,
    };
  }

  /**
   * Get workflow configuration
   */
  getWorkflowConfig(workflowName: string): AgentOrchestratorConfig['workflows'][string] {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config.workflows[workflowName] || {};
  }

  /**
   * Update workflow configuration
   */
  updateWorkflowConfig(
    workflowName: string,
    updates: AgentOrchestratorConfig['workflows'][string]
  ): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    this.config.workflows[workflowName] = {
      ...this.config.workflows[workflowName],
      ...updates,
    };
  }

  /**
   * Get default configuration
   */
  private getDefaults(): AgentOrchestratorConfig {
    return {
      orchestrator: {
        maxConcurrentAgents: 5,
        defaultTimeout: 30000,
        defaultMaxRetries: 3,
        enableMetrics: true,
        enableLogging: true,
        logLevel: 'info',
        queueStrategy: 'priority',
      },
      mcp: {
        serverCommand: 'node',
        serverArgs: [],
        timeout: 30000,
      },
      agents: {
        'motion-spec-agent': {
          enabled: true,
          outputPath: 'libs/motion-specs',
          timeout: 60000,
          maxRetries: 3,
        },
        'wrapper-generator-agent': {
          enabled: true,
          outputPath: 'libs/rive-components',
          timeout: 120000,
          maxRetries: 2,
        },
        'scene-composer-agent': {
          enabled: true,
          outputPath: 'libs/motion-scenes',
          timeout: 180000,
          maxRetries: 2,
        },
        'telemetry-agent': {
          enabled: true,
          timeout: 60000,
          maxRetries: 2,
        },
        'qa-agent': {
          enabled: true,
          outputPath: 'libs/motion-qa',
          timeout: 120000,
          maxRetries: 2,
        },
      },
      workflows: {
        'full-component': {
          enabled: true,
        },
        'qa-validation': {
          enabled: true,
        },
        'performance-optimization': {
          enabled: true,
        },
        'multi-framework': {
          enabled: true,
        },
        'scene-orchestration': {
          enabled: true,
        },
      },
      api: {
        enabled: false,
        port: 3000,
        host: '0.0.0.0',
        corsOrigins: ['*'],
        enableAuth: false,
      },
    };
  }

  /**
   * Merge configurations
   */
  private mergeConfigs<T>(base: T, updates: Partial<T>): T {
    const result = { ...base };

    for (const key in updates) {
      const updateValue = updates[key];
      if (updateValue === undefined) {
        continue;
      }

      if (
        typeof updateValue === 'object' &&
        updateValue !== null &&
        !Array.isArray(updateValue)
      ) {
        result[key] = this.mergeConfigs(result[key] || {}, updateValue) as any;
      } else {
        result[key] = updateValue as any;
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Configuration not loaded');
      return { valid: false, errors };
    }

    // Validate orchestrator config
    if (this.config.orchestrator.maxConcurrentAgents! < 1) {
      errors.push('maxConcurrentAgents must be at least 1');
    }

    // Validate MCP config
    if (!this.config.mcp.serverCommand) {
      errors.push('MCP server command is required');
    }

    // Validate API config
    if (this.config.api?.enabled) {
      if (!this.config.api.port || this.config.api.port < 1 || this.config.api.port > 65535) {
        errors.push('API port must be between 1 and 65535');
      }

      if (this.config.api.enableAuth && !this.config.api.apiKey) {
        errors.push('API key is required when authentication is enabled');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate example configuration file
   */
  static async generateExample(outputPath: string): Promise<void> {
    const manager = new ConfigManager();
    const defaults = manager['getDefaults']();

    const example = {
      ...defaults,
      _comment: 'Agent Orchestrator Configuration',
      _documentation: 'https://github.com/your-repo/docs/configuration.md',
    };

    await fs.writeFile(outputPath, JSON.stringify(example, null, 2), 'utf-8');
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
