/**
 * Storage Adapter Interface
 *
 * Abstract interface for storing and querying telemetry data.
 */

import {
  TelemetryEvent,
  TelemetryQuery,
  TelemetryQueryResult,
  Metric,
  MetricQuery,
  ComponentMetrics,
  SessionMetrics,
} from '@astralismotion/types';

export interface StorageAdapter {
  /**
   * Store telemetry events
   */
  storeEvents(events: TelemetryEvent[]): Promise<void>;

  /**
   * Store metrics
   */
  storeMetrics(metrics: Metric[]): Promise<void>;

  /**
   * Store component metrics
   */
  storeComponentMetrics(metrics: ComponentMetrics): Promise<void>;

  /**
   * Store session metrics
   */
  storeSessionMetrics(metrics: SessionMetrics): Promise<void>;

  /**
   * Query events
   */
  queryEvents(query: TelemetryQuery): Promise<TelemetryQueryResult>;

  /**
   * Query metrics
   */
  queryMetrics(query: MetricQuery): Promise<Metric[]>;

  /**
   * Get component metrics
   */
  getComponentMetrics(componentId?: string): Promise<ComponentMetrics[]>;

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): Promise<SessionMetrics | null>;

  /**
   * Delete old data (for retention policies)
   */
  deleteOldData(olderThan: number): Promise<void>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<{
    totalEvents: number;
    totalMetrics: number;
    totalSessions: number;
    storageSize: number;
  }>;

  /**
   * Clear all data
   */
  clear(): Promise<void>;
}
