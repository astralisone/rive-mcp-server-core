/**
 * Performance Monitor
 *
 * Utilities for monitoring and measuring performance metrics.
 */

import { PerformanceMetrics } from '@astralismotion/types';

export interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private measurements: Map<string, PerformanceMark[]> = new Map();

  /**
   * Start a performance measurement
   */
  start(name: string, metadata?: Record<string, any>): void {
    this.marks.set(name, {
      name,
      startTime: this.now(),
      metadata,
    });

    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End a performance measurement
   */
  end(name: string): PerformanceMark | null {
    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const endTime = this.now();
    const duration = endTime - mark.startTime;

    mark.endTime = endTime;
    mark.duration = duration;

    // Store measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push({ ...mark });

    // Use native Performance API if available
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Ignore errors from performance API
      }
    }

    this.marks.delete(name);
    return mark;
  }

  /**
   * Measure a synchronous function
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure an async function
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get measurements for a name
   */
  getMeasurements(name: string): PerformanceMark[] {
    return this.measurements.get(name) || [];
  }

  /**
   * Get statistics for measurements
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.getMeasurements(name);
    if (measurements.length === 0) {
      return null;
    }

    const durations = measurements
      .map((m) => m.duration!)
      .filter((d) => d !== undefined)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return null;
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;

    return {
      count: durations.length,
      average,
      min: durations[0],
      max: durations[durations.length - 1],
      median: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Get all measurement names
   */
  getMeasurementNames(): string[] {
    return Array.from(this.measurements.keys());
  }

  /**
   * Clear measurements
   */
  clear(name?: string): void {
    if (name) {
      this.measurements.delete(name);
      this.marks.delete(name);
    } else {
      this.measurements.clear();
      this.marks.clear();
    }
  }

  /**
   * Monitor frame rate
   */
  monitorFrameRate(callback: (fps: number) => void, interval: number = 1000): () => void {
    let frameCount = 0;
    let lastTime = this.now();
    let animationFrameId: number;

    const countFrame = () => {
      frameCount++;
      animationFrameId = requestAnimationFrame(countFrame);
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      animationFrameId = requestAnimationFrame(countFrame);
    }

    const intervalId = setInterval(() => {
      const now = this.now();
      const elapsed = now - lastTime;
      const fps = (frameCount / elapsed) * 1000;

      callback(fps);

      frameCount = 0;
      lastTime = now;
    }, interval);

    return () => {
      clearInterval(intervalId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  } {
    if (
      typeof performance !== 'undefined' &&
      (performance as any).memory
    ) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {};
  }

  /**
   * Create performance decorator
   */
  createDecorator(name?: string) {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const measurementName = name || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = function (...args: any[]) {
        const monitor = new PerformanceMonitor();
        monitor.start(measurementName);

        try {
          const result = originalMethod.apply(this, args);

          if (result instanceof Promise) {
            return result.finally(() => {
              const mark = monitor.end(measurementName);
              if (mark) {
                console.debug(`${measurementName}: ${mark.duration}ms`);
              }
            });
          }

          const mark = monitor.end(measurementName);
          if (mark) {
            console.debug(`${measurementName}: ${mark.duration}ms`);
          }

          return result;
        } catch (error) {
          monitor.end(measurementName);
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Get performance metrics snapshot
   */
  getMetricsSnapshot(): PerformanceMetrics {
    const memory = this.getMemoryUsage();

    return {
      memoryUsage: memory.usedJSHeapSize,
    };
  }

  // Private helper methods

  private now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
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
}

/**
 * Performance decorator for measuring method execution time
 */
export function Measure(name?: string) {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const monitor = new PerformanceMonitor();
    return monitor.createDecorator(name)(target, propertyKey, descriptor);
  };
}
