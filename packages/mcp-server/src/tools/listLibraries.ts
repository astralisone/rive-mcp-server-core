import { getAllLibraries } from '../utils/storage';
import { MCPToolResponse, RiveLibrary } from '../types';
import { logger } from '../utils/logger';

export interface ListLibrariesParams {
  tags?: string[];
  search?: string;
}

export async function listLibraries(
  params: ListLibrariesParams = {}
): Promise<MCPToolResponse<RiveLibrary[]>> {
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

    return {
      status: 'success',
      tool: 'listLibraries',
      data: libraries,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('listLibraries failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      status: 'error',
      tool: 'listLibraries',
      error: {
        code: 'LIST_LIBRARIES_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
