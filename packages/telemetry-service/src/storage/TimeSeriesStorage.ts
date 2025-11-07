/**
 * Time Series Storage Adapter
 *
 * Optimized storage for time-series telemetry data with automatic
 * aggregation and retention policies.
 */

import {
  TelemetryEvent,
  TelemetryQuery,
  TelemetryQueryResult,
  Metric,
  MetricQuery,
  ComponentMetrics,
  SessionMetrics,
  AggregatedMetric,
  AggregationPeriod,
  RetentionPolicy,
} from '@astralismotion/types';
import { StorageAdapter } from './StorageAdapter';

interface TimeBucket {
  startTime: number;
  endTime: number;
  events: TelemetryEvent[];
}

export class TimeSeriesStorage implements StorageAdapter {
  private rawEvents: Map<number, TelemetryEvent[]> = new Map();
  private aggregatedEvents: Map<string, AggregatedMetric[]> = new Map();
  private metrics: Map<number, Metric[]> = new Map();
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private sessionMetrics: Map<string, SessionMetrics> = new Map();
  private retentionPolicy: RetentionPolicy;
  private bucketSize: number = 60 * 60 * 1000; // 1 hour buckets

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy || {
      rawEvents: 7,
      aggregatedHourly: 30,
      aggregatedDaily: 90,
      aggregatedWeekly: 180,
      aggregatedMonthly: 365,
    };

    // Start automatic aggregation and cleanup
    this.startBackgroundTasks();
  }

  async storeEvents(events: TelemetryEvent[]): Promise<void> {
    events.forEach((event) => {
      const bucketKey = this.getBucketKey(event.timestamp);

      if (!this.rawEvents.has(bucketKey)) {
        this.rawEvents.set(bucketKey, []);
      }

      this.rawEvents.get(bucketKey)!.push(event);
    });
  }

  async storeMetrics(metrics: Metric[]): Promise<void> {
    metrics.forEach((metric) => {
      const bucketKey = this.getBucketKey(metric.timestamp);

      if (!this.metrics.has(bucketKey)) {
        this.metrics.set(bucketKey, []);
      }

      this.metrics.get(bucketKey)!.push(metric);
    });
  }

  async storeComponentMetrics(metrics: ComponentMetrics): Promise<void> {
    this.componentMetrics.set(metrics.componentId, metrics);
  }

  async storeSessionMetrics(metrics: SessionMetrics): Promise<void> {
    this.sessionMetrics.set(metrics.sessionId, metrics);
  }

  async queryEvents(query: TelemetryQuery): Promise<TelemetryQueryResult> {
    const startTime = query.startTime || 0;
    const endTime = query.endTime || Date.now();

    const events = this.getEventsInRange(startTime, endTime);
    let filtered = this.applyEventFilters(events, query);

    const total = filtered.length;

    // Apply sorting
    if (query.orderBy) {
      const direction = query.orderDirection === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const aVal = (a as any)[query.orderBy!];
        const bVal = (b as any)[query.orderBy!];
        return aVal > bVal ? direction : bVal > aVal ? -direction : 0;
      });
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const data = filtered.slice(offset, offset + limit);

    return { data, total, offset, limit };
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    const startTime = query.startTime || 0;
    const endTime = query.endTime || Date.now();

    const metrics = this.getMetricsInRange(startTime, endTime);
    let filtered = metrics;

    if (query.metricNames && query.metricNames.length > 0) {
      filtered = filtered.filter((m) => query.metricNames!.includes(m.name));
    }

    if (query.filters) {
      filtered = filtered.filter((m) =>
        this.matchesFilters(m, query.filters!)
      );
    }

    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  async getComponentMetrics(componentId?: string): Promise<ComponentMetrics[]> {
    if (componentId) {
      const metrics = this.componentMetrics.get(componentId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.componentMetrics.values());
  }

  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    return this.sessionMetrics.get(sessionId) || null;
  }

  async deleteOldData(olderThan: number): Promise<void> {
    // Delete raw events
    const bucketsToDelete: number[] = [];
    this.rawEvents.forEach((_, bucketKey) => {
      if (bucketKey < this.getBucketKey(olderThan)) {
        bucketsToDelete.push(bucketKey);
      }
    });
    bucketsToDelete.forEach((key) => this.rawEvents.delete(key));

    // Delete old metrics
    const metricBucketsToDelete: number[] = [];
    this.metrics.forEach((_, bucketKey) => {
      if (bucketKey < this.getBucketKey(olderThan)) {
        metricBucketsToDelete.push(bucketKey);
      }
    });
    metricBucketsToDelete.forEach((key) => this.metrics.delete(key));

    // Delete old component metrics
    this.componentMetrics.forEach((metrics, componentId) => {
      if (metrics.lastUpdated < olderThan) {
        this.componentMetrics.delete(componentId);
      }
    });

    // Delete old session metrics
    this.sessionMetrics.forEach((metrics, sessionId) => {
      if (metrics.startTime < olderThan) {
        this.sessionMetrics.delete(sessionId);
      }
    });
  }

  async getStats(): Promise<{
    totalEvents: number;
    totalMetrics: number;
    totalSessions: number;
    storageSize: number;
  }> {
    let totalEvents = 0;
    this.rawEvents.forEach((events) => {
      totalEvents += events.length;
    });

    let totalMetrics = 0;
    this.metrics.forEach((metrics) => {
      totalMetrics += metrics.length;
    });

    // Rough estimate of memory usage
    const eventsSize = Array.from(this.rawEvents.values())
      .flat()
      .reduce((sum, e) => sum + JSON.stringify(e).length, 0);

    const metricsSize = Array.from(this.metrics.values())
      .flat()
      .reduce((sum, m) => sum + JSON.stringify(m).length, 0);

    return {
      totalEvents,
      totalMetrics,
      totalSessions: this.sessionMetrics.size,
      storageSize: eventsSize + metricsSize,
    };
  }

  async clear(): Promise<void> {
    this.rawEvents.clear();
    this.aggregatedEvents.clear();
    this.metrics.clear();
    this.componentMetrics.clear();
    this.sessionMetrics.clear();
  }

  // Aggregation methods

  async aggregateEvents(period: AggregationPeriod): Promise<void> {
    const periodMs = this.getPeriodMilliseconds(period);
    const now = Date.now();
    const cutoffTime = now - this.retentionPolicy.rawEvents * 24 * 60 * 60 * 1000;

    const events = this.getEventsInRange(cutoffTime, now);
    const buckets = new Map<number, TelemetryEvent[]>();

    // Group events into aggregation buckets
    events.forEach((event) => {
      const bucketStart = Math.floor(event.timestamp / periodMs) * periodMs;
      if (!buckets.has(bucketStart)) {
        buckets.set(bucketStart, []);
      }
      buckets.get(bucketStart)!.push(event);
    });

    // Create aggregated metrics for each bucket
    const aggregated: AggregatedMetric[] = [];
    buckets.forEach((bucketEvents, bucketStart) => {
      // Aggregate event counts by type
      const eventTypeCounts = new Map<string, number>();
      bucketEvents.forEach((event) => {
        eventTypeCounts.set(
          event.type,
          (eventTypeCounts.get(event.type) || 0) + 1
        );
      });

      eventTypeCounts.forEach((count, eventType) => {
        aggregated.push({
          metric: `event_count_${eventType}`,
          period,
          startTime: bucketStart,
          endTime: bucketStart + periodMs,
          count,
          sum: count,
          average: count / bucketEvents.length,
          min: 1,
          max: count,
        });
      });
    });

    const cacheKey = `events_${period}`;
    this.aggregatedEvents.set(cacheKey, aggregated);
  }

  // Private methods

  private getBucketKey(timestamp: number): number {
    return Math.floor(timestamp / this.bucketSize) * this.bucketSize;
  }

  private getEventsInRange(startTime: number, endTime: number): TelemetryEvent[] {
    const events: TelemetryEvent[] = [];
    const startBucket = this.getBucketKey(startTime);
    const endBucket = this.getBucketKey(endTime);

    for (let bucket = startBucket; bucket <= endBucket; bucket += this.bucketSize) {
      const bucketEvents = this.rawEvents.get(bucket);
      if (bucketEvents) {
        events.push(
          ...bucketEvents.filter(
            (e) => e.timestamp >= startTime && e.timestamp <= endTime
          )
        );
      }
    }

    return events;
  }

  private getMetricsInRange(startTime: number, endTime: number): Metric[] {
    const metrics: Metric[] = [];
    const startBucket = this.getBucketKey(startTime);
    const endBucket = this.getBucketKey(endTime);

    for (let bucket = startBucket; bucket <= endBucket; bucket += this.bucketSize) {
      const bucketMetrics = this.metrics.get(bucket);
      if (bucketMetrics) {
        metrics.push(
          ...bucketMetrics.filter(
            (m) => m.timestamp >= startTime && m.timestamp <= endTime
          )
        );
      }
    }

    return metrics;
  }

  private applyEventFilters(
    events: TelemetryEvent[],
    query: TelemetryQuery
  ): TelemetryEvent[] {
    let filtered = events;

    if (query.eventTypes && query.eventTypes.length > 0) {
      filtered = filtered.filter((e) => query.eventTypes!.includes(e.type));
    }

    if (query.componentIds && query.componentIds.length > 0) {
      filtered = filtered.filter(
        (e) => e.componentId && query.componentIds!.includes(e.componentId)
      );
    }

    if (query.sessionIds && query.sessionIds.length > 0) {
      filtered = filtered.filter((e) =>
        query.sessionIds!.includes(e.sessionId)
      );
    }

    if (query.severity && query.severity.length > 0) {
      filtered = filtered.filter((e) => query.severity!.includes(e.severity));
    }

    if (query.filters) {
      filtered = filtered.filter((e) =>
        this.matchesFilters(e, query.filters!)
      );
    }

    return filtered;
  }

  private matchesFilters(obj: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const objValue = this.getNestedValue(obj, key);

      if (Array.isArray(value)) {
        return value.includes(objValue);
      }

      if (typeof value === 'object' && value !== null) {
        return Object.entries(value).every(([op, opValue]) => {
          switch (op) {
            case '$gt':
              return objValue > opValue;
            case '$gte':
              return objValue >= opValue;
            case '$lt':
              return objValue < opValue;
            case '$lte':
              return objValue <= opValue;
            case '$ne':
              return objValue !== opValue;
            default:
              return objValue === opValue;
          }
        });
      }

      return objValue === value;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getPeriodMilliseconds(period: AggregationPeriod): number {
    const periods = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }

  private startBackgroundTasks(): void {
    // Aggregate hourly every hour
    setInterval(() => {
      this.aggregateEvents('hour').catch(console.error);
    }, 60 * 60 * 1000);

    // Aggregate daily once per day
    setInterval(() => {
      this.aggregateEvents('day').catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // Clean up old data once per day
    setInterval(() => {
      const cutoff = Date.now() - this.retentionPolicy.rawEvents * 24 * 60 * 60 * 1000;
      this.deleteOldData(cutoff).catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }
}
