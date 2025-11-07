/**
 * Metrics Collector
 *
 * Collects and aggregates numeric metrics over time.
 */

import {
  Metric,
  MetricType,
  ComponentMetrics,
  AggregatedMetric,
  AggregationPeriod,
} from '@astralismotion/types';

export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private aggregationCache: Map<string, AggregatedMetric[]> = new Map();

  /**
   * Record a metric value
   */
  record(
    name: string,
    value: number,
    type: MetricType = 'gauge',
    tags?: Record<string, string>,
    unit?: string
  ): void {
    const metric: Metric = {
      name,
      type,
      value,
      timestamp: Date.now(),
      tags,
      unit,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Clear cache for this metric
    this.clearAggregationCache(name);
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record(name, value, 'counter', tags);
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    this.record(name, value, 'gauge', tags, unit);
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    this.record(name, value, 'histogram', tags, unit);
  }

  /**
   * Record timing information (convenience method for histograms)
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.record(name, durationMs, 'histogram', tags, 'ms');
  }

  /**
   * Update component metrics
   */
  updateComponentMetrics(componentId: string, updates: Partial<ComponentMetrics>): void {
    let metrics = this.componentMetrics.get(componentId);

    if (!metrics) {
      metrics = {
        componentId,
        componentName: updates.componentName || componentId,
        totalLoads: 0,
        totalPlays: 0,
        totalErrors: 0,
        averageLoadTime: 0,
        averageFps: 0,
        uniqueUsers: 0,
        lastUpdated: Date.now(),
      };
      this.componentMetrics.set(componentId, metrics);
    }

    Object.assign(metrics, updates, { lastUpdated: Date.now() });
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(componentId: string): ComponentMetrics | undefined {
    return this.componentMetrics.get(componentId);
  }

  /**
   * Get all component metrics
   */
  getAllComponentMetrics(): ComponentMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Get raw metrics for a name
   */
  getMetrics(name: string, startTime?: number, endTime?: number): Metric[] {
    const metrics = this.metrics.get(name) || [];

    if (!startTime && !endTime) {
      return metrics;
    }

    return metrics.filter((m) => {
      if (startTime && m.timestamp < startTime) return false;
      if (endTime && m.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * Aggregate metrics over a time period
   */
  aggregate(
    name: string,
    period: AggregationPeriod,
    startTime?: number,
    endTime?: number
  ): AggregatedMetric[] {
    const cacheKey = `${name}_${period}_${startTime}_${endTime}`;
    const cached = this.aggregationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const metrics = this.getMetrics(name, startTime, endTime);
    if (metrics.length === 0) {
      return [];
    }

    const periodMs = this.getPeriodMilliseconds(period);
    const buckets = new Map<number, Metric[]>();

    // Group metrics into time buckets
    metrics.forEach((metric) => {
      const bucketStart = Math.floor(metric.timestamp / periodMs) * periodMs;
      if (!buckets.has(bucketStart)) {
        buckets.set(bucketStart, []);
      }
      buckets.get(bucketStart)!.push(metric);
    });

    // Calculate aggregations for each bucket
    const aggregated: AggregatedMetric[] = Array.from(buckets.entries()).map(
      ([bucketStart, bucketMetrics]) => {
        const values = bucketMetrics.map((m) => m.value);
        const sorted = [...values].sort((a, b) => a - b);

        return {
          metric: name,
          period,
          startTime: bucketStart,
          endTime: bucketStart + periodMs,
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          percentiles: this.calculatePercentiles(sorted),
          tags: bucketMetrics[0].tags,
        };
      }
    );

    this.aggregationCache.set(cacheKey, aggregated);
    return aggregated;
  }

  /**
   * Calculate statistics for a metric
   */
  calculateStats(name: string, startTime?: number, endTime?: number) {
    const metrics = this.getMetrics(name, startTime, endTime);
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map((m) => m.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this.percentile(sorted, 50),
      stdDev: this.standardDeviation(values),
      percentiles: this.calculatePercentiles(sorted),
    };
  }

  /**
   * Get metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear old metrics (data retention)
   */
  clearOldMetrics(olderThan: number): void {
    this.metrics.forEach((metricList, name) => {
      const filtered = metricList.filter((m) => m.timestamp >= olderThan);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    });

    // Clear component metrics that haven't been updated
    this.componentMetrics.forEach((metrics, componentId) => {
      if (metrics.lastUpdated < olderThan) {
        this.componentMetrics.delete(componentId);
      }
    });

    this.aggregationCache.clear();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.componentMetrics.clear();
    this.aggregationCache.clear();
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      totalMetrics: this.metrics.size,
      totalDataPoints: Array.from(this.metrics.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
      totalComponents: this.componentMetrics.size,
      metricNames: this.getMetricNames(),
    };
  }

  // Private helper methods

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

  private calculatePercentiles(sortedValues: number[]) {
    if (sortedValues.length === 0) {
      return {};
    }

    return {
      p50: this.percentile(sortedValues, 50),
      p75: this.percentile(sortedValues, 75),
      p90: this.percentile(sortedValues, 90),
      p95: this.percentile(sortedValues, 95),
      p99: this.percentile(sortedValues, 99),
    };
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private standardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private clearAggregationCache(metricName: string): void {
    const keysToDelete: string[] = [];
    this.aggregationCache.forEach((_, key) => {
      if (key.startsWith(`${metricName}_`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.aggregationCache.delete(key));
  }
}
