import { getComponentById, getAssetPath } from '../utils/storage';
import { parseRiveFile } from '../utils/riveParser';
import { MCPToolResponse, RiveRuntimeSurface } from '../types';
import { logger } from '../utils/logger';
import { validateComponentId, validateRuntimeSurface } from '../utils/validation';
import { formatHierarchical, formatError, ICONS } from '../utils/responseFormatter';

export interface GetRuntimeSurfaceParams {
  componentId: string;
}

export async function getRuntimeSurface(
  params: GetRuntimeSurfaceParams
): Promise<MCPToolResponse<RiveRuntimeSurface>> {
  const startTime = Date.now();
  logger.info('getRuntimeSurface called', { componentId: params.componentId });

  try {
    // Validate component ID presence
    if (!params.componentId) {
      logger.warn('getRuntimeSurface called without component ID');
      const formatted = formatError(
        'getRuntimeSurface',
        {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        {
          title: 'MISSING COMPONENT ID',
          suggestions: [
            'Provide a componentId parameter',
            'Use list_components to see available component IDs',
          ],
          metadata: { duration: Date.now() - startTime },
        }
      );
      return {
        status: 'error',
        tool: 'getRuntimeSurface',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Component ID is required',
        },
        timestamp: new Date().toISOString(),
        formatted,
      };
    }

    // Validate component ID format
    if (!validateComponentId(params.componentId)) {
      logger.warn('getRuntimeSurface called with invalid component ID format', { componentId: params.componentId });
      const formatted = formatError(
        'getRuntimeSurface',
        {
          code: 'INVALID_COMPONENT_ID',
          message: `Invalid component ID format: '${params.componentId}'`,
        },
        {
          title: 'INVALID COMPONENT ID FORMAT',
          context: { 'Provided ID': params.componentId },
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
        tool: 'getRuntimeSurface',
        error: {
          code: 'INVALID_COMPONENT_ID',
          message: `Invalid component ID format: '${params.componentId}'. Component IDs must be alphanumeric with hyphens or underscores.`,
        },
        timestamp: new Date().toISOString(),
        formatted,
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

    // Validate the extracted runtime surface
    const validationResult = validateRuntimeSurface(runtimeSurface);
    if (!validationResult.valid) {
      logger.error('Runtime surface validation failed', {
        componentId: params.componentId,
        errors: validationResult.errors,
      });
      return {
        status: 'error',
        tool: 'getRuntimeSurface',
        error: {
          code: 'INVALID_RUNTIME_SURFACE',
          message: `Runtime surface validation failed: ${validationResult.errors.join(', ')}`,
          details: validationResult,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      logger.warn('Runtime surface has warnings', {
        componentId: params.componentId,
        warnings: validationResult.warnings,
      });
    }

    logger.info('getRuntimeSurface completed successfully', {
      componentId: params.componentId,
      stateMachineCount: runtimeSurface.stateMachines?.length || 0,
      artboardCount: runtimeSurface.artboards?.length || 0,
      eventCount: runtimeSurface.events?.length || 0,
    });

    // Format response
    const duration = Date.now() - startTime;
    const sections = [
      {
        title: 'Component',
        icon: ICONS.PACKAGE,
        items: [
          { label: 'Component ID', value: runtimeSurface.componentId },
        ],
      },
      {
        title: 'Artboards',
        icon: ICONS.ART,
        items: runtimeSurface.artboards.map(ab => ({
          label: ab.name,
          value: `${ab.width}x${ab.height}`,
        })),
      },
      {
        title: 'State Machines',
        icon: ICONS.SETTINGS,
        items: runtimeSurface.stateMachines.map(sm => ({
          label: sm.name,
          value: `${sm.inputCount || sm.inputs.length} inputs, ${sm.eventNames?.length || 0} events`,
        })),
      },
    ];

    if (runtimeSurface.events && runtimeSurface.events.length > 0) {
      sections.push({
        title: 'Events',
        icon: ICONS.LIGHTNING,
        items: runtimeSurface.events.map(evt => ({
          label: evt.name,
          value: Object.keys(evt.properties || {}).length > 0 ? 'with properties' : 'no properties',
        })),
      });
    }

    sections.push({
      title: 'Metadata',
      icon: ICONS.INFO,
      items: [
        { label: 'File Size', value: `${(runtimeSurface.metadata.fileSize / 1024).toFixed(2)} KB` },
        { label: 'Runtime Version', value: runtimeSurface.metadata.runtimeVersion || 'N/A' },
        { label: 'Parse Date', value: new Date(runtimeSurface.metadata.parseDate).toLocaleString() },
      ],
    });

    const formatted = formatHierarchical('RUNTIME SURFACE', sections, {
      title: `RUNTIME SURFACE: ${runtimeSurface.componentId}`,
      metadata: { duration },
    });

    return {
      status: 'success',
      tool: 'getRuntimeSurface',
      data: runtimeSurface,
      timestamp: new Date().toISOString(),
      formatted,
    };
  } catch (error) {
    logger.error('getRuntimeSurface failed', {
      componentId: params.componentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const duration = Date.now() - startTime;
    const formatted = formatError(
      'getRuntimeSurface',
      {
        code: 'GET_RUNTIME_SURFACE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      {
        title: 'RUNTIME SURFACE EXTRACTION FAILED',
        context: {
          'Component ID': params.componentId,
          'Error Type': error instanceof Error ? error.constructor.name : 'Unknown',
        },
        suggestions: [
          'Verify the component exists using get_component_detail',
          'Check if the .riv file is valid and not corrupted',
          'Ensure the Rive runtime is properly initialized',
          'Check if the file path is accessible',
        ],
        metadata: { duration },
      }
    );

    return {
      status: 'error',
      tool: 'getRuntimeSurface',
      error: {
        code: 'GET_RUNTIME_SURFACE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
      formatted,
    };
  }
}
