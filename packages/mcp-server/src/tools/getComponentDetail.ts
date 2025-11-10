import { getComponentById, assetExists } from '../utils/storage';
import { extractRiveMetadata } from '../utils/riveParser';
import { MCPToolResponse, RiveComponent } from '../types';
import { logger } from '../utils/logger';

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
  logger.info('getComponentDetail called', { componentId: params.id });

  try {
    if (!params.id) {
      logger.warn('getComponentDetail called without component ID');
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

    logger.debug('Fetching component by ID', { componentId: params.id });
    const componentManifest = await getComponentById(params.id);

    if (!componentManifest) {
      logger.warn('Component not found', { componentId: params.id });
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
    logger.debug('Component found', {
      componentId: component.id,
      componentName: component.name,
      libraryId: library.id
    });

    // Check if asset file exists
    logger.debug('Checking if asset file exists', { componentId: component.id });
    const exists = await assetExists(component.id);
    logger.debug(`Asset ${exists ? 'exists' : 'does not exist'}`, { componentId: component.id });

    let assetMetadata;
    if (exists && component.filePath) {
      try {
        logger.debug('Extracting asset metadata', { filePath: component.filePath });
        assetMetadata = await extractRiveMetadata(component.filePath);
      } catch (error) {
        // If metadata extraction fails, just note that asset exists
        logger.warn('Failed to extract asset metadata', {
          filePath: component.filePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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

    logger.info('getComponentDetail completed successfully', {
      componentId: params.id,
      assetExists: exists
    });

    return {
      status: 'success',
      tool: 'getComponentDetail',
      data: detailResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('getComponentDetail failed', {
      componentId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
