/**
 * validate_component MCP Tool
 * Run static and simulated runtime validation for a Rive component
 */

import * as fs from 'fs/promises';
import { getComponentById, getAssetPath } from '../utils/storage';
import { parseRiveFile, validateRiveFile } from '../utils/riveParser';
import {
  analyzeRiveFile,
  calculateGrade,
  parseSimulationProfile,
  SimulationProfile,
  RiveAnalysisResult,
  AnalysisIssue,
} from '../utils/riveAnalyzer';
import { getRuntimeSurface } from './getRuntimeSurface';
import { MCPToolResponse } from '../types';
import { logger } from '../utils/logger';

export interface ValidateComponentParams {
  componentId?: string;
  filePath?: string;
  strict?: boolean;
  simulationProfile?: SimulationProfile;
  maxSimulatedSeconds?: number;
}

export interface ValidationMetrics {
  avgDrawCalls: number;
  maxNodeDepth: number;
  durationSimulatedSec: number;
  artboardCount: number;
  stateMachineCount: number;
  inputCount: number;
  eventCount: number;
}

export interface PerformanceResult {
  profile: SimulationProfile;
  estimatedFps: number;
  textureMemoryMB: number;
  fileSizeKB: number;
  grade: string;
}

export interface ValidationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'structure' | 'compatibility' | 'best-practice';
  message: string;
  action?: string;
}

export interface ValidateComponentResponse {
  componentId: string;
  grade: string;
  passed: boolean;
  estimationMode: 'runtime' | 'heuristic' | 'runtime+heuristic';
  errors: AnalysisIssue[];
  warnings: AnalysisIssue[];
  infos: AnalysisIssue[];
  performance: PerformanceResult;
  metrics: ValidationMetrics;
  recommendations: ValidationRecommendation[];
  structuralChecks: Array<{
    check: string;
    passed: boolean;
    details?: string;
  }>;
}

/**
 * Run structural checks on the component
 */
async function runStructuralChecks(
  analysis: RiveAnalysisResult,
  strict: boolean
): Promise<Array<{ check: string; passed: boolean; details?: string }>> {
  const checks: Array<{ check: string; passed: boolean; details?: string }> = [];

  // Check for artboards
  checks.push({
    check: 'Has at least one artboard',
    passed: analysis.complexity.artboardCount > 0,
    details: `Found ${analysis.complexity.artboardCount} artboard(s)`,
  });

  // Check for state machines (warning only in non-strict)
  const hasStateMachines = analysis.complexity.stateMachineCount > 0;
  checks.push({
    check: 'Has state machines for interactivity',
    passed: strict ? hasStateMachines : true,
    details: hasStateMachines
      ? `Found ${analysis.complexity.stateMachineCount} state machine(s)`
      : 'No state machines - animation may be static only',
  });

  // Check file validity
  const isValid = await validateRiveFile(analysis.filePath);
  checks.push({
    check: 'Valid Rive file format',
    passed: isValid,
    details: isValid ? 'File header is valid' : 'File may be corrupted',
  });

  // Check for reasonable file size
  const reasonableSize = analysis.fileSizeKB < 5000; // 5MB limit
  checks.push({
    check: 'File size within limits',
    passed: reasonableSize,
    details: `${analysis.fileSizeKB.toFixed(0)}KB`,
  });

  // Check for named artboards
  const hasNamedArtboards = analysis.runtimeSurface.artboards.every(
    (ab) => ab.name && ab.name.length > 0
  );
  checks.push({
    check: 'All artboards are named',
    passed: hasNamedArtboards,
    details: hasNamedArtboards ? 'All artboards have names' : 'Some artboards lack names',
  });

  // Check for inputs with default values
  const allInputs = analysis.runtimeSurface.stateMachines.flatMap((sm) => sm.inputs);
  const inputsWithDefaults = allInputs.filter((i) => i.defaultValue !== undefined);
  const hasDefaults = allInputs.length === 0 || inputsWithDefaults.length > 0;
  checks.push({
    check: 'Inputs have default values',
    passed: strict ? inputsWithDefaults.length === allInputs.length : hasDefaults,
    details: `${inputsWithDefaults.length}/${allInputs.length} inputs have defaults`,
  });

  // Check for unreachable states (heuristic)
  const unusedInputHeuristic = allInputs.filter((i) => {
    const lowerName = i.name.toLowerCase();
    return (
      lowerName.includes('unused') ||
      lowerName.includes('deprecated') ||
      lowerName.includes('old')
    );
  });
  checks.push({
    check: 'No potentially unused inputs',
    passed: unusedInputHeuristic.length === 0,
    details:
      unusedInputHeuristic.length > 0
        ? `Found ${unusedInputHeuristic.length} potentially unused input(s): ${unusedInputHeuristic.map((i) => i.name).join(', ')}`
        : 'All inputs appear to be in use',
  });

  return checks;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  analysis: RiveAnalysisResult,
  performance: PerformanceResult,
  strict: boolean
): ValidationRecommendation[] {
  const recommendations: ValidationRecommendation[] = [];

  // Performance recommendations
  if (performance.estimatedFps < 30) {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      message: `Estimated FPS (${performance.estimatedFps}) is below 30 for ${performance.profile}`,
      action: 'Reduce visual complexity, optimize textures, or simplify state machines',
    });
  } else if (performance.estimatedFps < 45) {
    recommendations.push({
      priority: 'medium',
      category: 'performance',
      message: `Estimated FPS (${performance.estimatedFps}) may cause stuttering on low-end devices`,
      action: 'Consider optimizing for mobile_low_end profile',
    });
  }

  // File size recommendations
  if (analysis.fileSizeKB > 500) {
    recommendations.push({
      priority: analysis.fileSizeKB > 1000 ? 'high' : 'medium',
      category: 'performance',
      message: `File size (${analysis.fileSizeKB.toFixed(0)}KB) may impact load times`,
      action: 'Run optimize_rive_asset to reduce file size',
    });
  }

  // Texture memory recommendations
  if (performance.textureMemoryMB > 16) {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      message: `High texture memory usage (${performance.textureMemoryMB.toFixed(1)}MB)`,
      action: 'Reduce artboard sizes or compress textures',
    });
  }

  // Structure recommendations
  if (analysis.complexity.artboardCount > 5) {
    recommendations.push({
      priority: 'medium',
      category: 'structure',
      message: `Many artboards (${analysis.complexity.artboardCount}) may indicate the file should be split`,
      action: 'Consider splitting into multiple .riv files for better maintainability',
    });
  }

  // State machine complexity
  if (analysis.complexity.avgInputsPerStateMachine > 15) {
    recommendations.push({
      priority: 'medium',
      category: 'structure',
      message: `High average inputs per state machine (${analysis.complexity.avgInputsPerStateMachine.toFixed(1)})`,
      action: 'Consider simplifying state machine logic or splitting into multiple machines',
    });
  }

  // Best practice recommendations
  const debugArtboards = analysis.runtimeSurface.artboards.filter(
    (ab) =>
      ab.name.toLowerCase().includes('debug') ||
      ab.name.toLowerCase().includes('test')
  );
  if (debugArtboards.length > 0) {
    recommendations.push({
      priority: strict ? 'high' : 'low',
      category: 'best-practice',
      message: `Found ${debugArtboards.length} debug/test artboard(s)`,
      action: 'Remove debug artboards before production deployment',
    });
  }

  // Compatibility recommendations
  if (analysis.complexity.stateMachineCount === 0) {
    recommendations.push({
      priority: 'low',
      category: 'compatibility',
      message: 'No state machines found - interactivity will be limited',
      action: 'Add state machines if interactive behavior is needed',
    });
  }

  return recommendations;
}

/**
 * Validate a Rive component
 */
export async function validateComponent(
  params: ValidateComponentParams
): Promise<MCPToolResponse<ValidateComponentResponse>> {
  logger.info('validateComponent called', {
    componentId: params.componentId,
    filePath: params.filePath,
    strict: params.strict,
    simulationProfile: params.simulationProfile,
  });

  try {
    // Validate at least one identifier is provided
    if (!params.componentId && !params.filePath) {
      return {
        status: 'error',
        tool: 'validateComponent',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Either componentId or filePath is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Resolve file path
    let resolvedPath: string;
    let componentId: string;

    if (params.filePath) {
      resolvedPath = params.filePath;
      componentId = params.componentId || resolvedPath.split('/').pop()?.replace('.riv', '') || 'unknown';
    } else {
      componentId = params.componentId!;
      const component = await getComponentById(componentId);
      if (!component) {
        return {
          status: 'error',
          tool: 'validateComponent',
          error: {
            code: 'COMPONENT_NOT_FOUND',
            message: `Component with ID '${componentId}' not found`,
          },
          timestamp: new Date().toISOString(),
        };
      }
      resolvedPath = component.component.filePath || getAssetPath(componentId);
    }

    // Check file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        status: 'error',
        tool: 'validateComponent',
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${resolvedPath}`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Parse parameters
    const profile = parseSimulationProfile(params.simulationProfile);
    const strict = params.strict || false;
    const maxSimulatedSeconds = params.maxSimulatedSeconds || 5;

    // Run full analysis
    const analysis = await analyzeRiveFile(resolvedPath, profile);

    // Calculate grade
    const grade = calculateGrade(analysis);

    // Categorize issues
    const errors = analysis.issues.filter((i) => i.severity === 'error');
    const warnings = analysis.issues.filter((i) => i.severity === 'warning');
    const infos = analysis.issues.filter((i) => i.severity === 'info');

    // In strict mode, warnings become errors
    const effectiveErrors = strict ? [...errors, ...warnings] : errors;
    const effectiveWarnings = strict ? [] : warnings;

    // Build performance result
    const performance: PerformanceResult = {
      profile,
      estimatedFps: analysis.performanceEstimate.estimatedFps,
      textureMemoryMB: analysis.complexity.estimatedTextureMemoryMB,
      fileSizeKB: analysis.fileSizeKB,
      grade,
    };

    // Build metrics
    const metrics: ValidationMetrics = {
      avgDrawCalls: analysis.complexity.estimatedDrawCalls,
      maxNodeDepth: analysis.complexity.estimatedNodeDepth,
      durationSimulatedSec: maxSimulatedSeconds,
      artboardCount: analysis.complexity.artboardCount,
      stateMachineCount: analysis.complexity.stateMachineCount,
      inputCount: analysis.complexity.totalInputCount,
      eventCount: analysis.complexity.totalEventCount,
    };

    // Run structural checks
    const structuralChecks = await runStructuralChecks(analysis, strict);

    // Generate recommendations
    const recommendations = generateRecommendations(analysis, performance, strict);

    // Determine if validation passed
    const structuralPassed = structuralChecks.every((c) => c.passed);
    const passed = effectiveErrors.length === 0 && structuralPassed;

    logger.info('validateComponent completed', {
      componentId,
      grade,
      passed,
      errorsCount: effectiveErrors.length,
      warningsCount: effectiveWarnings.length,
      recommendationsCount: recommendations.length,
    });

    return {
      status: 'success',
      tool: 'validateComponent',
      data: {
        componentId,
        grade,
        passed,
        estimationMode: 'runtime+heuristic',
        errors: effectiveErrors,
        warnings: effectiveWarnings,
        infos,
        performance,
        metrics,
        recommendations,
        structuralChecks,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('validateComponent failed', {
      componentId: params.componentId,
      filePath: params.filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 'error',
      tool: 'validateComponent',
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
