import { parseRiveFile } from '../utils/riveParser';
import { saveLibrary, addComponentToLibrary } from '../utils/storage';
import { MCPToolResponse, RiveComponent, RiveLibrary } from '../types';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ImportRiveFileParams {
  filePath: string;
  libraryId?: string;
  componentName?: string;
  componentId?: string;
}

export interface ImportRiveFileResponse {
  component: RiveComponent;
  library: RiveLibrary;
  manifestCreated: boolean;
}

/**
 * Import a .riv file and auto-generate manifest
 */
export async function importRiveFile(
  params: ImportRiveFileParams
): Promise<MCPToolResponse<ImportRiveFileResponse>> {
  logger.info('importRiveFile called', {
    filePath: params.filePath,
    libraryId: params.libraryId
  });

  try {
    // Validate file path
    if (!params.filePath) {
      logger.warn('importRiveFile called without file path');
      return {
        status: 'error',
        tool: 'importRiveFile',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'File path is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Check if file exists
    logger.debug('Checking if file exists', { filePath: params.filePath });
    try {
      await fs.access(params.filePath);
    } catch {
      logger.warn('File not found', { filePath: params.filePath });
      return {
        status: 'error',
        tool: 'importRiveFile',
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${params.filePath}`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Validate it's a .riv file
    if (!params.filePath.endsWith('.riv')) {
      logger.warn('File is not a .riv file', { filePath: params.filePath });
      return {
        status: 'error',
        tool: 'importRiveFile',
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File must be a .riv file',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Parse the .riv file to extract runtime surface
    logger.debug('Parsing .riv file', { filePath: params.filePath });
    const runtimeSurface = await parseRiveFile(params.filePath);

    // Generate component ID from filename if not provided
    const fileName = path.basename(params.filePath, '.riv');
    const componentId = params.componentId || fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const componentName = params.componentName || fileName;

    logger.debug('Generated component metadata', {
      componentId,
      componentName,
      stateMachineCount: runtimeSurface.stateMachines?.length || 0
    });

    // Create component object
    const component: RiveComponent = {
      id: componentId,
      libraryId: params.libraryId || 'imported-components',
      name: componentName,
      description: `Imported from ${fileName}.riv`,
      filePath: params.filePath,
      tags: ['imported'],
      artboardName: runtimeSurface.artboards[0]?.name,
      stateMachineName: runtimeSurface.stateMachines[0]?.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        runtimeSurface,
        importedAt: new Date().toISOString(),
      },
    };

    // Determine library
    const libraryId = params.libraryId || 'imported-components';
    logger.debug('Using library', { libraryId });

    // Create or update library
    let library: RiveLibrary;
    let manifestCreated = false;

    try {
      // Try to add to existing library
      const result = await addComponentToLibrary(libraryId, component);
      if (result) {
        library = result.library;
        logger.info('Component added to existing library', { libraryId, componentId });
      } else {
        throw new Error('Library not found, will create new');
      }
    } catch {
      // Library doesn't exist, create it
      logger.debug('Creating new library', { libraryId });
      library = {
        id: libraryId,
        name: 'Imported Components',
        description: 'Components imported from .riv files',
        version: '1.0.0',
        components: [component],
        tags: ['imported'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveLibrary(library);
      manifestCreated = true;
      logger.info('New library created', { libraryId, componentId });
    }

    logger.info('importRiveFile completed successfully', {
      componentId,
      libraryId,
      manifestCreated
    });

    return {
      status: 'success',
      tool: 'importRiveFile',
      data: {
        component,
        library,
        manifestCreated,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('importRiveFile failed', {
      filePath: params.filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      status: 'error',
      tool: 'importRiveFile',
      error: {
        code: 'IMPORT_RIVE_FILE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
