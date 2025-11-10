import { getComponentById, assetExists } from '../utils/storage';
import { extractRiveMetadata } from '../utils/riveParser';
import { MCPToolResponse, RiveComponent } from '../types';
import { logger } from '../utils/logger';
import { formatHierarchical, formatError, ICONS } from '../utils/responseFormatter';
import { validateComponentId } from '../utils/validation';

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
  const startTime = Date.now();
  logger.info('getComponentDetail called', { componentId: params.id });

  try {
    // Validate component ID presence
    if (!params.id) {
      logger.warn('getComponentDetail called without component ID');
      const formatted = formatError(
        'getComponentDetail',
        {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        {
          title: 'MISSING COMPONENT ID',
          suggestions: [
            'Provide a component ID parameter',
            'Use list_components to see available component IDs',
          ],
          metadata: { duration: Date.now() - startTime },
        }
      );
      return {
        status: 'error',
        tool: 'getComponentDetail',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        timestamp: new Date().toISOString(),
        formatted,
      };
    }

    // Validate component ID format
    if (!validateComponentId(params.id)) {
      logger.warn('getComponentDetail called with invalid component ID format', { componentId: params.id });
      const formatted = formatError(
        'getComponentDetail',
        {
          code: 'INVALID_COMPONENT_ID',
          message: `Invalid component ID format: '${params.id}'`,
        },
        {
          title: 'INVALID COMPONENT ID FORMAT',
          context: { 'Provided ID': params.id },
          suggestions: [
            'Component IDs must be alphanumeric with hyphens or underscores',
            'Component IDs must be between 1 and 255 characters',
            'Check for special characters in the ID',
          ],
          metadata: { duration: Date.now() - startTime },
        }
      );
      return {
        status: 'error',
        tool: 'getComponentDetail',
        error: {
          code: 'INVALID_COMPONENT_ID',
          message: `Invalid component ID format: '${params.id}'`,
        },
        timestamp: new Date().toISOString(),
        formatted,
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

    // Format response
    const duration = Date.now() - startTime;
    const sections: Array<{
      title: string;
      icon?: string;
      items?: Array<{ label: string; value: any }>;
      content?: string;
      table?: { headers: string[]; rows: any[] };
    }> = [
      {
        title: 'Component Information',
        icon: ICONS.PACKAGE,
        items: [
          { label: 'ID', value: component.id },
          { label: 'Name', value: component.name },
          { label: 'Description', value: component.description || 'N/A' },
          { label: 'Created', value: new Date(component.createdAt).toLocaleString() },
          { label: 'Updated', value: new Date(component.updatedAt).toLocaleString() },
        ],
      },
      {
        title: 'Library',
        icon: ICONS.LIBRARY,
        items: [
          { label: 'ID', value: library.id },
          { label: 'Name', value: library.name },
          { label: 'Version', value: library.version },
        ],
      },
      {
        title: 'Artboard & State Machine',
        icon: ICONS.ART,
        items: [
          { label: 'Artboard', value: component.artboardName || 'Default' },
          { label: 'State Machine', value: component.stateMachineName || 'Default' },
        ],
      },
      {
        title: 'Asset',
        icon: ICONS.FILE,
        items: [
          { label: 'File Path', value: component.filePath },
          { label: 'Exists', value: exists ? '✓ Yes' : '✗ No' },
          ...(assetMetadata ? [
            { label: 'File Size', value: `${(assetMetadata.fileSize / 1024).toFixed(2)} KB` },
            { label: 'Valid', value: assetMetadata.isValid ? '✓ Yes' : '✗ No' },
          ] : []),
        ],
      },
    ];

    if (component.tags && component.tags.length > 0) {
      sections.push({
        title: 'Tags',
        content: component.tags.join(', '),
      });
    }

    const formatted = formatHierarchical('COMPONENT DETAIL', sections, {
      title: `COMPONENT: ${component.name}`,
      metadata: { duration },
    });

    return {
      status: 'success',
      tool: 'getComponentDetail',
      data: detailResponse,
      timestamp: new Date().toISOString(),
      formatted,
    };
  } catch (error) {
    logger.error('getComponentDetail failed', {
      componentId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const duration = Date.now() - startTime;
    const formatted = formatError(
      'getComponentDetail',
      {
        code: 'GET_COMPONENT_DETAIL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      {
        title: 'COMPONENT NOT FOUND',
        context: {
          'Requested ID': params.id,
          'Storage Backend': 'local',
        },
        suggestions: [
          'Check component ID spelling',
          'Use list_components to see available components',
          'Verify component exists in the library',
        ],
        metadata: { duration },
      }
    );

    return {
      status: 'error',
      tool: 'getComponentDetail',
      error: {
        code: 'GET_COMPONENT_DETAIL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
      formatted,
    };
  }
}
