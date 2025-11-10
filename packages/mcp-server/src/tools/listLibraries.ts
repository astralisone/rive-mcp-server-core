import { getAllLibraries } from '../utils/storage';
import { MCPToolResponse, RiveLibrary } from '../types';
import { logger } from '../utils/logger';
import { formatTableResponse, formatError, ICONS, TableRow } from '../utils/responseFormatter';

export interface ListLibrariesParams {
  tags?: string[];
  search?: string;
}

export async function listLibraries(
  params: ListLibrariesParams = {}
): Promise<MCPToolResponse<RiveLibrary[]>> {
  const startTime = Date.now();
  logger.info('listLibraries called', { params });

  try {
    logger.debug('Fetching all library manifests');
    const libraryManifests = await getAllLibraries();
    let libraries = libraryManifests.map((manifest) => manifest.library);

    logger.debug(`Found ${libraries.length} libraries`);

    // Filter by tags if provided
    if (params.tags && params.tags.length > 0) {
      logger.debug('Filtering by tags', { tags: params.tags });
      libraries = libraries.filter((lib) =>
        params.tags!.some((tag) => lib.tags?.includes(tag))
      );
      logger.debug(`${libraries.length} libraries after tag filtering`);
    }

    // Filter by search query if provided
    if (params.search) {
      logger.debug('Filtering by search query', { search: params.search });
      const searchLower = params.search.toLowerCase();
      libraries = libraries.filter(
        (lib) =>
          lib.name.toLowerCase().includes(searchLower) ||
          lib.description?.toLowerCase().includes(searchLower)
      );
      logger.debug(`${libraries.length} libraries after search filtering`);
    }

    // Sort by name
    libraries.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`listLibraries completed successfully, returning ${libraries.length} libraries`);

    // Calculate total component count
    const totalComponents = libraries.reduce((sum, lib) => sum + (lib.components?.length || 0), 0);

    // Format response
    const duration = Date.now() - startTime;
    const formatted = formatTableResponse(
      'RIVE LIBRARIES',
      ['Status', 'Library ID', 'Name', 'Version', 'Components', 'Tags'],
      libraries.map((lib): TableRow => ({
        status: `${ICONS.GREEN_CIRCLE}`,
        library_id: lib.id,
        name: lib.name,
        version: lib.version,
        components: lib.components?.length || 0,
        tags: lib.tags?.join(', ') || '-',
      })),
      {
        title: 'RIVE LIBRARIES',
        summary: `Found ${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'} with ${totalComponents} total ${totalComponents === 1 ? 'component' : 'components'}`,
        metadata: { duration },
        nextSteps: [
          'Use list_components to see individual components',
          'Use get_component_detail for detailed component information',
          'Use import_rive_file to add new components',
        ],
      }
    );

    return {
      status: 'success',
      tool: 'listLibraries',
      data: libraries,
      timestamp: new Date().toISOString(),
      formatted,
    };
  } catch (error) {
    logger.error('listLibraries failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const duration = Date.now() - startTime;
    const formatted = formatError(
      'listLibraries',
      {
        code: 'LIST_LIBRARIES_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      {
        title: 'LIBRARY LISTING FAILED',
        context: {
          'Search Query': params.search || 'None',
          'Tag Filters': params.tags?.join(', ') || 'None',
          'Storage Backend': 'local',
        },
        suggestions: [
          'Check that the manifest directory exists and is readable',
          'Verify storage configuration in settings',
          'Check server logs for detailed error information',
        ],
        metadata: { duration },
      }
    );

    return {
      status: 'error',
      tool: 'listLibraries',
      error: {
        code: 'LIST_LIBRARIES_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
      formatted,
    };
  }
}
