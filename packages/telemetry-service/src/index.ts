/**
 * Telemetry Service
 *
 * Comprehensive telemetry and analytics service for Rive MCP.
 * Tracks component usage, performance, user behavior, and provides
 * analytics capabilities for data-driven insights.
 */

// Core classes
export { TelemetryCollector } from './core/TelemetryCollector';
export { EventQueue } from './core/EventQueue';
export { SessionManager } from './core/SessionManager';
export { EventTracker } from './core/EventTracker';

// Metrics
export { MetricsCollector } from './metrics/MetricsCollector';

// Analytics
export { AnalyticsEngine } from './analytics/AnalyticsEngine';

// Storage
export { StorageAdapter } from './storage/StorageAdapter';
export { MemoryStorage } from './storage/MemoryStorage';
export { TimeSeriesStorage } from './storage/TimeSeriesStorage';

// Instrumentation
export { AutoInstrumentation } from './instrumentation/AutoInstrumentation';
export { PerformanceMonitor, Measure } from './instrumentation/PerformanceMonitor';

// MCP Integration
export {
  collectMetrics,
  analyzePerformance,
  analyzeUserBehavior,
  getRealtimeStats,
  analyzeFeatureAdoption,
  telemetryToolDefinitions,
  TelemetryToolsContext,
} from './mcp/telemetryTools';

// Configuration
export {
  defaultConfig,
  developmentConfig,
  productionConfig,
  testConfig,
} from './config/defaultConfig';

// Main service factory
import { TelemetryConfig } from '@astralismotion/types';
import { TelemetryCollector } from './core/TelemetryCollector';
import { SessionManager } from './core/SessionManager';
import { EventTracker } from './core/EventTracker';
import { MetricsCollector } from './metrics/MetricsCollector';
import { AnalyticsEngine } from './analytics/AnalyticsEngine';
import { StorageAdapter } from './storage/StorageAdapter';
import { MemoryStorage } from './storage/MemoryStorage';
import { TimeSeriesStorage } from './storage/TimeSeriesStorage';
import { AutoInstrumentation } from './instrumentation/AutoInstrumentation';
import { PerformanceMonitor } from './instrumentation/PerformanceMonitor';
import { defaultConfig } from './config/defaultConfig';

export interface TelemetryService {
  collector: TelemetryCollector;
  tracker: EventTracker;
  metrics: MetricsCollector;
  analytics: AnalyticsEngine;
  storage: StorageAdapter;
  instrumentation: AutoInstrumentation;
  performance: PerformanceMonitor;
  shutdown: () => Promise<void>;
}

/**
 * Create and initialize telemetry service
 */
export function createTelemetryService(
  config?: Partial<TelemetryConfig>
): TelemetryService {
  const finalConfig: TelemetryConfig = {
    ...defaultConfig,
    ...config,
  };

  // Create storage adapter based on config
  let storage: StorageAdapter;
  switch (finalConfig.storage.type) {
    case 'timeseries':
      storage = new TimeSeriesStorage(finalConfig.retention);
      break;
    case 'memory':
    default:
      storage = new MemoryStorage();
      break;
  }

  // Create session manager
  const sessionManager = new SessionManager();

  // Create telemetry collector
  const collector = new TelemetryCollector(finalConfig, storage, sessionManager);

  // Create event tracker
  const tracker = new EventTracker(collector);

  // Create metrics collector
  const metrics = new MetricsCollector();

  // Create analytics engine
  const analytics = new AnalyticsEngine();

  // Create instrumentation
  const instrumentation = new AutoInstrumentation(tracker);

  // Create performance monitor
  const performance = new PerformanceMonitor();

  // Shutdown function
  const shutdown = async () => {
    await collector.shutdown();
    await storage.clear();
    metrics.clear();
  };

  return {
    collector,
    tracker,
    metrics,
    analytics,
    storage,
    instrumentation,
    performance,
    shutdown,
  };
}

/**
 * Start telemetry service (legacy function for backwards compatibility)
 */
export function startTelemetryService(
  config?: Partial<TelemetryConfig>
): TelemetryService {
  const service = createTelemetryService(config);
  console.log('Telemetry service started');
  return service;
}

/**
 * Create telemetry tools context for MCP integration
 */
export function createTelemetryToolsContext(service: TelemetryService) {
  return {
    collector: service.collector,
    metrics: service.metrics,
    analytics: service.analytics,
    storage: service.storage,
  };
}

// Default export
export default {
  createTelemetryService,
  startTelemetryService,
  createTelemetryToolsContext,
};
