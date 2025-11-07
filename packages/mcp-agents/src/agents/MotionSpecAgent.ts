/**
 * Motion Spec Agent - Converts UX/product descriptions into CreationSpec JSON
 */

import { BaseAgent } from '../core/BaseAgent';
import { MCPClient } from '../core/MCPClient';
import {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MotionSpecInput extends AgentInput {
  description: string;
  componentType?: string;
  framework?: 'react' | 'vue' | 'stencil';
  outputPath?: string;
}

export interface CreationSpec {
  name: string;
  type: string;
  description: string;
  animations: Array<{
    name: string;
    trigger: string;
    duration?: number;
    easing?: string;
  }>;
  inputs?: Array<{
    name: string;
    type: string;
    default?: any;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  metadata?: Record<string, any>;
}

export class MotionSpecAgent extends BaseAgent {
  private mcpClient?: MCPClient;
  private readonly defaultOutputPath: string;

  constructor(mcpClient: MCPClient, outputPath?: string) {
    const config: AgentConfig = {
      name: 'motion-spec-agent',
      description: 'Converts UX/product descriptions into CreationSpec documents.',
      usesTools: ['list_libraries', 'list_components'],
      writes: ['libs/motion-specs'],
      timeout: 60000,
      maxRetries: 3,
      tags: ['creation', 'spec', 'design'],
    };

    super(config);
    this.mcpClient = mcpClient;
    this.defaultOutputPath = outputPath || 'libs/motion-specs';
  }

  protected async onInitialize(context: AgentContext): Promise<void> {
    // Ensure MCP client is connected
    if (!this.mcpClient?.isConnected()) {
      await this.mcpClient?.connect();
    }

    // Ensure output directory exists
    const outputPath = this.getOutputPath(context);
    await fs.mkdir(outputPath, { recursive: true });

    this.setState('initialized', true);
  }

  protected async doExecute(input: AgentInput): Promise<AgentOutput> {
    const specInput = input as MotionSpecInput;

    try {
      // List available libraries and components for context
      const libraries = await this.listLibraries();
      const components = await this.listComponents();

      // Generate spec from description
      const spec = await this.generateSpec(
        specInput.description,
        libraries,
        components,
        specInput.componentType
      );

      // Write spec to file
      const outputPath = this.getOutputPath(this.context!);
      const fileName = this.sanitizeFileName(spec.name);
      const filePath = path.join(outputPath, `${fileName}.spec.json`);

      await fs.writeFile(filePath, JSON.stringify(spec, null, 2), 'utf-8');

      return {
        success: true,
        data: {
          spec,
          filePath,
          fileName,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          libraries: libraries.length,
          components: components.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate motion spec: ${(error as Error).message}`);
    }
  }

  protected async doValidate(input: AgentInput): Promise<boolean> {
    const specInput = input as MotionSpecInput;

    if (!specInput.description || specInput.description.trim().length === 0) {
      return false;
    }

    return true;
  }

  protected async doCleanup(): Promise<void> {
    // Cleanup any temporary resources
    this.setState('initialized', false);
  }

  /**
   * List available libraries via MCP
   */
  private async listLibraries(): Promise<string[]> {
    try {
      const result = await this.mcpClient!.invokeTool({
        tool: 'list_libraries',
        parameters: {},
      });

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('Failed to list libraries:', error);
      return [];
    }
  }

  /**
   * List available components via MCP
   */
  private async listComponents(): Promise<any[]> {
    try {
      const result = await this.mcpClient!.invokeTool({
        tool: 'list_components',
        parameters: {},
      });

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('Failed to list components:', error);
      return [];
    }
  }

  /**
   * Generate CreationSpec from description
   */
  private async generateSpec(
    description: string,
    libraries: string[],
    components: any[],
    componentType?: string
  ): Promise<CreationSpec> {
    // Parse description and generate spec
    // This is a simplified implementation - in production, use AI/NLP
    const name = this.extractName(description);
    const type = componentType || this.inferType(description);
    const animations = this.extractAnimations(description);
    const inputs = this.extractInputs(description);
    const outputs = this.extractOutputs(description);

    const spec: CreationSpec = {
      name,
      type,
      description,
      animations,
      inputs,
      outputs,
      metadata: {
        generatedAt: new Date().toISOString(),
        availableLibraries: libraries,
        relatedComponents: this.findRelatedComponents(components, type),
      },
    };

    return spec;
  }

  /**
   * Extract component name from description
   */
  private extractName(description: string): string {
    // Simple extraction - look for quoted names or first noun phrase
    const quoted = description.match(/"([^"]+)"/);
    if (quoted) {
      return quoted[1];
    }

    // Fallback to first few words
    const words = description.split(' ').slice(0, 3);
    return words.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Infer component type from description
   */
  private inferType(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('button')) return 'button';
    if (lowerDesc.includes('loader') || lowerDesc.includes('spinner')) return 'loader';
    if (lowerDesc.includes('toggle') || lowerDesc.includes('switch')) return 'toggle';
    if (lowerDesc.includes('slider')) return 'slider';
    if (lowerDesc.includes('card')) return 'card';
    if (lowerDesc.includes('menu')) return 'menu';

    return 'custom';
  }

  /**
   * Extract animations from description
   */
  private extractAnimations(description: string): CreationSpec['animations'] {
    const animations: CreationSpec['animations'] = [];
    const lowerDesc = description.toLowerCase();

    // Look for common animation triggers
    if (lowerDesc.includes('hover')) {
      animations.push({ name: 'hover', trigger: 'mouseenter' });
    }
    if (lowerDesc.includes('click')) {
      animations.push({ name: 'click', trigger: 'click' });
    }
    if (lowerDesc.includes('load')) {
      animations.push({ name: 'load', trigger: 'load' });
    }

    return animations;
  }

  /**
   * Extract inputs from description
   */
  private extractInputs(description: string): CreationSpec['inputs'] {
    // Simplified - would use NLP in production
    return [
      { name: 'disabled', type: 'boolean', default: false },
      { name: 'size', type: 'string', default: 'medium' },
    ];
  }

  /**
   * Extract outputs from description
   */
  private extractOutputs(description: string): CreationSpec['outputs'] {
    // Simplified - would use NLP in production
    return [
      { name: 'onClick', type: 'event' },
      { name: 'onComplete', type: 'event' },
    ];
  }

  /**
   * Find related components
   */
  private findRelatedComponents(components: any[], type: string): string[] {
    return components
      .filter(c => c.type === type || c.tags?.includes(type))
      .map(c => c.name)
      .slice(0, 5);
  }

  /**
   * Get output path from context or use default
   */
  private getOutputPath(context: AgentContext): string {
    return (context.inputs as MotionSpecInput).outputPath || this.defaultOutputPath;
  }

  /**
   * Sanitize file name
   */
  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }
}
