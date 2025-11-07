import { getComponentsByLibrary, searchComponents } from '../utils/storage';
import { MCPToolResponse, RiveComponent } from '../types';

export interface ListComponentsParams {
  libraryId?: string;
  tags?: string[];
  search?: string;
}

export async function listComponents(
  params: ListComponentsParams = {}
): Promise<MCPToolResponse<RiveComponent[]>> {
  try {
    let componentManifests;

    // If libraryId is specified, get components from that library only
    if (params.libraryId) {
      componentManifests = await getComponentsByLibrary(params.libraryId);
    } else {
      // Otherwise search across all libraries
      componentManifests = await searchComponents({
        name: params.search,
        tags: params.tags,
      });
    }

    const components = componentManifests.map((manifest) => manifest.component);

    // Additional filtering if search is provided and we already filtered by library
    if (params.libraryId && params.search) {
      const searchLower = params.search.toLowerCase();
      const filteredComponents = components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchLower) ||
          comp.description?.toLowerCase().includes(searchLower)
      );

      return {
        status: 'success',
        tool: 'listComponents',
        data: filteredComponents,
        timestamp: new Date().toISOString(),
      };
    }

    // Sort by name
    components.sort((a, b) => a.name.localeCompare(b.name));

    return {
      status: 'success',
      tool: 'listComponents',
      data: components,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
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
