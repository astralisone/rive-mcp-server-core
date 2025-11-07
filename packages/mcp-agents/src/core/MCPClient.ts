/**
 * MCP Client for invoking MCP server tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPToolInvocation } from '../types';

export interface MCPClientConfig {
  serverCommand: string;
  serverArgs?: string[];
  timeout?: number;
}

export class MCPClient {
  private client?: Client;
  private transport?: StdioClientTransport;
  private connected: boolean = false;

  constructor(private config: MCPClientConfig) {}

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.transport = new StdioClientTransport({
        command: this.config.serverCommand,
        args: this.config.serverArgs || [],
      });

      this.client = new Client(
        {
          name: 'mcp-agent-orchestrator',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client?.close();
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  /**
   * Invoke MCP tool
   */
  async invokeTool<T = any>(invocation: MCPToolInvocation): Promise<T> {
    if (!this.connected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const timeout = invocation.timeout || this.config.timeout || 30000;

      const result = await Promise.race([
        this.client.callTool({
          name: invocation.tool,
          arguments: invocation.parameters,
        }),
        this.createTimeout(timeout),
      ]);

      if ('error' in result) {
        throw new Error(result.error);
      }

      return result.content as T;
    } catch (error) {
      throw new Error(`Tool invocation failed: ${(error as Error).message}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<string[]> {
    if (!this.connected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.listTools();
      return result.tools.map(tool => tool.name);
    } catch (error) {
      throw new Error(`Failed to list tools: ${(error as Error).message}`);
    }
  }

  /**
   * Get tool schema
   */
  async getToolSchema(toolName: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.listTools();
      const tool = result.tools.find(t => t.name === toolName);
      return tool?.inputSchema;
    } catch (error) {
      throw new Error(`Failed to get tool schema: ${(error as Error).message}`);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Tool invocation timeout after ${ms}ms`)), ms);
    });
  }
}

/**
 * MCP Client factory with connection pooling
 */
export class MCPClientPool {
  private clients: Map<string, MCPClient> = new Map();
  private configs: Map<string, MCPClientConfig> = new Map();

  /**
   * Register MCP server configuration
   */
  register(name: string, config: MCPClientConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Get or create client
   */
  async getClient(name: string): Promise<MCPClient> {
    let client = this.clients.get(name);

    if (!client) {
      const config = this.configs.get(name);
      if (!config) {
        throw new Error(`No configuration found for MCP server: ${name}`);
      }

      client = new MCPClient(config);
      await client.connect();
      this.clients.set(name, client);
    }

    if (!client.isConnected()) {
      await client.connect();
    }

    return client;
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  /**
   * Disconnect specific client
   */
  async disconnect(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
  }
}
