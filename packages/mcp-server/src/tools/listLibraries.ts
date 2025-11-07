import { getAllLibraries } from '../utils/storage';
import { MCPToolResponse, RiveLibrary } from '../types';

export interface ListLibrariesParams {
  tags?: string[];
  search?: string;
}

export async function listLibraries(
  params: ListLibrariesParams = {}
): Promise<MCPToolResponse<RiveLibrary[]>> {
  try {
    const libraryManifests = await getAllLibraries();
    let libraries = libraryManifests.map((manifest) => manifest.library);

    // Filter by tags if provided
    if (params.tags && params.tags.length > 0) {
      libraries = libraries.filter((lib) =>
        params.tags!.some((tag) => lib.tags?.includes(tag))
      );
    }

    // Filter by search query if provided
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      libraries = libraries.filter(
        (lib) =>
          lib.name.toLowerCase().includes(searchLower) ||
          lib.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    libraries.sort((a, b) => a.name.localeCompare(b.name));

    return {
      status: 'success',
      tool: 'listLibraries',
      data: libraries,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
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
