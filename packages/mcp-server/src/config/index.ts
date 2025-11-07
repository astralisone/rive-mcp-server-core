/**
 * Configuration Module
 * Main entry point for configuration loading and management
 */

import { ServerConfig } from '../../../../libs/types';
import { loadConfig, validateConfig, loadEnvironmentConfig, getDefaultConfig } from './loader';

export * from './loader';

/**
 * Singleton configuration manager
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: ServerConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration
   */
  public async initialize(configPath?: string): Promise<ServerConfig> {
    this.config = await loadConfig(configPath);
    validateConfig(this.config);
    return this.config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): ServerConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Check if configuration is initialized
   */
  public isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Reset configuration (mainly for testing)
   */
  public reset(): void {
    this.config = null;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

/**
 * Initialize and get configuration
 */
export async function initializeConfig(configPath?: string): Promise<ServerConfig> {
  return configManager.initialize(configPath);
}

/**
 * Get current configuration
 */
export function getConfig(): ServerConfig {
  return configManager.getConfig();
}
