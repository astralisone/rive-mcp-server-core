import { getComponentsByLibrary, searchComponents } from '../utils/storage';
import { MCPToolResponse, RiveComponent } from '../types';
import { logger } from '../utils/logger';

export interface ListComponentsParams {
  libraryId?: string;
  tags?: string[];
  search?: string;
}

export async function listComponents(
  params: ListComponentsParams = {}
): Promise<MCPToolResponse<RiveComponent[]>> {
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
    const components = componentManifests.map((manifest) => manifest.component);

    // Additional filtering if search is provided and we already filtered by library
    if (params.libraryId && params.search) {
      logger.debug('Applying additional search filtering', { search: params.search });
      const searchLower = params.search.toLowerCase();
      const filteredComponents = components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchLower) ||
          comp.description?.toLowerCase().includes(searchLower)
      );

      logger.info(`listComponents completed successfully, returning ${filteredComponents.length} components`);

      return {
        status: 'success',
        tool: 'listComponents',
        data: filteredComponents,
        timestamp: new Date().toISOString(),
      };
    }

    // Sort by name
    components.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`listComponents completed successfully, returning ${components.length} components`);

    return {
      status: 'success',
      tool: 'listComponents',
      data: components,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('listComponents failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      status: 'error',
      tool: 'listComponents',
      error: {
        code: 'LIST_COMPONENTS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
