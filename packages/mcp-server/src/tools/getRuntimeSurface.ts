import { getComponentById, getAssetPath } from '../utils/storage';
import { parseRiveFile } from '../utils/riveParser';
import { MCPToolResponse, RiveRuntimeSurface } from '../types';
import { logger } from '../utils/logger';

export interface GetRuntimeSurfaceParams {
  componentId: string;
}

export async function getRuntimeSurface(
  params: GetRuntimeSurfaceParams
): Promise<MCPToolResponse<RiveRuntimeSurface>> {
  logger.info('getRuntimeSurface called', { componentId: params.componentId });

  try {
    if (!params.componentId) {
      logger.warn('getRuntimeSurface called without component ID');
      return {
        status: 'error',
        tool: 'getRuntimeSurface',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Get component manifest
    logger.debug('Fetching component manifest', { componentId: params.componentId });
    const componentManifest = await getComponentById(params.componentId);

    if (!componentManifest) {
      logger.warn('Component not found', { componentId: params.componentId });
      return {
        status: 'error',
        tool: 'getRuntimeSurface',
        error: {
          code: 'COMPONENT_NOT_FOUND',
          message: `Component with ID '${params.componentId}' not found`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const { component } = componentManifest;
    logger.debug('Component manifest retrieved', {
      componentId: component.id,
      componentName: component.name
    });

    // Get asset path - use filePath from component or default path
    const assetPath = component.filePath || getAssetPath(component.id);
    logger.debug('Resolving asset path', { assetPath });

    // Parse the Rive file to extract runtime surface
    logger.debug('Parsing Rive file to extract runtime surface');
    const runtimeSurface = await parseRiveFile(assetPath);

    logger.info('getRuntimeSurface completed successfully', {
      componentId: params.componentId,
      stateMachineCount: runtimeSurface.stateMachines?.length || 0
    });

    return {
      status: 'success',
      tool: 'getRuntimeSurface',
      data: runtimeSurface,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('getRuntimeSurface failed', {
      componentId: params.componentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      status: 'error',
      tool: 'getRuntimeSurface',
      error: {
        code: 'GET_RUNTIME_SURFACE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
