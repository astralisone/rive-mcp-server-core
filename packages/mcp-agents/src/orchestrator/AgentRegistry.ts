/**
 * Agent registry for managing available agents
 */

import { IAgent, AgentConfig, AgentRegistryEntry } from '../types';

export class AgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map();

  /**
   * Register an agent
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.config.name)) {
      throw new Error(`Agent already registered: ${agent.config.name}`);
    }

    const entry: AgentRegistryEntry = {
      agent,
      config: agent.config,
      metadata: {
        registered: new Date(),
        usageCount: 0,
      },
    };

    this.agents.set(agent.config.name, entry);
  }

  /**
   * Unregister an agent
   */
  unregister(name: string): void {
    this.agents.delete(name);
  }

  /**
   * Get agent by name
   */
  get(name: string): IAgent | undefined {
    const entry = this.agents.get(name);
    if (entry) {
      entry.metadata.usageCount++;
      entry.metadata.lastUsed = new Date();
    }
    return entry?.agent;
  }

  /**
   * Check if agent exists
   */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * List all registered agents
   */
  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map(entry => entry.config);
  }

  /**
   * Find agents by tag
   */
  findByTag(tag: string): IAgent[] {
    return Array.from(this.agents.values())
      .filter(entry => entry.config.tags?.includes(tag))
      .map(entry => entry.agent);
  }

  /**
   * Find agents by tool usage
   */
  findByTool(toolName: string): IAgent[] {
    return Array.from(this.agents.values())
      .filter(entry => entry.config.usesTools.includes(toolName))
      .map(entry => entry.agent);
  }

  /**
   * Get agent metadata
   */
  getMetadata(name: string): AgentRegistryEntry['metadata'] | undefined {
    return this.agents.get(name)?.metadata;
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.agents.size;
  }
}
