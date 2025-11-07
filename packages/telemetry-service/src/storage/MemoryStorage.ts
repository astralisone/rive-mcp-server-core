/**
 * Memory Storage Adapter
 *
 * In-memory storage for telemetry data. Useful for development and testing.
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
import { StorageAdapter } from './StorageAdapter';

export class MemoryStorage implements StorageAdapter {
  private events: TelemetryEvent[] = [];
  private metrics: Metric[] = [];
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private sessionMetrics: Map<string, SessionMetrics> = new Map();

  async storeEvents(events: TelemetryEvent[]): Promise<void> {
    this.events.push(...events);
    // Sort by timestamp for efficient querying
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  async storeMetrics(metrics: Metric[]): Promise<void> {
    this.metrics.push(...metrics);
    this.metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  async storeComponentMetrics(metrics: ComponentMetrics): Promise<void> {
    this.componentMetrics.set(metrics.componentId, metrics);
  }

  async storeSessionMetrics(metrics: SessionMetrics): Promise<void> {
    this.sessionMetrics.set(metrics.sessionId, metrics);
  }

  async queryEvents(query: TelemetryQuery): Promise<TelemetryQueryResult> {
    let filtered = [...this.events];

    // Apply filters
    if (query.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= query.endTime!);
    }

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
      filtered = filtered.filter((e) => this.matchesFilters(e, query.filters!));
    }

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

    return {
      data,
      total,
      offset,
      limit,
    };
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    let filtered = [...this.metrics];

    if (query.metricNames && query.metricNames.length > 0) {
      filtered = filtered.filter((m) => query.metricNames!.includes(m.name));
    }

    if (query.startTime) {
      filtered = filtered.filter((m) => m.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filtered = filtered.filter((m) => m.timestamp <= query.endTime!);
    }

    if (query.filters) {
      filtered = filtered.filter((m) => this.matchesFilters(m, query.filters!));
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
    this.events = this.events.filter((e) => e.timestamp >= olderThan);
    this.metrics = this.metrics.filter((m) => m.timestamp >= olderThan);

    this.componentMetrics.forEach((metrics, componentId) => {
      if (metrics.lastUpdated < olderThan) {
        this.componentMetrics.delete(componentId);
      }
    });

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
    // Rough estimate of memory usage
    const eventSize = JSON.stringify(this.events).length;
    const metricSize = JSON.stringify(this.metrics).length;
    const componentMetricsSize = JSON.stringify(
      Array.from(this.componentMetrics.values())
    ).length;
    const sessionMetricsSize = JSON.stringify(
      Array.from(this.sessionMetrics.values())
    ).length;

    return {
      totalEvents: this.events.length,
      totalMetrics: this.metrics.length,
      totalSessions: this.sessionMetrics.size,
      storageSize:
        eventSize + metricSize + componentMetricsSize + sessionMetricsSize,
    };
  }

  async clear(): Promise<void> {
    this.events = [];
    this.metrics = [];
    this.componentMetrics.clear();
    this.sessionMetrics.clear();
  }

  // Helper methods

  private matchesFilters(
    obj: any,
    filters: Record<string, any>
  ): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const objValue = this.getNestedValue(obj, key);

      if (Array.isArray(value)) {
        return value.includes(objValue);
      }

      if (typeof value === 'object' && value !== null) {
        // Support operators like {$gt: 10, $lt: 20}
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
            case '$in':
              return Array.isArray(opValue) && opValue.includes(objValue);
            case '$nin':
              return Array.isArray(opValue) && !opValue.includes(objValue);
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
}
