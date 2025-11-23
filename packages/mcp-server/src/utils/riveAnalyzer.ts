/**
 * Rive file analysis and optimization utilities
 * Provides deep inspection capabilities for optimization, validation, and performance analysis
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { parseRiveFile, validateRiveFile, extractRiveMetadata } from './riveParser';
import { RiveRuntimeSurface, RiveStateMachine, RiveArtboard } from '../types';
import { logger } from './logger';

/**
 * Optimization target profiles
 */
export type OptimizationTarget = 'mobile' | 'desktop' | 'web' | 'native';

/**
 * Simulation/validation profiles
 */
export type SimulationProfile = 'default' | 'mobile_low_end' | 'mobile_high_end' | 'desktop' | 'web';

/**
 * Profile-specific thresholds for validation and optimization
 */
export interface ProfileThresholds {
  maxFileSizeKB: number;
  maxArtboards: number;
  maxStateMachines: number;
  maxInputsPerStateMachine: number;
  maxNodeDepth: number;
  targetFps: number;
  maxTextureMemoryMB: number;
  maxDrawCalls: number;
}

/**
 * Get thresholds for a given profile
 */
export function getProfileThresholds(profile: SimulationProfile): ProfileThresholds {
  const profiles: Record<SimulationProfile, ProfileThresholds> = {
    mobile_low_end: {
      maxFileSizeKB: 150,
      maxArtboards: 3,
      maxStateMachines: 2,
      maxInputsPerStateMachine: 8,
      maxNodeDepth: 6,
      targetFps: 30,
      maxTextureMemoryMB: 4,
      maxDrawCalls: 200,
    },
    mobile_high_end: {
      maxFileSizeKB: 500,
      maxArtboards: 5,
      maxStateMachines: 4,
      maxInputsPerStateMachine: 15,
      maxNodeDepth: 10,
      targetFps: 60,
      maxTextureMemoryMB: 12,
      maxDrawCalls: 500,
    },
    desktop: {
      maxFileSizeKB: 2000,
      maxArtboards: 10,
      maxStateMachines: 8,
      maxInputsPerStateMachine: 30,
      maxNodeDepth: 15,
      targetFps: 60,
      maxTextureMemoryMB: 32,
      maxDrawCalls: 1000,
    },
    web: {
      maxFileSizeKB: 800,
      maxArtboards: 6,
      maxStateMachines: 5,
      maxInputsPerStateMachine: 20,
      maxNodeDepth: 12,
      targetFps: 60,
      maxTextureMemoryMB: 16,
      maxDrawCalls: 600,
    },
    default: {
      maxFileSizeKB: 1000,
      maxArtboards: 8,
      maxStateMachines: 6,
      maxInputsPerStateMachine: 25,
      maxNodeDepth: 12,
      targetFps: 60,
      maxTextureMemoryMB: 24,
      maxDrawCalls: 800,
    },
  };

  return profiles[profile];
}

/**
 * Deep analysis result for a Rive file
 */
export interface RiveAnalysisResult {
  componentId: string;
  filePath: string;
  fileSize: number;
  fileSizeKB: number;
  runtimeSurface: RiveRuntimeSurface;
  complexity: RiveComplexityMetrics;
  performanceEstimate: PerformanceEstimate;
  optimizationOpportunities: OptimizationOpportunity[];
  issues: AnalysisIssue[];
}

/**
 * Complexity metrics for a Rive file
 */
export interface RiveComplexityMetrics {
  artboardCount: number;
  stateMachineCount: number;
  totalInputCount: number;
  totalEventCount: number;
  avgInputsPerStateMachine: number;
  maxArtboardArea: number;
  estimatedNodeDepth: number;
  estimatedDrawCalls: number;
  estimatedTextureMemoryMB: number;
}

/**
 * Performance estimate based on complexity analysis
 */
export interface PerformanceEstimate {
  profile: SimulationProfile;
  estimationMode: 'runtime' | 'heuristic' | 'runtime+heuristic';
  estimatedFps: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  bottlenecks: string[];
  simulatedDurationSec?: number;
}

/**
 * Optimization opportunity identified in a Rive file
 */
export interface OptimizationOpportunity {
  type: 'artboard' | 'texture' | 'state_machine' | 'metadata' | 'unused_assets';
  description: string;
  estimatedSavingsKB?: number;
  estimatedSavingsPercent?: number;
  severity: 'low' | 'medium' | 'high';
  automated: boolean;
}

/**
 * Issue found during analysis
 */
export interface AnalysisIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  recommendation?: string;
}

/**
 * Analyze a Rive file for optimization and validation
 */
export async function analyzeRiveFile(
  filePath: string,
  profile: SimulationProfile = 'default'
): Promise<RiveAnalysisResult> {
  logger.info('Analyzing Rive file', { filePath, profile });

  // Validate file exists and is valid
  const isValid = await validateRiveFile(filePath);
  if (!isValid) {
    throw new Error(`Invalid Rive file: ${filePath}`);
  }

  // Get basic metadata
  const metadata = await extractRiveMetadata(filePath);
  const fileStats = await fs.stat(filePath);
  const fileSizeKB = fileStats.size / 1024;

  // Parse runtime surface
  const runtimeSurface = await parseRiveFile(filePath);
  const componentId = path.basename(filePath, '.riv');

  // Calculate complexity metrics
  const complexity = calculateComplexityMetrics(runtimeSurface, fileSizeKB);

  // Estimate performance
  const performanceEstimate = estimatePerformance(complexity, profile);

  // Identify optimization opportunities
  const optimizationOpportunities = identifyOptimizationOpportunities(
    runtimeSurface,
    complexity,
    fileSizeKB,
    profile
  );

  // Find issues
  const issues = findIssues(runtimeSurface, complexity, fileSizeKB, profile);

  logger.info('Rive file analysis complete', {
    filePath,
    fileSizeKB,
    artboards: complexity.artboardCount,
    stateMachines: complexity.stateMachineCount,
    issues: issues.length,
    opportunities: optimizationOpportunities.length,
  });

  return {
    componentId,
    filePath,
    fileSize: fileStats.size,
    fileSizeKB,
    runtimeSurface,
    complexity,
    performanceEstimate,
    optimizationOpportunities,
    issues,
  };
}

/**
 * Calculate complexity metrics from runtime surface
 */
function calculateComplexityMetrics(
  surface: RiveRuntimeSurface,
  fileSizeKB: number
): RiveComplexityMetrics {
  const artboardCount = surface.artboards.length;
  const stateMachineCount = surface.stateMachines.length;
  const totalInputCount = surface.stateMachines.reduce(
    (sum, sm) => sum + sm.inputs.length,
    0
  );
  const totalEventCount = surface.events.length;
  const avgInputsPerStateMachine =
    stateMachineCount > 0 ? totalInputCount / stateMachineCount : 0;

  // Calculate max artboard area
  const maxArtboardArea = surface.artboards.reduce(
    (max, ab) => Math.max(max, ab.width * ab.height),
    0
  );

  // Estimate node depth based on state machine complexity (heuristic)
  const estimatedNodeDepth = Math.ceil(
    Math.log2(totalInputCount + 1) * 2 + artboardCount
  );

  // Estimate draw calls based on artboard count and complexity
  const estimatedDrawCalls = Math.ceil(
    artboardCount * 50 + stateMachineCount * 30 + totalInputCount * 5
  );

  // Estimate texture memory based on file size and artboard area (heuristic)
  // Rough estimate: compressed textures expand ~4x, plus overhead
  const avgArtboardArea =
    artboardCount > 0
      ? surface.artboards.reduce((sum, ab) => sum + ab.width * ab.height, 0) /
        artboardCount
      : 0;
  const estimatedTextureMemoryMB =
    (fileSizeKB * 4) / 1024 + (avgArtboardArea * artboardCount * 4) / 1024 / 1024;

  return {
    artboardCount,
    stateMachineCount,
    totalInputCount,
    totalEventCount,
    avgInputsPerStateMachine,
    maxArtboardArea,
    estimatedNodeDepth,
    estimatedDrawCalls,
    estimatedTextureMemoryMB: Math.round(estimatedTextureMemoryMB * 10) / 10,
  };
}

/**
 * Estimate performance based on complexity metrics
 */
function estimatePerformance(
  complexity: RiveComplexityMetrics,
  profile: SimulationProfile
): PerformanceEstimate {
  const thresholds = getProfileThresholds(profile);
  const bottlenecks: string[] = [];

  // Calculate FPS based on complexity relative to profile thresholds
  let fpsReduction = 0;

  // Draw calls impact
  if (complexity.estimatedDrawCalls > thresholds.maxDrawCalls) {
    const excess = complexity.estimatedDrawCalls / thresholds.maxDrawCalls;
    fpsReduction += Math.min(20, (excess - 1) * 15);
    bottlenecks.push(`High draw call count (${complexity.estimatedDrawCalls})`);
  }

  // Texture memory impact
  if (complexity.estimatedTextureMemoryMB > thresholds.maxTextureMemoryMB) {
    const excess = complexity.estimatedTextureMemoryMB / thresholds.maxTextureMemoryMB;
    fpsReduction += Math.min(15, (excess - 1) * 10);
    bottlenecks.push(
      `High texture memory (${complexity.estimatedTextureMemoryMB.toFixed(1)}MB)`
    );
  }

  // Node depth impact
  if (complexity.estimatedNodeDepth > thresholds.maxNodeDepth) {
    const excess = complexity.estimatedNodeDepth / thresholds.maxNodeDepth;
    fpsReduction += Math.min(10, (excess - 1) * 8);
    bottlenecks.push(`Deep node hierarchy (${complexity.estimatedNodeDepth})`);
  }

  // State machine complexity impact
  if (complexity.stateMachineCount > thresholds.maxStateMachines) {
    fpsReduction += 5;
    bottlenecks.push(`Many state machines (${complexity.stateMachineCount})`);
  }

  const estimatedFps = Math.max(15, thresholds.targetFps - fpsReduction);
  const confidenceLevel: 'high' | 'medium' | 'low' =
    fpsReduction < 10 ? 'high' : fpsReduction < 25 ? 'medium' : 'low';

  return {
    profile,
    estimationMode: 'heuristic',
    estimatedFps: Math.round(estimatedFps),
    confidenceLevel,
    bottlenecks,
  };
}

/**
 * Identify optimization opportunities
 */
function identifyOptimizationOpportunities(
  surface: RiveRuntimeSurface,
  complexity: RiveComplexityMetrics,
  fileSizeKB: number,
  profile: SimulationProfile
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];
  const thresholds = getProfileThresholds(profile);

  // Check for potential unused artboards (heuristic: names starting with debug/test)
  const debugArtboards = surface.artboards.filter(
    (ab) =>
      ab.name.toLowerCase().includes('debug') ||
      ab.name.toLowerCase().includes('test') ||
      ab.name.toLowerCase().includes('dev')
  );
  if (debugArtboards.length > 0) {
    const estimatedSavings = (debugArtboards.length / surface.artboards.length) * fileSizeKB * 0.8;
    opportunities.push({
      type: 'artboard',
      description: `Remove ${debugArtboards.length} debug/test artboard(s): ${debugArtboards.map((a) => a.name).join(', ')}`,
      estimatedSavingsKB: Math.round(estimatedSavings),
      estimatedSavingsPercent: Math.round((estimatedSavings / fileSizeKB) * 100),
      severity: 'high',
      automated: true,
    });
  }

  // Check for oversized file
  if (fileSizeKB > thresholds.maxFileSizeKB) {
    opportunities.push({
      type: 'texture',
      description: 'Recompress textures with better settings',
      estimatedSavingsKB: Math.round(fileSizeKB * 0.2),
      estimatedSavingsPercent: 20,
      severity: 'medium',
      automated: true,
    });
  }

  // Check for editor metadata
  opportunities.push({
    type: 'metadata',
    description: 'Strip editor-only metadata',
    estimatedSavingsKB: Math.round(fileSizeKB * 0.05),
    estimatedSavingsPercent: 5,
    severity: 'low',
    automated: true,
  });

  // Check for unused state machines (heuristic)
  const unusedSMHeuristic = surface.stateMachines.filter(
    (sm) => sm.inputs.length === 0
  );
  if (unusedSMHeuristic.length > 0) {
    opportunities.push({
      type: 'state_machine',
      description: `Review ${unusedSMHeuristic.length} state machine(s) with no inputs (potentially unused)`,
      severity: 'low',
      automated: false,
    });
  }

  // Check for large artboards that could be optimized
  const largeArtboards = surface.artboards.filter(
    (ab) => ab.width * ab.height > 2048 * 2048
  );
  if (largeArtboards.length > 0) {
    opportunities.push({
      type: 'artboard',
      description: `Consider reducing size of ${largeArtboards.length} large artboard(s)`,
      severity: 'medium',
      automated: false,
    });
  }

  return opportunities;
}

/**
 * Find issues during analysis
 */
function findIssues(
  surface: RiveRuntimeSurface,
  complexity: RiveComplexityMetrics,
  fileSizeKB: number,
  profile: SimulationProfile
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const thresholds = getProfileThresholds(profile);

  // File size issues
  if (fileSizeKB > thresholds.maxFileSizeKB * 2) {
    issues.push({
      code: 'FILE_SIZE_CRITICAL',
      severity: 'error',
      message: `File size (${fileSizeKB.toFixed(0)}KB) exceeds ${thresholds.maxFileSizeKB * 2}KB limit for ${profile}`,
      recommendation: 'Optimize textures and remove unused assets',
    });
  } else if (fileSizeKB > thresholds.maxFileSizeKB) {
    issues.push({
      code: 'FILE_SIZE_WARNING',
      severity: 'warning',
      message: `File size (${fileSizeKB.toFixed(0)}KB) exceeds recommended ${thresholds.maxFileSizeKB}KB for ${profile}`,
      recommendation: 'Consider optimizing for better load times',
    });
  }

  // Artboard count issues
  if (surface.artboards.length > thresholds.maxArtboards) {
    issues.push({
      code: 'TOO_MANY_ARTBOARDS',
      severity: 'warning',
      message: `${surface.artboards.length} artboards exceed recommended ${thresholds.maxArtboards} for ${profile}`,
      recommendation: 'Remove unused artboards or split into multiple files',
    });
  }

  // No artboards (invalid file)
  if (surface.artboards.length === 0) {
    issues.push({
      code: 'NO_ARTBOARDS',
      severity: 'error',
      message: 'Rive file contains no artboards',
      recommendation: 'File may be corrupt or empty',
    });
  }

  // No state machines (limited interactivity)
  if (surface.stateMachines.length === 0) {
    issues.push({
      code: 'NO_STATE_MACHINES',
      severity: 'info',
      message: 'No state machines found - animation will be static or timeline-only',
      recommendation: 'Add state machines for interactive animations',
    });
  }

  // State machine complexity
  if (complexity.stateMachineCount > thresholds.maxStateMachines) {
    issues.push({
      code: 'STATE_MACHINE_COMPLEXITY',
      severity: 'warning',
      message: `${complexity.stateMachineCount} state machines may impact performance on ${profile}`,
      recommendation: 'Consider consolidating state machines',
    });
  }

  // Input count per state machine
  const highInputSMs = surface.stateMachines.filter(
    (sm) => sm.inputs.length > thresholds.maxInputsPerStateMachine
  );
  if (highInputSMs.length > 0) {
    issues.push({
      code: 'HIGH_INPUT_COUNT',
      severity: 'warning',
      message: `${highInputSMs.length} state machine(s) have high input counts`,
      location: highInputSMs.map((sm) => sm.name).join(', '),
      recommendation: 'Consider simplifying state machine logic',
    });
  }

  // Performance estimate issues
  if (complexity.estimatedDrawCalls > thresholds.maxDrawCalls) {
    issues.push({
      code: 'HIGH_DRAW_CALLS',
      severity: 'warning',
      message: `Estimated ${complexity.estimatedDrawCalls} draw calls exceed ${thresholds.maxDrawCalls} for ${profile}`,
      recommendation: 'Reduce visual complexity or merge layers',
    });
  }

  return issues;
}

/**
 * Calculate a grade (A-F) based on analysis results
 */
export function calculateGrade(analysis: RiveAnalysisResult): string {
  const { issues, performanceEstimate, complexity } = analysis;

  let score = 100;

  // Deduct for errors
  const errors = issues.filter((i) => i.severity === 'error');
  score -= errors.length * 25;

  // Deduct for warnings
  const warnings = issues.filter((i) => i.severity === 'warning');
  score -= warnings.length * 10;

  // Deduct for low FPS
  if (performanceEstimate.estimatedFps < 30) {
    score -= 20;
  } else if (performanceEstimate.estimatedFps < 45) {
    score -= 10;
  }

  // Deduct for low confidence
  if (performanceEstimate.confidenceLevel === 'low') {
    score -= 5;
  }

  // Calculate grade
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get optimization target from string with validation
 */
export function parseOptimizationTarget(target?: string): OptimizationTarget {
  const valid: OptimizationTarget[] = ['mobile', 'desktop', 'web', 'native'];
  if (target && valid.includes(target as OptimizationTarget)) {
    return target as OptimizationTarget;
  }
  return 'web';
}

/**
 * Get simulation profile from string with validation
 */
export function parseSimulationProfile(profile?: string): SimulationProfile {
  const valid: SimulationProfile[] = [
    'default',
    'mobile_low_end',
    'mobile_high_end',
    'desktop',
    'web',
  ];
  if (profile && valid.includes(profile as SimulationProfile)) {
    return profile as SimulationProfile;
  }
  return 'default';
}

/**
 * Map optimization target to simulation profile
 */
export function targetToSimulationProfile(target: OptimizationTarget): SimulationProfile {
  const mapping: Record<OptimizationTarget, SimulationProfile> = {
    mobile: 'mobile_low_end',
    desktop: 'desktop',
    web: 'web',
    native: 'desktop',
  };
  return mapping[target];
}
