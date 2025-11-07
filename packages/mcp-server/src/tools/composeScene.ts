import { getComponentById } from '../utils/storage';
import { MCPToolResponse, ComposeSceneParams } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ComposedScene {
  id: string;
  name: string;
  description?: string;
  components: Array<{
    componentId: string;
    componentName: string;
    instanceName: string;
    position?: { x: number; y: number };
    scale?: number;
    zIndex?: number;
    interactions?: Array<{
      trigger: string;
      target: string;
      action: string;
      params?: Record<string, any>;
    }>;
  }>;
  orchestration?: {
    timeline?: Array<{
      time: number;
      component: string;
      action: string;
      params?: Record<string, any>;
    }>;
    rules?: Array<{
      condition: string;
      actions: Array<{
        component: string;
        action: string;
        params?: Record<string, any>;
      }>;
    }>;
  };
  createdAt: string;
  metadata: {
    totalComponents: number;
    hasTimeline: boolean;
    hasRules: boolean;
    hasInteractions: boolean;
  };
}

export async function composeScene(
  params: ComposeSceneParams
): Promise<MCPToolResponse<ComposedScene>> {
  try {
    // Validate required parameters
    if (!params.name) {
      return {
        status: 'error',
        tool: 'composeScene',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Scene name is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.components || params.components.length === 0) {
      return {
        status: 'error',
        tool: 'composeScene',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'At least one component is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Validate all components exist
    const validatedComponents = [];
    for (const comp of params.components) {
      const componentManifest = await getComponentById(comp.componentId);

      if (!componentManifest) {
        return {
          status: 'error',
          tool: 'composeScene',
          error: {
            code: 'COMPONENT_NOT_FOUND',
            message: `Component with ID '${comp.componentId}' not found`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      validatedComponents.push({
        componentId: comp.componentId,
        componentName: componentManifest.component.name,
        instanceName: comp.instanceName,
        position: comp.position,
        scale: comp.scale,
        zIndex: comp.zIndex,
        interactions: comp.interactions,
      });
    }

    // Validate interactions
    if (validatedComponents.some((c) => c.interactions)) {
      const componentIds = validatedComponents.map((c) => c.componentId);
      const instanceNames = validatedComponents.map((c) => c.instanceName);

      for (const comp of validatedComponents) {
        if (comp.interactions) {
          for (const interaction of comp.interactions) {
            // Validate target exists
            if (!instanceNames.includes(interaction.target)) {
              return {
                status: 'error',
                tool: 'composeScene',
                error: {
                  code: 'INVALID_INTERACTION',
                  message: `Interaction target '${interaction.target}' not found in scene components`,
                },
                timestamp: new Date().toISOString(),
              };
            }
          }
        }
      }
    }

    // Validate timeline
    if (params.orchestration?.timeline) {
      const instanceNames = validatedComponents.map((c) => c.instanceName);

      for (const timelineItem of params.orchestration.timeline) {
        if (!instanceNames.includes(timelineItem.component)) {
          return {
            status: 'error',
            tool: 'composeScene',
            error: {
              code: 'INVALID_TIMELINE',
              message: `Timeline component '${timelineItem.component}' not found in scene components`,
            },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    // Validate rules
    if (params.orchestration?.rules) {
      const instanceNames = validatedComponents.map((c) => c.instanceName);

      for (const rule of params.orchestration.rules) {
        for (const action of rule.actions) {
          if (!instanceNames.includes(action.component)) {
            return {
              status: 'error',
              tool: 'composeScene',
              error: {
                code: 'INVALID_RULE',
                message: `Rule action component '${action.component}' not found in scene components`,
              },
              timestamp: new Date().toISOString(),
            };
          }
        }
      }
    }

    // Create composed scene
    const sceneId = generateSceneId(params.name);
    const composedScene: ComposedScene = {
      id: sceneId,
      name: params.name,
      description: params.description,
      components: validatedComponents,
      orchestration: params.orchestration,
      createdAt: new Date().toISOString(),
      metadata: {
        totalComponents: validatedComponents.length,
        hasTimeline: Boolean(params.orchestration?.timeline?.length),
        hasRules: Boolean(params.orchestration?.rules?.length),
        hasInteractions: validatedComponents.some((c) => c.interactions && c.interactions.length > 0),
      },
    };

    // Save scene manifest
    await saveSceneManifest(composedScene);

    return {
      status: 'success',
      tool: 'composeScene',
      data: composedScene,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      tool: 'composeScene',
      error: {
        code: 'COMPOSE_SCENE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Generate a unique scene ID from name
 */
function generateSceneId(name: string): string {
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const timestamp = Date.now().toString(36);
  return `${baseId}-${timestamp}`;
}

/**
 * Save scene manifest to storage
 */
async function saveSceneManifest(scene: ComposedScene): Promise<void> {
  const scenesPath = process.env.SCENES_PATH || path.join(process.cwd(), 'libs', 'motion-scenes');

  await fs.mkdir(scenesPath, { recursive: true });

  const manifestPath = path.join(scenesPath, `${scene.id}.scene.json`);
  await fs.writeFile(manifestPath, JSON.stringify(scene, null, 2), 'utf-8');
}
