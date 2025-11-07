/**
 * Scene Composer Agent - Builds orchestrated scenes from multiple Rive components
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

export interface SceneComposerInput extends AgentInput {
  sceneName: string;
  components: Array<{
    id: string;
    position?: { x: number; y: number };
    zIndex?: number;
    animations?: string[];
  }>;
  layout?: 'grid' | 'flex' | 'absolute' | 'custom';
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

export interface ComposedScene {
  name: string;
  components: any[];
  layout: string;
  orchestration?: any;
  code: string;
  filePath: string;
}

export class SceneComposerAgent extends BaseAgent {
  private mcpClient?: MCPClient;
  private readonly defaultOutputPath: string;

  constructor(mcpClient: MCPClient, outputPath?: string) {
    const config: AgentConfig = {
      name: 'scene-composer-agent',
      description: 'Builds orchestrated scenes from multiple Rive components.',
      usesTools: ['compose_scene'],
      writes: ['libs/motion-scenes'],
      timeout: 180000,
      maxRetries: 2,
      tags: ['composition', 'scene', 'orchestration'],
    };

    super(config);
    this.mcpClient = mcpClient;
    this.defaultOutputPath = outputPath || 'libs/motion-scenes';
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
    const sceneInput = input as SceneComposerInput;

    try {
      // Compose scene via MCP
      const scene = await this.composeScene(
        sceneInput.sceneName,
        sceneInput.components,
        sceneInput.layout,
        sceneInput.orchestration
      );

      // Write scene to file
      const outputPath = this.getOutputPath(this.context!);
      const scenePath = path.join(outputPath, this.sanitizeFileName(scene.name));
      await fs.mkdir(scenePath, { recursive: true });

      // Write scene definition
      const definitionFile = path.join(scenePath, 'scene.json');
      await fs.writeFile(
        definitionFile,
        JSON.stringify(
          {
            name: scene.name,
            components: scene.components,
            layout: scene.layout,
            orchestration: scene.orchestration,
          },
          null,
          2
        ),
        'utf-8'
      );

      // Write scene code
      const codeFile = path.join(scenePath, 'index.ts');
      await fs.writeFile(codeFile, scene.code, 'utf-8');

      // Write README
      await this.writeSceneReadme(scenePath, scene);

      return {
        success: true,
        data: {
          scene,
          scenePath,
          definitionFile,
          codeFile,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          componentCount: sceneInput.components.length,
          hasOrchestration: !!sceneInput.orchestration,
        },
      };
    } catch (error) {
      throw new Error(`Failed to compose scene: ${(error as Error).message}`);
    }
  }

  protected async doValidate(input: AgentInput): Promise<boolean> {
    const sceneInput = input as SceneComposerInput;

    if (!sceneInput.sceneName || sceneInput.sceneName.trim().length === 0) {
      return false;
    }

    if (!sceneInput.components || sceneInput.components.length === 0) {
      return false;
    }

    return true;
  }

  protected async doCleanup(): Promise<void> {
    this.setState('initialized', false);
  }

  /**
   * Compose scene via MCP
   */
  private async composeScene(
    sceneName: string,
    components: SceneComposerInput['components'],
    layout?: string,
    orchestration?: SceneComposerInput['orchestration']
  ): Promise<ComposedScene> {
    try {
      const result = await this.mcpClient!.invokeTool<any>({
        tool: 'compose_scene',
        parameters: {
          sceneName,
          components,
          layout: layout || 'flex',
          orchestration,
        },
      });

      const scene: ComposedScene = {
        name: sceneName,
        components,
        layout: layout || 'flex',
        orchestration,
        code: result.code || result,
        filePath: '',
      };

      return scene;
    } catch (error) {
      throw new Error(`Failed to compose scene via MCP: ${(error as Error).message}`);
    }
  }

  /**
   * Write scene README
   */
  private async writeSceneReadme(scenePath: string, scene: ComposedScene): Promise<void> {
    const readme = `# ${scene.name}

## Components

${scene.components.map((c, i) => `${i + 1}. ${c.id}`).join('\n')}

## Layout

${scene.layout}

## Orchestration

${scene.orchestration ? JSON.stringify(scene.orchestration, null, 2) : 'None'}

## Usage

\`\`\`typescript
import { ${this.toPascalCase(scene.name)} } from './';

// Use the scene in your application
\`\`\`

Generated: ${new Date().toISOString()}
`;

    const readmePath = path.join(scenePath, 'README.md');
    await fs.writeFile(readmePath, readme, 'utf-8');
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get output path from context or use default
   */
  private getOutputPath(context: AgentContext): string {
    return (context.inputs as SceneComposerInput).outputPath || this.defaultOutputPath;
  }

  /**
   * Sanitize file name
   */
  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }
}
