/**
 * MCP Telemetry Tools
 *
 * MCP tool definitions for collecting and analyzing telemetry data.
 */

import {
  TelemetryQuery,
  MetricQuery,
  TelemetryEventType,
  AggregationPeriod,
} from '@astralismotion/types';
import { TelemetryCollector } from '../core/TelemetryCollector';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { StorageAdapter } from '../storage/StorageAdapter';

export interface TelemetryToolsContext {
  collector: TelemetryCollector;
  metrics: MetricsCollector;
  analytics: AnalyticsEngine;
  storage: StorageAdapter;
}

/**
 * MCP Tool: Collect Metrics
 *
 * Retrieves telemetry metrics for a specified time period and components.
 */
export async function collectMetrics(
  context: TelemetryToolsContext,
  params: {
    componentIds?: string[];
    startTime?: number;
    endTime?: number;
    metricNames?: string[];
    aggregation?: AggregationPeriod;
  }
) {
  try {
    const { componentIds, startTime, endTime, metricNames, aggregation } = params;

    // Query events if component IDs specified
    let events: any[] = [];
    if (componentIds && componentIds.length > 0) {
      const query: TelemetryQuery = {
        componentIds,
        startTime,
        endTime,
        limit: 10000,
      };
      const result = await context.storage.queryEvents(query);
      events = result.data;
    }

    // Get component metrics
    const componentMetrics = await Promise.all(
      (componentIds || []).map((id) =>
        context.storage.getComponentMetrics(id)
      )
    );

    // Get raw metrics
    const metricQuery: MetricQuery = {
      metricNames,
      startTime,
      endTime,
      limit: 1000,
    };
    const rawMetrics = await context.storage.queryMetrics(metricQuery);

    // Calculate aggregations if requested
    let aggregatedMetrics: any = null;
    if (aggregation && metricNames) {
      aggregatedMetrics = {};
      for (const metricName of metricNames) {
        aggregatedMetrics[metricName] = context.metrics.aggregate(
          metricName,
          aggregation,
          startTime,
          endTime
        );
      }
    }

    return {
      success: true,
      data: {
        eventCount: events.length,
        componentMetrics: componentMetrics.flat(),
        rawMetrics,
        aggregatedMetrics,
        summary: {
          timeRange: {
            start: startTime || 'all',
            end: endTime || 'now',
          },
          componentsAnalyzed: componentIds?.length || 0,
          metricsCollected: rawMetrics.length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * MCP Tool: Analyze Performance
 *
 * Analyzes performance metrics for components over a time period.
 */
export async function analyzePerformance(
  context: TelemetryToolsContext,
  params: {
    componentIds?: string[];
    startTime?: number;
    endTime?: number;
    includeBreakdown?: boolean;
  }
) {
  try {
    const { componentIds, startTime, endTime, includeBreakdown } = params;

    // Query performance events
    const query: TelemetryQuery = {
      eventTypes: ['performance', 'component_load'],
      componentIds,
      startTime,
      endTime,
      limit: 10000,
    };

    const result = await context.storage.queryEvents(query);
    const events = result.data;

    // Analyze performance by component
    const performanceByComponent = new Map<string, any>();

    events.forEach((event) => {
      if (!event.componentId) return;

      if (!performanceByComponent.has(event.componentId)) {
        performanceByComponent.set(event.componentId, {
          componentId: event.componentId,
          loadTimes: [],
          fps: [],
          frameTime: [],
          errors: 0,
        });
      }

      const stats = performanceByComponent.get(event.componentId);

      if (event.type === 'component_load' && event.metadata?.loadTime) {
        stats.loadTimes.push(event.metadata.loadTime);
      }

      if (event.type === 'performance') {
        if (event.metadata?.fps) stats.fps.push(event.metadata.fps);
        if (event.metadata?.frameTime) stats.frameTime.push(event.metadata.frameTime);
      }

      if (event.type === 'error') {
        stats.errors++;
      }
    });

    // Calculate statistics
    const analysis = Array.from(performanceByComponent.entries()).map(
      ([componentId, data]) => ({
        componentId,
        loadTime: {
          average: this.average(data.loadTimes),
          min: Math.min(...data.loadTimes),
          max: Math.max(...data.loadTimes),
          p95: this.percentile(data.loadTimes, 95),
        },
        fps: {
          average: this.average(data.fps),
          min: Math.min(...data.fps),
          max: Math.max(...data.fps),
        },
        frameTime: {
          average: this.average(data.frameTime),
          p95: this.percentile(data.frameTime, 95),
          p99: this.percentile(data.frameTime, 99),
        },
        errors: data.errors,
        samples: data.loadTimes.length,
      })
    );

    // Sort by worst performance
    analysis.sort((a, b) => b.loadTime.average - a.loadTime.average);

    return {
      success: true,
      data: {
        summary: {
          componentsAnalyzed: analysis.length,
          totalSamples: events.length,
          timeRange: {
            start: startTime || 'all',
            end: endTime || 'now',
          },
        },
        performance: analysis,
        breakdown: includeBreakdown
          ? { rawEvents: events }
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * MCP Tool: Analyze User Behavior
 *
 * Analyzes user behavior patterns, journeys, and drop-off points.
 */
export async function analyzeUserBehavior(
  context: TelemetryToolsContext,
  params: {
    startTime?: number;
    endTime?: number;
    sessionIds?: string[];
    includeFunnel?: boolean;
    conversionEvent?: TelemetryEventType;
  }
) {
  try {
    const { startTime, endTime, sessionIds, includeFunnel, conversionEvent } = params;

    // Query user events
    const query: TelemetryQuery = {
      startTime,
      endTime,
      sessionIds,
      limit: 50000,
    };

    const result = await context.storage.queryEvents(query);
    const events = result.data;

    // Analyze user journeys
    const journeys = context.analytics.analyzeUserJourneys(
      events,
      conversionEvent
    );

    // Find drop-off points
    const dropOffPoints = context.analytics.findDropOffPoints(journeys);

    // Calculate conversion funnel if requested
    let funnel = null;
    if (includeFunnel) {
      funnel = context.analytics.analyzeFunnel(events, [
        { name: 'Component Load', eventType: 'component_load' },
        { name: 'Animation Play', eventType: 'animation_play' },
        { name: 'User Interaction', eventType: 'user_interaction' },
        {
          name: 'Conversion',
          eventType: conversionEvent || 'animation_complete',
        },
      ]);
    }

    // Calculate engagement metrics
    const engagementMetrics = {
      totalSessions: journeys.length,
      averageSessionDuration:
        journeys.reduce((sum, j) => sum + ((j.endTime || Date.now()) - j.startTime), 0) /
        journeys.length,
      averageInteractionsPerSession:
        journeys.reduce((sum, j) => sum + j.interactions, 0) / journeys.length,
      sessionsWithErrors: journeys.filter((j) => j.errors > 0).length,
      conversionRate: conversionEvent
        ? (journeys.filter((j) => j.conversionCompleted).length / journeys.length) * 100
        : null,
    };

    return {
      success: true,
      data: {
        summary: {
          totalSessions: journeys.length,
          totalEvents: events.length,
          timeRange: {
            start: startTime || 'all',
            end: endTime || 'now',
          },
        },
        engagement: engagementMetrics,
        dropOffPoints: dropOffPoints.slice(0, 10), // Top 10
        funnel,
        topJourneys: journeys.slice(0, 5), // Show 5 sample journeys
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * MCP Tool: Get Real-time Stats
 *
 * Retrieves real-time telemetry statistics and health metrics.
 */
export async function getRealtimeStats(
  context: TelemetryToolsContext,
  params: {
    includeQueue?: boolean;
    includeStorage?: boolean;
  }
) {
  try {
    const { includeQueue, includeStorage } = params;

    const currentSession = context.collector.getSessionId();
    const queueStats = includeQueue ? context.collector.getQueueStats() : null;
    const storageStats = includeStorage ? await context.storage.getStats() : null;
    const metricsSummary = context.metrics.getSummary();

    return {
      success: true,
      data: {
        currentSession,
        queue: queueStats,
        storage: storageStats,
        metrics: metricsSummary,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * MCP Tool: Analyze Feature Adoption
 *
 * Analyzes feature adoption rates and usage patterns.
 */
export async function analyzeFeatureAdoption(
  context: TelemetryToolsContext,
  params: {
    featureName: string;
    componentId: string;
    startTime?: number;
    endTime?: number;
  }
) {
  try {
    const { featureName, componentId, startTime, endTime } = params;

    // Query relevant events
    const query: TelemetryQuery = {
      componentIds: [componentId],
      startTime,
      endTime,
      limit: 50000,
    };

    const result = await context.storage.queryEvents(query);
    const events = result.data;

    // Analyze adoption
    const adoption = context.analytics.analyzeFeatureAdoption(
      events,
      featureName,
      componentId
    );

    return {
      success: true,
      data: {
        adoption,
        summary: {
          adoptionRate: `${adoption.adoptionRate.toFixed(2)}%`,
          trending: adoption.trending,
          totalUsers: adoption.totalUsers,
          activeUsers: adoption.activeUsers,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper functions
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Export tool definitions for MCP server registration
 */
export const telemetryToolDefinitions = [
  {
    name: 'collect_metrics',
    description: 'Collect and retrieve telemetry metrics for specified components and time periods',
    inputSchema: {
      type: 'object',
      properties: {
        componentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Component IDs to collect metrics for',
        },
        startTime: {
          type: 'number',
          description: 'Start timestamp (Unix milliseconds)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (Unix milliseconds)',
        },
        metricNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metric names to retrieve',
        },
        aggregation: {
          type: 'string',
          enum: ['minute', 'hour', 'day', 'week', 'month'],
          description: 'Aggregation period for metrics',
        },
      },
    },
  },
  {
    name: 'analyze_performance',
    description: 'Analyze performance metrics including load times, FPS, and frame times',
    inputSchema: {
      type: 'object',
      properties: {
        componentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Component IDs to analyze',
        },
        startTime: {
          type: 'number',
          description: 'Start timestamp (Unix milliseconds)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (Unix milliseconds)',
        },
        includeBreakdown: {
          type: 'boolean',
          description: 'Include detailed event breakdown',
        },
      },
    },
  },
  {
    name: 'analyze_user_behavior',
    description: 'Analyze user behavior patterns, journeys, conversion funnels, and drop-off points',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: {
          type: 'number',
          description: 'Start timestamp (Unix milliseconds)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (Unix milliseconds)',
        },
        sessionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific session IDs to analyze',
        },
        includeFunnel: {
          type: 'boolean',
          description: 'Include conversion funnel analysis',
        },
        conversionEvent: {
          type: 'string',
          description: 'Event type that represents conversion',
        },
      },
    },
  },
  {
    name: 'get_realtime_stats',
    description: 'Get real-time telemetry system statistics and health metrics',
    inputSchema: {
      type: 'object',
      properties: {
        includeQueue: {
          type: 'boolean',
          description: 'Include event queue statistics',
        },
        includeStorage: {
          type: 'boolean',
          description: 'Include storage statistics',
        },
      },
    },
  },
  {
    name: 'analyze_feature_adoption',
    description: 'Analyze feature adoption rates and usage patterns',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: {
          type: 'string',
          description: 'Name of the feature to analyze',
          required: true,
        },
        componentId: {
          type: 'string',
          description: 'Component ID containing the feature',
          required: true,
        },
        startTime: {
          type: 'number',
          description: 'Start timestamp (Unix milliseconds)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (Unix milliseconds)',
        },
      },
      required: ['featureName', 'componentId'],
    },
  },
];
