/**
 * Wrapper Generator Agent - Generates framework-specific wrappers from runtime surfaces
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

export interface WrapperGeneratorInput extends AgentInput {
  componentId: string;
  framework: 'react' | 'vue' | 'stencil';
  runtimeSurface?: any;
  outputPath?: string;
  options?: {
    typescript?: boolean;
    includeTypes?: boolean;
    includeTests?: boolean;
  };
}

export interface GeneratedWrapper {
  framework: string;
  componentName: string;
  code: string;
  types?: string;
  tests?: string;
  filePath: string;
}

export class WrapperGeneratorAgent extends BaseAgent {
  private mcpClient?: MCPClient;
  private readonly defaultOutputPath: string;

  constructor(mcpClient: MCPClient, outputPath?: string) {
    const config: AgentConfig = {
      name: 'wrapper-generator-agent',
      description: 'Generates framework-specific wrappers from runtime surfaces.',
      usesTools: ['get_runtime_surface', 'generate_wrapper'],
      writes: ['libs/rive-components'],
      timeout: 120000,
      maxRetries: 2,
      tags: ['generation', 'wrapper', 'framework'],
    };

    super(config);
    this.mcpClient = mcpClient;
    this.defaultOutputPath = outputPath || 'libs/rive-components';
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
    const wrapperInput = input as WrapperGeneratorInput;

    try {
      // Get runtime surface if not provided
      let runtimeSurface = wrapperInput.runtimeSurface;
      if (!runtimeSurface) {
        runtimeSurface = await this.getRuntimeSurface(wrapperInput.componentId);
      }

      // Generate wrapper
      const wrapper = await this.generateWrapper(
        wrapperInput.componentId,
        wrapperInput.framework,
        runtimeSurface,
        wrapperInput.options
      );

      // Write wrapper to file
      const outputPath = this.getOutputPath(this.context!);
      const frameworkPath = path.join(outputPath, wrapperInput.framework);
      await fs.mkdir(frameworkPath, { recursive: true });

      const componentPath = path.join(frameworkPath, wrapper.componentName);
      await fs.mkdir(componentPath, { recursive: true });

      // Write main component file
      const ext = wrapperInput.options?.typescript ? 'ts' : 'js';
      const componentFile = this.getComponentFileName(
        wrapper.componentName,
        wrapperInput.framework,
        ext
      );
      const filePath = path.join(componentPath, componentFile);
      await fs.writeFile(filePath, wrapper.code, 'utf-8');

      // Write types if requested
      if (wrapperInput.options?.includeTypes && wrapper.types) {
        const typesFile = path.join(componentPath, `${wrapper.componentName}.types.ts`);
        await fs.writeFile(typesFile, wrapper.types, 'utf-8');
      }

      // Write tests if requested
      if (wrapperInput.options?.includeTests && wrapper.tests) {
        const testsFile = path.join(componentPath, `${wrapper.componentName}.test.${ext}`);
        await fs.writeFile(testsFile, wrapper.tests, 'utf-8');
      }

      return {
        success: true,
        data: {
          wrapper,
          filePath,
          componentPath,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          framework: wrapperInput.framework,
          typescript: wrapperInput.options?.typescript || false,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate wrapper: ${(error as Error).message}`);
    }
  }

  protected async doValidate(input: AgentInput): Promise<boolean> {
    const wrapperInput = input as WrapperGeneratorInput;

    if (!wrapperInput.componentId) {
      return false;
    }

    if (!['react', 'vue', 'stencil'].includes(wrapperInput.framework)) {
      return false;
    }

    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.setState('initialized', false);
  }

  /**
   * Get runtime surface via MCP
   */
  private async getRuntimeSurface(componentId: string): Promise<any> {
    try {
      const result = await this.mcpClient!.invokeTool({
        tool: 'get_runtime_surface',
        parameters: { componentId },
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get runtime surface: ${(error as Error).message}`);
    }
  }

  /**
   * Generate wrapper via MCP
   */
  private async generateWrapper(
    componentId: string,
    framework: string,
    runtimeSurface: any,
    options?: WrapperGeneratorInput['options']
  ): Promise<GeneratedWrapper> {
    try {
      const result = await this.mcpClient!.invokeTool<any>({
        tool: 'generate_wrapper',
        parameters: {
          componentId,
          framework,
          runtimeSurface,
          options: {
            typescript: options?.typescript !== false,
            includeTypes: options?.includeTypes !== false,
            includeTests: options?.includeTests || false,
          },
        },
      });

      // Extract component name from componentId
      const componentName = this.extractComponentName(componentId);

      const wrapper: GeneratedWrapper = {
        framework,
        componentName,
        code: result.code || result,
        types: result.types,
        tests: result.tests,
        filePath: '',
      };

      return wrapper;
    } catch (error) {
      throw new Error(`Failed to generate wrapper via MCP: ${(error as Error).message}`);
    }
  }

  /**
   * Extract component name from ID
   */
  private extractComponentName(componentId: string): string {
    // Remove path and extension, convert to PascalCase
    const baseName = path.basename(componentId, path.extname(componentId));
    return baseName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Get component file name based on framework
   */
  private getComponentFileName(
    componentName: string,
    framework: string,
    ext: string
  ): string {
    switch (framework) {
      case 'react':
        return `${componentName}.${ext}x`;
      case 'vue':
        return `${componentName}.vue`;
      case 'stencil':
        return `${componentName}.tsx`;
      default:
        return `${componentName}.${ext}`;
    }
  }

  /**
   * Get output path from context or use default
   */
  private getOutputPath(context: AgentContext): string {
    return (context.inputs as WrapperGeneratorInput).outputPath || this.defaultOutputPath;
  }
}
