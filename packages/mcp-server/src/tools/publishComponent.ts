/**
 * publish_component MCP Tool
 * Publish a Rive component to a versioned registry or storage backend
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getComponentById, getAssetPath, getStorageConfig, saveLibrary, getLibraryById } from '../utils/storage';
import { generateWrapper } from './generateWrapper';
import { getRuntimeSurface } from './getRuntimeSurface';
import { MCPToolResponse } from '../types';
import { logger } from '../utils/logger';

/**
 * Release channels
 */
export type ReleaseChannel = 'alpha' | 'beta' | 'rc' | 'stable';

export interface PublishComponentParams {
  componentId: string;
  version: string;
  registry: string;
  releaseChannel?: ReleaseChannel;
  includeWrappers?: boolean;
  changelog?: string;
  metadata?: Record<string, any>;
  dryRun?: boolean;
}

export interface PublishedAsset {
  type: 'riv' | 'manifest' | 'wrapper';
  framework?: string;
  localPath: string;
  publishedUri: string;
  size: number;
}

export interface PublishComponentResponse {
  status: 'published' | 'simulated';
  componentId: string;
  version: string;
  releaseChannel: ReleaseChannel;
  registry: string;
  assetUri: string;
  manifestUri: string;
  wrappers?: Record<string, string>;
  publishedAssets: PublishedAsset[];
  changelog?: string;
  metadata?: Record<string, any>;
  publishedAt: string;
}

/**
 * Parse registry URI to determine backend type
 */
function parseRegistry(registry: string): {
  type: 'local' | 's3' | 'remote';
  bucket?: string;
  basePath: string;
  baseUrl: string;
} {
  if (registry.startsWith('s3://')) {
    const parts = registry.replace('s3://', '').split('/');
    const bucket = parts[0];
    const basePath = parts.slice(1).join('/');
    return {
      type: 's3',
      bucket,
      basePath,
      baseUrl: `https://${bucket}.s3.amazonaws.com/${basePath}`,
    };
  } else if (registry.startsWith('http://') || registry.startsWith('https://')) {
    return {
      type: 'remote',
      basePath: registry,
      baseUrl: registry,
    };
  } else if (registry.startsWith('local://') || registry.startsWith('file://')) {
    const basePath = registry.replace('local://', '').replace('file://', '');
    return {
      type: 'local',
      basePath,
      baseUrl: `file://${basePath}`,
    };
  } else {
    // Assume local path
    return {
      type: 'local',
      basePath: registry,
      baseUrl: `file://${registry}`,
    };
  }
}

/**
 * Generate versioned path for an asset
 */
function getVersionedPath(
  componentId: string,
  version: string,
  fileName: string
): string {
  return `${componentId}/${version}/${fileName}`;
}

/**
 * Generate manifest JSON for published component
 */
function generatePublishManifest(
  componentId: string,
  version: string,
  releaseChannel: ReleaseChannel,
  assetUri: string,
  wrappers: Record<string, string>,
  changelog?: string,
  metadata?: Record<string, any>
): Record<string, any> {
  return {
    componentId,
    version,
    releaseChannel,
    publishedAt: new Date().toISOString(),
    assets: {
      riv: assetUri,
      wrappers,
    },
    changelog,
    metadata,
  };
}

/**
 * Publish to local filesystem
 */
async function publishToLocal(
  basePath: string,
  componentId: string,
  version: string,
  sourceFile: string,
  wrapperContents: Record<string, string>,
  manifest: Record<string, any>
): Promise<PublishedAsset[]> {
  const assets: PublishedAsset[] = [];

  // Create version directory
  const versionDir = path.join(basePath, componentId, version);
  await fs.mkdir(versionDir, { recursive: true });

  // Copy .riv file
  const rivFileName = `${componentId}.riv`;
  const rivDestPath = path.join(versionDir, rivFileName);
  await fs.copyFile(sourceFile, rivDestPath);
  const rivStats = await fs.stat(rivDestPath);
  assets.push({
    type: 'riv',
    localPath: rivDestPath,
    publishedUri: `file://${rivDestPath}`,
    size: rivStats.size,
  });

  // Write manifest
  const manifestPath = path.join(versionDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  const manifestStats = await fs.stat(manifestPath);
  assets.push({
    type: 'manifest',
    localPath: manifestPath,
    publishedUri: `file://${manifestPath}`,
    size: manifestStats.size,
  });

  // Write wrappers
  for (const [framework, content] of Object.entries(wrapperContents)) {
    const wrapperDir = path.join(versionDir, framework);
    await fs.mkdir(wrapperDir, { recursive: true });
    const wrapperPath = path.join(wrapperDir, 'index.tsx');
    await fs.writeFile(wrapperPath, content, 'utf-8');
    const wrapperStats = await fs.stat(wrapperPath);
    assets.push({
      type: 'wrapper',
      framework,
      localPath: wrapperPath,
      publishedUri: `file://${wrapperPath}`,
      size: wrapperStats.size,
    });
  }

  return assets;
}

/**
 * Simulate publish (for dryRun or unsupported backends)
 */
function simulatePublish(
  baseUrl: string,
  componentId: string,
  version: string,
  sourceFile: string,
  wrapperFrameworks: string[]
): PublishedAsset[] {
  const assets: PublishedAsset[] = [];
  const versionPath = getVersionedPath(componentId, version, '');

  // Simulated .riv
  assets.push({
    type: 'riv',
    localPath: sourceFile,
    publishedUri: `${baseUrl}/${versionPath}${componentId}.riv`,
    size: 0, // Unknown in simulation
  });

  // Simulated manifest
  assets.push({
    type: 'manifest',
    localPath: '',
    publishedUri: `${baseUrl}/${versionPath}manifest.json`,
    size: 0,
  });

  // Simulated wrappers
  for (const framework of wrapperFrameworks) {
    assets.push({
      type: 'wrapper',
      framework,
      localPath: '',
      publishedUri: `${baseUrl}/${versionPath}${framework}/index.js`,
      size: 0,
    });
  }

  return assets;
}

/**
 * Publish a Rive component to a registry
 */
export async function publishComponent(
  params: PublishComponentParams
): Promise<MCPToolResponse<PublishComponentResponse>> {
  logger.info('publishComponent called', {
    componentId: params.componentId,
    version: params.version,
    registry: params.registry,
    releaseChannel: params.releaseChannel,
    includeWrappers: params.includeWrappers,
    dryRun: params.dryRun,
  });

  try {
    // Validate required parameters
    if (!params.componentId) {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'componentId is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.version) {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'version is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.registry) {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'registry is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Validate version format (semver-like)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    if (!versionRegex.test(params.version)) {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'INVALID_VERSION',
          message: `Version '${params.version}' is not a valid semver format (e.g., 1.0.0, 2.1.0-beta.1)`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Get component info
    const componentManifest = await getComponentById(params.componentId);
    if (!componentManifest) {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'COMPONENT_NOT_FOUND',
          message: `Component with ID '${params.componentId}' not found`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    const sourceFilePath = componentManifest.component.filePath || getAssetPath(params.componentId);

    // Check source file exists
    try {
      await fs.access(sourceFilePath);
    } catch {
      return {
        status: 'error',
        tool: 'publishComponent',
        error: {
          code: 'SOURCE_FILE_NOT_FOUND',
          message: `Source file not found: ${sourceFilePath}`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Parse registry
    const registryInfo = parseRegistry(params.registry);
    const releaseChannel = params.releaseChannel || 'stable';
    const includeWrappers = params.includeWrappers !== false; // Default to true
    const dryRun = params.dryRun || false;

    // Generate wrappers if requested
    const wrapperContents: Record<string, string> = {};
    const wrapperUris: Record<string, string> = {};

    if (includeWrappers) {
      // Get runtime surface for wrapper generation
      const surfaceResult = await getRuntimeSurface({ componentId: params.componentId });

      if (surfaceResult.status === 'success' && surfaceResult.data) {
        const frameworks = ['react', 'vue'] as const;

        for (const framework of frameworks) {
          try {
            const wrapperResult = await generateWrapper({
              surface: surfaceResult.data,
              framework,
              riveSrc: `${params.componentId}.riv`,
              componentName: componentManifest.component.name.replace(/[^a-zA-Z0-9]/g, ''),
              writeToFile: false,
            });

            if (wrapperResult.status === 'success' && wrapperResult.data) {
              wrapperContents[framework] = wrapperResult.data.code;
              wrapperUris[framework] = `${registryInfo.baseUrl}/${getVersionedPath(params.componentId, params.version, `${framework}/index.js`)}`;
            }
          } catch (error) {
            logger.warn(`Failed to generate ${framework} wrapper`, {
              error: error instanceof Error ? error.message : 'Unknown',
            });
          }
        }
      }
    }

    // Build asset URI
    const assetUri = `${registryInfo.baseUrl}/${getVersionedPath(params.componentId, params.version, `${params.componentId}.riv`)}`;
    const manifestUri = `${registryInfo.baseUrl}/${getVersionedPath(params.componentId, params.version, 'manifest.json')}`;

    // Generate publish manifest
    const publishManifest = generatePublishManifest(
      params.componentId,
      params.version,
      releaseChannel,
      assetUri,
      wrapperUris,
      params.changelog,
      params.metadata
    );

    let publishedAssets: PublishedAsset[];

    if (dryRun) {
      // Simulate publish
      publishedAssets = simulatePublish(
        registryInfo.baseUrl,
        params.componentId,
        params.version,
        sourceFilePath,
        Object.keys(wrapperContents)
      );
    } else {
      // Perform actual publish based on registry type
      switch (registryInfo.type) {
        case 'local':
          publishedAssets = await publishToLocal(
            registryInfo.basePath,
            params.componentId,
            params.version,
            sourceFilePath,
            wrapperContents,
            publishManifest
          );
          break;

        case 's3':
          // For S3, simulate for now (would need AWS SDK integration)
          logger.info('S3 publish would upload to', {
            bucket: registryInfo.bucket,
            basePath: registryInfo.basePath,
          });
          publishedAssets = simulatePublish(
            registryInfo.baseUrl,
            params.componentId,
            params.version,
            sourceFilePath,
            Object.keys(wrapperContents)
          );
          // Mark as simulated since we're not actually uploading
          break;

        case 'remote':
          // Remote HTTP publish not implemented
          logger.warn('Remote HTTP publish not implemented, simulating');
          publishedAssets = simulatePublish(
            registryInfo.baseUrl,
            params.componentId,
            params.version,
            sourceFilePath,
            Object.keys(wrapperContents)
          );
          break;

        default:
          publishedAssets = simulatePublish(
            registryInfo.baseUrl,
            params.componentId,
            params.version,
            sourceFilePath,
            Object.keys(wrapperContents)
          );
      }
    }

    // Update component metadata with published version
    if (!dryRun && registryInfo.type === 'local') {
      try {
        const library = await getLibraryById(componentManifest.library.id);
        if (library) {
          const compIndex = library.library.components.findIndex(
            (c) => c.id === params.componentId
          );
          if (compIndex >= 0) {
            library.library.components[compIndex].metadata = {
              ...library.library.components[compIndex].metadata,
              publishedVersion: params.version,
              publishedAt: new Date().toISOString(),
              publishedRegistry: params.registry,
            };
            await saveLibrary(library.library);
          }
        }
      } catch (error) {
        logger.warn('Failed to update component metadata after publish', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    const isActualPublish = !dryRun && registryInfo.type === 'local';

    logger.info('publishComponent completed', {
      componentId: params.componentId,
      version: params.version,
      registry: params.registry,
      status: isActualPublish ? 'published' : 'simulated',
      assetsCount: publishedAssets.length,
    });

    return {
      status: 'success',
      tool: 'publishComponent',
      data: {
        status: isActualPublish ? 'published' : 'simulated',
        componentId: params.componentId,
        version: params.version,
        releaseChannel,
        registry: params.registry,
        assetUri,
        manifestUri,
        wrappers: Object.keys(wrapperUris).length > 0 ? wrapperUris : undefined,
        publishedAssets,
        changelog: params.changelog,
        metadata: params.metadata,
        publishedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('publishComponent failed', {
      componentId: params.componentId,
      version: params.version,
      registry: params.registry,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 'error',
      tool: 'publishComponent',
      error: {
        code: 'PUBLISH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
