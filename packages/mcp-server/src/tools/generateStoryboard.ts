/**
 * generate_storyboard MCP Tool
 * Generate a storyboard/scene specification for multi-component orchestration
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { getRuntimeSurface } from './getRuntimeSurface';
import { getComponentById, getStorageConfig } from '../utils/storage';
import { MCPToolResponse, RiveRuntimeSurface } from '../types';
import { logger } from '../utils/logger';

/**
 * Orchestration modes
 */
export type OrchestrationMode = 'sequential' | 'parallel' | 'mixed';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'json+svg' | 'json+png';

export interface GenerateStoryboardParams {
  sceneId: string;
  components: string[];
  orchestrationMode: OrchestrationMode;
  durationSeconds?: number;
  exportFormat?: ExportFormat;
  breakpoints?: string[];
}

export interface TimelineEntry {
  t: number;
  action: 'play' | 'pause' | 'stop' | 'trigger' | 'setInput';
  componentId: string;
  phase?: string;
  stateMachine?: string;
  input?: string;
  value?: any;
  duration?: number;
}

export interface ComponentInfo {
  componentId: string;
  name: string;
  stateMachines: string[];
  estimatedDuration: number;
  inputs: Array<{ name: string; type: string }>;
  events: string[];
}

export interface StoryboardDiagram {
  format: 'svg' | 'png';
  uri?: string;
  inlineSvg?: string;
}

export interface GenerateStoryboardResponse {
  sceneId: string;
  orchestrationMode: OrchestrationMode;
  totalDurationSeconds: number;
  timeline: TimelineEntry[];
  components: ComponentInfo[];
  breakpoints: Array<{ name: string; time: number }>;
  diagram?: StoryboardDiagram;
  eventRouting: Array<{
    source: string;
    event: string;
    target: string;
    action: string;
  }>;
}

/**
 * Default animation duration estimates by complexity
 */
const DEFAULT_DURATIONS: Record<string, number> = {
  simple: 0.5,
  moderate: 1.5,
  complex: 3.0,
};

/**
 * Estimate animation duration based on component complexity
 */
function estimateDuration(surface: RiveRuntimeSurface): number {
  const inputCount = surface.stateMachines.reduce((sum, sm) => sum + sm.inputs.length, 0);
  const smCount = surface.stateMachines.length;

  if (inputCount > 10 || smCount > 3) {
    return DEFAULT_DURATIONS.complex;
  } else if (inputCount > 4 || smCount > 1) {
    return DEFAULT_DURATIONS.moderate;
  }
  return DEFAULT_DURATIONS.simple;
}

/**
 * Generate SVG diagram for the storyboard timeline
 */
function generateSvgDiagram(
  timeline: TimelineEntry[],
  components: ComponentInfo[],
  totalDuration: number,
  breakpoints: Array<{ name: string; time: number }>
): string {
  const padding = 40;
  const rowHeight = 50;
  const width = 800;
  const timelineWidth = width - padding * 2;
  const height = padding * 2 + components.length * rowHeight + 60; // Extra for legend

  const colors = [
    '#4F46E5', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
  ];

  const componentColors: Record<string, string> = {};
  components.forEach((comp, idx) => {
    componentColors[comp.componentId] = colors[idx % colors.length];
  });

  // Helper to convert time to x position
  const timeToX = (t: number) => padding + (t / totalDuration) * timelineWidth;

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .title { font: bold 14px sans-serif; fill: #1F2937; }
    .label { font: 12px sans-serif; fill: #4B5563; }
    .time { font: 10px monospace; fill: #6B7280; }
    .phase { font: 11px sans-serif; fill: #9333EA; }
    .component-name { font: 11px sans-serif; fill: #374151; }
  </style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#F9FAFB"/>

  <!-- Title -->
  <text x="${width / 2}" y="24" text-anchor="middle" class="title">Storyboard: ${timeline.length > 0 ? timeline[0].componentId.split('-')[0] : 'Scene'} Timeline</text>

  <!-- Time axis -->
  <line x1="${padding}" y1="${padding + 10}" x2="${width - padding}" y2="${padding + 10}" stroke="#D1D5DB" stroke-width="2"/>
`;

  // Time markers
  const timeMarkers = 5;
  for (let i = 0; i <= timeMarkers; i++) {
    const t = (i / timeMarkers) * totalDuration;
    const x = timeToX(t);
    svg += `  <line x1="${x}" y1="${padding + 5}" x2="${x}" y2="${padding + 15}" stroke="#9CA3AF" stroke-width="1"/>
  <text x="${x}" y="${padding + 28}" text-anchor="middle" class="time">${t.toFixed(1)}s</text>
`;
  }

  // Breakpoint markers
  for (const bp of breakpoints) {
    const x = timeToX(bp.time);
    svg += `  <line x1="${x}" y1="${padding + 10}" x2="${x}" y2="${padding + components.length * rowHeight + 10}" stroke="#9333EA" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="${x}" y="${padding + components.length * rowHeight + 25}" text-anchor="middle" class="phase">${bp.name}</text>
`;
  }

  // Component rows
  components.forEach((comp, idx) => {
    const y = padding + 40 + idx * rowHeight;
    const color = componentColors[comp.componentId];

    // Row label
    svg += `  <text x="${padding - 5}" y="${y + 20}" text-anchor="end" class="component-name">${comp.componentId}</text>
  <line x1="${padding}" y1="${y + 25}" x2="${width - padding}" y2="${y + 25}" stroke="#E5E7EB" stroke-width="1"/>
`;

    // Find timeline entries for this component
    const compEntries = timeline.filter((e) => e.componentId === comp.componentId);

    for (const entry of compEntries) {
      const x = timeToX(entry.t);
      const entryWidth = entry.duration ? (entry.duration / totalDuration) * timelineWidth : 20;

      if (entry.action === 'play') {
        // Draw a rounded rect for play action
        svg += `  <rect x="${x}" y="${y + 5}" width="${Math.max(entryWidth, 30)}" height="30" rx="4" fill="${color}" opacity="0.8"/>
  <text x="${x + Math.max(entryWidth, 30) / 2}" y="${y + 24}" text-anchor="middle" fill="white" font-size="10">▶</text>
`;
      } else if (entry.action === 'trigger') {
        // Draw a diamond for trigger
        svg += `  <polygon points="${x},${y + 5} ${x + 10},${y + 20} ${x},${y + 35} ${x - 10},${y + 20}" fill="${color}"/>
`;
      } else if (entry.action === 'setInput') {
        // Draw a circle for setInput
        svg += `  <circle cx="${x}" cy="${y + 20}" r="8" fill="${color}"/>
`;
      }
    }
  });

  // Legend
  const legendY = height - 35;
  svg += `
  <!-- Legend -->
  <rect x="${padding}" y="${legendY - 5}" width="${width - padding * 2}" height="30" fill="#F3F4F6" rx="4"/>
  <rect x="${padding + 10}" y="${legendY + 3}" width="20" height="14" rx="2" fill="#4F46E5" opacity="0.8"/>
  <text x="${padding + 35}" y="${legendY + 14}" class="label">Play</text>
  <polygon points="${padding + 90},${legendY + 3} ${padding + 100},${legendY + 10} ${padding + 90},${legendY + 17} ${padding + 80},${legendY + 10}" fill="#10B981"/>
  <text x="${padding + 105}" y="${legendY + 14}" class="label">Trigger</text>
  <circle cx="${padding + 170}" cy="${legendY + 10}" r="6" fill="#F59E0B"/>
  <text x="${padding + 180}" y="${legendY + 14}" class="label">Set Input</text>
  <line x1="${padding + 250}" y1="${legendY}" x2="${padding + 250}" y2="${legendY + 20}" stroke="#9333EA" stroke-dasharray="4,4"/>
  <text x="${padding + 255}" y="${legendY + 14}" class="label">Phase Break</text>
`;

  svg += `</svg>`;

  return svg;
}

/**
 * Generate storyboard timeline based on orchestration mode
 */
function generateTimeline(
  components: ComponentInfo[],
  mode: OrchestrationMode,
  targetDuration: number | undefined,
  breakpoints: string[]
): { timeline: TimelineEntry[]; totalDuration: number; breakpointTimes: Array<{ name: string; time: number }> } {
  const timeline: TimelineEntry[] = [];
  let currentTime = 0;

  // Calculate total estimated duration
  const totalEstimatedDuration = components.reduce((sum, c) => sum + c.estimatedDuration, 0);

  // Use target duration if provided, otherwise use estimated
  const scaleFactor = targetDuration ? targetDuration / totalEstimatedDuration : 1;

  // Generate breakpoint times
  const breakpointTimes: Array<{ name: string; time: number }> = [];
  if (breakpoints.length > 0) {
    const phaseDuration = (targetDuration || totalEstimatedDuration) / breakpoints.length;
    breakpoints.forEach((name, idx) => {
      breakpointTimes.push({ name, time: idx * phaseDuration });
    });
  }

  // Assign phases to components
  const componentsPerPhase = breakpoints.length > 0
    ? Math.ceil(components.length / breakpoints.length)
    : components.length;

  switch (mode) {
    case 'sequential':
      // Each component plays after the previous one completes
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const duration = comp.estimatedDuration * scaleFactor;
        const phaseIdx = Math.floor(i / componentsPerPhase);
        const phase = breakpoints[phaseIdx];

        timeline.push({
          t: Math.round(currentTime * 100) / 100,
          action: 'play',
          componentId: comp.componentId,
          phase,
          stateMachine: comp.stateMachines[0],
          duration,
        });

        currentTime += duration;
      }
      break;

    case 'parallel':
      // All components start at the same time
      const maxDuration = Math.max(...components.map((c) => c.estimatedDuration)) * scaleFactor;

      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const phaseIdx = Math.floor(i / componentsPerPhase);
        const phase = breakpoints[phaseIdx];

        timeline.push({
          t: 0,
          action: 'play',
          componentId: comp.componentId,
          phase,
          stateMachine: comp.stateMachines[0],
          duration: comp.estimatedDuration * scaleFactor,
        });
      }
      currentTime = maxDuration;
      break;

    case 'mixed':
      // Staggered start with overlap
      const overlapFactor = 0.3; // 30% overlap

      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const duration = comp.estimatedDuration * scaleFactor;
        const phaseIdx = Math.floor(i / componentsPerPhase);
        const phase = breakpoints[phaseIdx];

        timeline.push({
          t: Math.round(currentTime * 100) / 100,
          action: 'play',
          componentId: comp.componentId,
          phase,
          stateMachine: comp.stateMachines[0],
          duration,
        });

        // Move time forward but with overlap
        currentTime += duration * (1 - overlapFactor);
      }

      // Add the remaining duration of the last component
      const lastComp = components[components.length - 1];
      currentTime += lastComp.estimatedDuration * scaleFactor * overlapFactor;
      break;
  }

  return {
    timeline,
    totalDuration: Math.round(currentTime * 100) / 100,
    breakpointTimes,
  };
}

/**
 * Generate event routing suggestions based on component events
 */
function generateEventRouting(
  components: ComponentInfo[]
): Array<{ source: string; event: string; target: string; action: string }> {
  const routing: Array<{ source: string; event: string; target: string; action: string }> = [];

  // Generate suggestions for common event patterns
  for (let i = 0; i < components.length - 1; i++) {
    const source = components[i];
    const target = components[i + 1];

    // If source has completion-like events, route to next component
    const completionEvents = source.events.filter((e) =>
      ['complete', 'done', 'finished', 'end'].some((keyword) =>
        e.toLowerCase().includes(keyword)
      )
    );

    for (const event of completionEvents) {
      routing.push({
        source: source.componentId,
        event,
        target: target.componentId,
        action: 'play',
      });
    }

    // Suggest trigger-based routing if source has trigger inputs
    if (source.inputs.some((i) => i.type === 'trigger')) {
      routing.push({
        source: source.componentId,
        event: 'onTrigger',
        target: target.componentId,
        action: 'play',
      });
    }
  }

  return routing;
}

/**
 * Generate a storyboard/scene specification
 */
export async function generateStoryboard(
  params: GenerateStoryboardParams
): Promise<MCPToolResponse<GenerateStoryboardResponse>> {
  logger.info('generateStoryboard called', {
    sceneId: params.sceneId,
    components: params.components,
    orchestrationMode: params.orchestrationMode,
    durationSeconds: params.durationSeconds,
    exportFormat: params.exportFormat,
  });

  try {
    // Validate parameters
    if (!params.sceneId) {
      return {
        status: 'error',
        tool: 'generateStoryboard',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'sceneId is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.components || params.components.length === 0) {
      return {
        status: 'error',
        tool: 'generateStoryboard',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'At least one component is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.orchestrationMode) {
      return {
        status: 'error',
        tool: 'generateStoryboard',
        error: {
          code: 'MISSING_PARAMETER',
          message: 'orchestrationMode is required',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Gather component information
    const componentInfos: ComponentInfo[] = [];
    const errors: string[] = [];

    for (const componentId of params.components) {
      try {
        // Get runtime surface for each component
        const surfaceResult = await getRuntimeSurface({ componentId });

        if (surfaceResult.status === 'success' && surfaceResult.data) {
          const surface = surfaceResult.data;
          const component = await getComponentById(componentId);

          componentInfos.push({
            componentId,
            name: component?.component.name || componentId,
            stateMachines: surface.stateMachines.map((sm) => sm.name),
            estimatedDuration: estimateDuration(surface),
            inputs: surface.stateMachines.flatMap((sm) =>
              sm.inputs.map((i) => ({ name: i.name, type: i.type }))
            ),
            events: surface.events.map((e) => e.name),
          });
        } else {
          errors.push(`Failed to get runtime surface for ${componentId}`);
          // Add placeholder info
          componentInfos.push({
            componentId,
            name: componentId,
            stateMachines: ['DefaultStateMachine'],
            estimatedDuration: DEFAULT_DURATIONS.moderate,
            inputs: [],
            events: [],
          });
        }
      } catch (error) {
        errors.push(`Error processing ${componentId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        // Add placeholder info
        componentInfos.push({
          componentId,
          name: componentId,
          stateMachines: ['DefaultStateMachine'],
          estimatedDuration: DEFAULT_DURATIONS.moderate,
          inputs: [],
          events: [],
        });
      }
    }

    // Generate timeline
    const breakpoints = params.breakpoints || [];
    const { timeline, totalDuration, breakpointTimes } = generateTimeline(
      componentInfos,
      params.orchestrationMode,
      params.durationSeconds,
      breakpoints
    );

    // Generate event routing suggestions
    const eventRouting = generateEventRouting(componentInfos);

    // Generate diagram if requested
    let diagram: StoryboardDiagram | undefined;
    const exportFormat = params.exportFormat || 'json';

    if (exportFormat === 'json+svg' || exportFormat === 'json+png') {
      const svg = generateSvgDiagram(timeline, componentInfos, totalDuration, breakpointTimes);

      diagram = {
        format: 'svg',
        uri: `rive-mcp://storyboards/${params.sceneId}.svg`,
        inlineSvg: svg,
      };

      // Optionally save the SVG to storage
      try {
        const config = getStorageConfig();
        const storyboardsDir = path.join(config.assetsPath, 'storyboards');
        await fs.mkdir(storyboardsDir, { recursive: true });
        const svgPath = path.join(storyboardsDir, `${params.sceneId}.svg`);
        await fs.writeFile(svgPath, svg, 'utf-8');
        diagram.uri = `file://${svgPath}`;
      } catch (error) {
        logger.warn('Failed to save storyboard SVG', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    logger.info('generateStoryboard completed', {
      sceneId: params.sceneId,
      componentsCount: componentInfos.length,
      timelineEntries: timeline.length,
      totalDuration,
      hasDiagram: !!diagram,
    });

    return {
      status: 'success',
      tool: 'generateStoryboard',
      data: {
        sceneId: params.sceneId,
        orchestrationMode: params.orchestrationMode,
        totalDurationSeconds: totalDuration,
        timeline,
        components: componentInfos,
        breakpoints: breakpointTimes,
        diagram,
        eventRouting,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('generateStoryboard failed', {
      sceneId: params.sceneId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: 'error',
      tool: 'generateStoryboard',
      error: {
        code: 'GENERATE_STORYBOARD_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
