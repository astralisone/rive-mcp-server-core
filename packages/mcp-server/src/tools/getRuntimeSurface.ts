import { getComponentById, getAssetPath } from '../utils/storage';
import { parseRiveFile } from '../utils/riveParser';
import { MCPToolResponse, RiveRuntimeSurface } from '../types';

export interface GetRuntimeSurfaceParams {
  componentId: string;
}

export async function getRuntimeSurface(
  params: GetRuntimeSurfaceParams
): Promise<MCPToolResponse<RiveRuntimeSurface>> {
  try {
    if (!params.componentId) {
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
    const componentManifest = await getComponentById(params.componentId);

    if (!componentManifest) {
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

    // Get asset path - use filePath from component or default path
    const assetPath = component.filePath || getAssetPath(component.id);

    // Parse the Rive file to extract runtime surface
    const runtimeSurface = await parseRiveFile(assetPath);

    return {
      status: 'success',
      tool: 'getRuntimeSurface',
      data: runtimeSurface,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
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
