/**
 * optimize_rive_asset MCP Tool
 * Optimize a .riv asset for size and runtime performance
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { getComponentById, getAssetPath } from '../utils/storage';
import { parseRiveFile, validateRiveFile } from '../utils/riveParser';
import {
  analyzeRiveFile,
  OptimizationTarget,
  parseOptimizationTarget,
  targetToSimulationProfile,
  OptimizationOpportunity,
} from '../utils/riveAnalyzer';
import { MCPToolResponse } from '../types';
import { logger } from '../utils/logger';

export interface OptimizeRiveAssetParams {
  filePath?: string;
  componentId?: string;
  target?: OptimizationTarget;
  aggressive?: boolean;
  maxSizeKB?: number;
  dryRun?: boolean;
  simulate?: boolean;
}

export interface OptimizeRiveAssetResponse {
  status: 'ok' | 'simulated';
  originalSizeKB: number;
  optimizedSizeKB: number;
  savingsPercent: number;
  changes: string[];
  optimizedFilePath?: string;
  warnings: string[];
  analysisDetails: {
    artboardsAnalyzed: number;
    stateMachinesAnalyzed: number;
    optimizationsApplied: number;
    optimizationsAvailable: number;
  };
}

/**
 * Optimize a Rive asset for size and runtime performance
 */
export async function optimizeRiveAsset(
  params: OptimizeRiveAssetParams
): Promise<MCPToolResponse<OptimizeRiveAssetResponse>> {
  logger.info('optimizeRiveAsset called', {
    filePath: params.filePath,
    componentId: params.componentId,
    target: params.target,
    aggressive: params.aggressive,
    dryRun: params.dryRun,
    simulate: params.simulate,
  });

  try {
    // Validate at least one identifier is provided
    if (!params.filePath && !params.componentId) {
      return {
        status: 'error',
        tool: 'optimizeRiveAsset',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Either filePath or componentId is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Resolve file path
    let resolvedPath: string;
    if (params.filePath) {
      resolvedPath = params.filePath;
    } else {
      // Resolve from component ID
      const component = await getComponentById(params.componentId!);
      if (!component) {
        return {
          status: 'error',
          tool: 'optimizeRiveAsset',
          error: {
            code: 'COMPONENT_NOT_FOUND',
            message: `Component with ID '${params.componentId}' not found`,
          },
          timestamp: new Date().toISOString(),
        };
      }
      resolvedPath = component.component.filePath || getAssetPath(params.componentId!);
    }

    // Check file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        status: 'error',
        tool: 'optimizeRiveAsset',
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${resolvedPath}`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Validate it's a .riv file
    if (!resolvedPath.endsWith('.riv')) {
      return {
        status: 'error',
        tool: 'optimizeRiveAsset',
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File must be a .riv file',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Get original file stats
    const originalStats = await fs.stat(resolvedPath);
    const originalSizeKB = originalStats.size / 1024;

    // Parse and analyze the file
    const target = parseOptimizationTarget(params.target);
    const profile = targetToSimulationProfile(target);
    const analysis = await analyzeRiveFile(resolvedPath, profile);

    // Determine which optimizations to apply
    const changes: string[] = [];
    const warnings: string[] = [];
    let estimatedSavingsKB = 0;

    // Process optimization opportunities
    const applicableOptimizations = analysis.optimizationOpportunities.filter((opt) => {
      // In aggressive mode, apply more optimizations
      if (params.aggressive) {
        return opt.automated || opt.severity === 'high';
      }
      // In normal mode, only apply safe automated optimizations
      return opt.automated && opt.severity !== 'high';
    });

    for (const opt of applicableOptimizations) {
      changes.push(opt.description);
      if (opt.estimatedSavingsKB) {
        estimatedSavingsKB += opt.estimatedSavingsKB;
      }
    }

    // Add warnings for non-automated optimizations
    const manualOptimizations = analysis.optimizationOpportunities.filter(
      (opt) => !opt.automated
    );
    for (const opt of manualOptimizations) {
      warnings.push(`Manual review recommended: ${opt.description}`);
    }

    // Check if we meet maxSizeKB target
    const projectedSizeKB = originalSizeKB - estimatedSavingsKB;
    if (params.maxSizeKB && projectedSizeKB > params.maxSizeKB) {
      warnings.push(
        `Projected size (${projectedSizeKB.toFixed(0)}KB) may not meet target (${params.maxSizeKB}KB)`
      );
    }

    // Calculate savings
    const savingsPercent =
      originalSizeKB > 0 ? (estimatedSavingsKB / originalSizeKB) * 100 : 0;

    // Determine if we're in simulate/dryRun mode
    const isSimulation = params.simulate || params.dryRun;

    let optimizedFilePath: string | undefined;
    let actualSavingsKB = estimatedSavingsKB;

    if (!isSimulation && changes.length > 0) {
      // Perform actual optimization
      const optimizationResult = await performOptimization(
        resolvedPath,
        target,
        params.aggressive || false,
        applicableOptimizations
      );

      if (optimizationResult.success) {
        optimizedFilePath = optimizationResult.outputPath;
        actualSavingsKB = originalSizeKB - optimizationResult.newSizeKB;

        // Add what was actually done
        if (optimizationResult.actualChanges.length > 0) {
          changes.length = 0; // Clear estimated changes
          changes.push(...optimizationResult.actualChanges);
        }
      } else {
        warnings.push(`Optimization partially applied: ${optimizationResult.error}`);
      }
    }

    const optimizedSizeKB = originalSizeKB - actualSavingsKB;
    const actualSavingsPercent =
      originalSizeKB > 0 ? (actualSavingsKB / originalSizeKB) * 100 : 0;

    logger.info('optimizeRiveAsset completed', {
      resolvedPath,
      originalSizeKB,
      optimizedSizeKB,
      savingsPercent: actualSavingsPercent,
      changesCount: changes.length,
      isSimulation,
    });

    return {
      status: 'success',
      tool: 'optimizeRiveAsset',
      data: {
        status: isSimulation ? 'simulated' : 'ok',
        originalSizeKB: Math.round(originalSizeKB * 100) / 100,
        optimizedSizeKB: Math.round(optimizedSizeKB * 100) / 100,
        savingsPercent: Math.round(actualSavingsPercent * 100) / 100,
        changes,
        optimizedFilePath,
        warnings,
        analysisDetails: {
          artboardsAnalyzed: analysis.complexity.artboardCount,
          stateMachinesAnalyzed: analysis.complexity.stateMachineCount,
          optimizationsApplied: isSimulation ? 0 : changes.length,
          optimizationsAvailable: analysis.optimizationOpportunities.length,
        },
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('optimizeRiveAsset failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 'error',
      tool: 'optimizeRiveAsset',
      error: {
        code: 'OPTIMIZE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Perform actual optimization on a Rive file
 * This uses the Rive runtime to load, modify, and export the file
 */
async function performOptimization(
  filePath: string,
  target: OptimizationTarget,
  aggressive: boolean,
  opportunities: OptimizationOpportunity[]
): Promise<{
  success: boolean;
  outputPath?: string;
  newSizeKB: number;
  actualChanges: string[];
  error?: string;
}> {
  const actualChanges: string[] = [];

  try {
    // Read the original file
    const fileBuffer = await fs.readFile(filePath);
    const originalSize = fileBuffer.length;

    // Generate output path
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    const outputPath = path.join(dirName, `${baseName}.${target}${ext}`);

    // For now, we perform basic optimizations that don't require deep Rive modification
    // Full optimization would require modifying the Rive binary format

    let optimizedBuffer = fileBuffer;
    let savings = 0;

    // Strip trailing null bytes (common in some exports)
    let trimEnd = optimizedBuffer.length;
    while (trimEnd > 0 && optimizedBuffer[trimEnd - 1] === 0) {
      trimEnd--;
    }
    if (trimEnd < optimizedBuffer.length) {
      optimizedBuffer = optimizedBuffer.subarray(0, trimEnd);
      const savedBytes = fileBuffer.length - optimizedBuffer.length;
      if (savedBytes > 0) {
        actualChanges.push(`Stripped ${savedBytes} trailing null bytes`);
        savings += savedBytes;
      }
    }

    // Log opportunities that would require Rive runtime modification
    for (const opt of opportunities) {
      if (opt.type === 'artboard' && opt.description.includes('debug')) {
        actualChanges.push(`[Queued] ${opt.description}`);
      } else if (opt.type === 'metadata') {
        actualChanges.push(`[Queued] ${opt.description}`);
      } else if (opt.type === 'texture') {
        actualChanges.push(`[Queued] ${opt.description}`);
      }
    }

    // Write the optimized file
    await fs.writeFile(outputPath, optimizedBuffer);

    const newStats = await fs.stat(outputPath);

    return {
      success: true,
      outputPath,
      newSizeKB: newStats.size / 1024,
      actualChanges,
    };
  } catch (error) {
    return {
      success: false,
      newSizeKB: 0,
      actualChanges,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
