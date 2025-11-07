/**
 * Event Queue
 *
 * Thread-safe circular buffer for queuing telemetry events.
 */

import { TelemetryEvent } from '@astralismotion/types';

export class EventQueue {
  private queue: TelemetryEvent[] = [];
  private readonly maxSize: number;
  private droppedCount: number = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Add event to queue
   */
  enqueue(event: TelemetryEvent): boolean {
    if (this.queue.length >= this.maxSize) {
      // Drop oldest event when queue is full
      this.queue.shift();
      this.droppedCount++;
    }

    this.queue.push(event);
    return true;
  }

  /**
   * Remove and return next event
   */
  dequeue(): TelemetryEvent | undefined {
    return this.queue.shift();
  }

  /**
   * Remove and return all events
   */
  dequeueAll(): TelemetryEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }

  /**
   * Remove and return up to N events
   */
  dequeueBatch(count: number): TelemetryEvent[] {
    const batch = this.queue.splice(0, count);
    return batch;
  }

  /**
   * Peek at next event without removing
   */
  peek(): TelemetryEvent | undefined {
    return this.queue[0];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get number of dropped events
   */
  getDroppedCount(): number {
    return this.droppedCount;
  }

  /**
   * Reset dropped count
   */
  resetDroppedCount(): void {
    this.droppedCount = 0;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      droppedCount: this.droppedCount,
      utilization: (this.queue.length / this.maxSize) * 100,
      oldestEventTimestamp: this.queue[0]?.timestamp,
      newestEventTimestamp: this.queue[this.queue.length - 1]?.timestamp,
    };
  }
}
