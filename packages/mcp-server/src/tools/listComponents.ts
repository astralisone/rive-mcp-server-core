import { getComponentsByLibrary, searchComponents } from '../utils/storage';
import { MCPToolResponse, RiveComponent } from '../types';
import { logger } from '../utils/logger';
import { formatTableResponse, formatError, ICONS, TableRow } from '../utils/responseFormatter';

export interface ListComponentsParams {
  libraryId?: string;
  tags?: string[];
  search?: string;
}

export async function listComponents(
  params: ListComponentsParams = {}
): Promise<MCPToolResponse<RiveComponent[]>> {
  const startTime = Date.now();
  logger.info('listComponents called', { params });

  try {
    let componentManifests;

    // If libraryId is specified, get components from that library only
    if (params.libraryId) {
      logger.debug('Fetching components from specific library', { libraryId: params.libraryId });
      componentManifests = await getComponentsByLibrary(params.libraryId);
    } else {
      // Otherwise search across all libraries
      logger.debug('Searching components across all libraries', {
        search: params.search,
        tags: params.tags
      });
      componentManifests = await searchComponents({
        name: params.search,
        tags: params.tags,
      });
    }

    logger.debug(`Found ${componentManifests.length} component manifests`);
    let components = componentManifests.map((manifest) => manifest.component);

    // Additional filtering if search is provided and we already filtered by library
    if (params.libraryId && params.search) {
      logger.debug('Applying additional search filtering', { search: params.search });
      const searchLower = params.search.toLowerCase();
      components = components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchLower) ||
          comp.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    components.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`listComponents completed successfully, returning ${components.length} components`);

    // Format response
    const duration = Date.now() - startTime;
    const formatted = formatTableResponse(
      'RIVE COMPONENTS',
      ['Status', 'Component ID', 'Name', 'Library', 'Artboard', 'Tags'],
      components.map((comp): TableRow => ({
        status: `${ICONS.GREEN_CIRCLE}`,
        component_id: comp.id,
        name: comp.name,
        library: comp.libraryId,
        artboard: comp.artboardName || '-',
        tags: comp.tags?.join(', ') || '-',
      })),
      {
        title: 'RIVE COMPONENTS',
        summary: `Found ${components.length} ${components.length === 1 ? 'component' : 'components'}${params.libraryId ? ` in library '${params.libraryId}'` : ' across all libraries'}`,
        metadata: { duration },
        nextSteps: [
          'Use get_component_detail to see full component information',
          'Use get_runtime_surface to extract state machines and inputs',
          'Use generate_wrapper to create framework-specific wrappers',
        ],
      }
    );

    return {
      status: 'success',
      tool: 'listComponents',
      data: components,
      timestamp: new Date().toISOString(),
      formatted,
    };
  } catch (error) {
    logger.error('listComponents failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const duration = Date.now() - startTime;
    const formatted = formatError(
      'listComponents',
      {
        code: 'LIST_COMPONENTS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      {
        title: 'COMPONENT LISTING FAILED',
        context: {
          'Library ID': params.libraryId || 'All libraries',
          'Search Query': params.search || 'None',
          'Tag Filters': params.tags?.join(', ') || 'None',
        },
        suggestions: [
          'Verify the library ID exists using list_libraries',
          'Check that components exist in the specified library',
          'Check server logs for detailed error information',
        ],
        metadata: { duration },
      }
    );

    return {
      status: 'error',
      tool: 'listComponents',
      error: {
        code: 'LIST_COMPONENTS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
      formatted,
    };
  }
}
