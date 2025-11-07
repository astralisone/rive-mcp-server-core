/**
 * Telemetry Collector
 *
 * Main entry point for collecting telemetry events from Rive components.
 * Handles batching, sampling, and forwarding events to storage.
 */

import {
  TelemetryEvent,
  TelemetryConfig,
  TelemetryEventType,
  EventSeverity,
} from '@astralismotion/types';
import { EventQueue } from './EventQueue';
import { SessionManager } from './SessionManager';
import { StorageAdapter } from '../storage/StorageAdapter';

export class TelemetryCollector {
  private config: TelemetryConfig;
  private queue: EventQueue;
  private sessionManager: SessionManager;
  private storage: StorageAdapter;
  private flushTimer?: NodeJS.Timeout;
  private eventIdCounter: number = 0;

  constructor(
    config: TelemetryConfig,
    storage: StorageAdapter,
    sessionManager?: SessionManager
  ) {
    this.config = config;
    this.storage = storage;
    this.sessionManager = sessionManager || new SessionManager();
    this.queue = new EventQueue(config.maxQueueSize);

    if (config.enabled && config.flushInterval > 0) {
      this.startAutoFlush();
    }
  }

  /**
   * Track a telemetry event
   */
  track(
    type: TelemetryEventType,
    data: Partial<TelemetryEvent> = {}
  ): string | null {
    if (!this.config.enabled) {
      return null;
    }

    // Apply sampling rate
    if (Math.random() > this.config.samplingRate) {
      return null;
    }

    // Check privacy settings
    if (this.config.privacy.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      return null;
    }

    const event: TelemetryEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      sessionId: this.sessionManager.getCurrentSessionId(),
      severity: data.severity || 'info',
      ...data,
    };

    // Apply data minimization
    if (this.config.privacy.dataMinimization) {
      this.minimizeEventData(event);
    }

    // Exclude sensitive fields
    if (this.config.privacy.excludeFields) {
      this.excludeFields(event, this.config.privacy.excludeFields);
    }

    this.queue.enqueue(event);

    // Auto-flush if batch size reached
    if (this.queue.size() >= this.config.batchSize) {
      this.flush().catch(console.error);
    }

    return event.id;
  }

  /**
   * Track multiple events at once
   */
  trackBatch(events: Partial<TelemetryEvent>[]): string[] {
    return events
      .map((event) => this.track(event.type!, event))
      .filter((id): id is string => id !== null);
  }

  /**
   * Flush queued events to storage
   */
  async flush(): Promise<void> {
    const events = this.queue.dequeueAll();
    if (events.length === 0) {
      return;
    }

    try {
      await this.storage.storeEvents(events);
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Re-queue events on failure
      events.forEach((event) => this.queue.enqueue(event));
      throw error;
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionManager.getCurrentSessionId();
  }

  /**
   * Start a new session
   */
  startSession(userId?: string, metadata?: Record<string, any>): string {
    return this.sessionManager.startSession(userId, metadata);
  }

  /**
   * End current session
   */
  endSession(): void {
    this.sessionManager.endSession();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.flushInterval !== undefined) {
      this.stopAutoFlush();
      if (this.config.enabled && this.config.flushInterval > 0) {
        this.startAutoFlush();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  /**
   * Shutdown collector and flush remaining events
   */
  async shutdown(): Promise<void> {
    this.stopAutoFlush();
    await this.flush();
    this.sessionManager.endSession();
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      size: this.queue.size(),
      capacity: this.config.maxQueueSize,
      utilization: this.queue.size() / this.config.maxQueueSize,
    };
  }

  // Private methods

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private generateEventId(): string {
    const timestamp = Date.now();
    const counter = this.eventIdCounter++;
    const random = Math.random().toString(36).substring(2, 9);
    return `evt_${timestamp}_${counter}_${random}`;
  }

  private isDoNotTrackEnabled(): boolean {
    if (typeof navigator !== 'undefined') {
      return (
        navigator.doNotTrack === '1' ||
        (window as any).doNotTrack === '1' ||
        (navigator as any).msDoNotTrack === '1'
      );
    }
    return false;
  }

  private minimizeEventData(event: TelemetryEvent): void {
    // Remove non-essential metadata
    if (event.metadata) {
      const essentialKeys = ['componentId', 'componentName', 'eventName'];
      event.metadata = Object.keys(event.metadata)
        .filter((key) => essentialKeys.includes(key))
        .reduce((obj, key) => {
          obj[key] = event.metadata![key];
          return obj;
        }, {} as Record<string, any>);
    }
  }

  private excludeFields(event: TelemetryEvent, fields: string[]): void {
    fields.forEach((field) => {
      const parts = field.split('.');
      let current: any = event;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) return;
        current = current[parts[i]];
      }

      delete current[parts[parts.length - 1]];
    });
  }
}
