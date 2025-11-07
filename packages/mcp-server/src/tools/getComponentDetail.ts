import { getComponentById, assetExists } from '../utils/storage';
import { extractRiveMetadata } from '../utils/riveParser';
import { MCPToolResponse, RiveComponent } from '../types';

export interface GetComponentDetailParams {
  id: string;
}

export interface ComponentDetailResponse extends RiveComponent {
  library: {
    id: string;
    name: string;
    version: string;
  };
  asset: {
    exists: boolean;
    metadata?: {
      fileName: string;
      fileSize: number;
      isValid: boolean;
      lastModified: Date;
    };
  };
}

export async function getComponentDetail(
  params: GetComponentDetailParams
): Promise<MCPToolResponse<ComponentDetailResponse>> {
  try {
    if (!params.id) {
      return {
        status: 'error',
        tool: 'getComponentDetail',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    const componentManifest = await getComponentById(params.id);

    if (!componentManifest) {
      return {
        status: 'error',
        tool: 'getComponentDetail',
        error: {
          code: 'COMPONENT_NOT_FOUND',
          message: `Component with ID '${params.id}' not found`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const { component, library } = componentManifest;

    // Check if asset file exists
    const exists = await assetExists(component.id);

    let assetMetadata;
    if (exists && component.filePath) {
      try {
        assetMetadata = await extractRiveMetadata(component.filePath);
      } catch (error) {
        // If metadata extraction fails, just note that asset exists
        assetMetadata = undefined;
      }
    }

    const detailResponse: ComponentDetailResponse = {
      ...component,
      library: {
        id: library.id,
        name: library.name,
        version: library.version,
      },
      asset: {
        exists,
        metadata: assetMetadata,
      },
    };

    return {
      status: 'success',
      tool: 'getComponentDetail',
      data: detailResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      tool: 'getComponentDetail',
      error: {
        code: 'GET_COMPONENT_DETAIL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
