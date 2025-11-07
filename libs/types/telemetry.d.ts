/**
 * Telemetry Type Definitions
 *
 * Core types for the telemetry and analytics system tracking
 * Rive component usage, performance, and user interactions.
 */

// Event Types
export type TelemetryEventType =
  | 'component_load'
  | 'component_ready'
  | 'animation_play'
  | 'animation_pause'
  | 'animation_stop'
  | 'animation_complete'
  | 'animation_loop'
  | 'state_change'
  | 'input_change'
  | 'event_trigger'
  | 'user_interaction'
  | 'error'
  | 'warning'
  | 'performance'
  | 'resource_load'
  | 'session_start'
  | 'session_end';

// Event Severity
export type EventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Base Telemetry Event
export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  timestamp: number;
  sessionId: string;
  componentId?: string;
  severity: EventSeverity;
  metadata?: Record<string, any>;
}

// Component Lifecycle Events
export interface ComponentLifecycleEvent extends TelemetryEvent {
  type: 'component_load' | 'component_ready';
  componentId: string;
  componentName: string;
  fileSize?: number;
  loadTime?: number;
  framework?: string;
  version?: string;
}

// Animation Events
export interface AnimationEvent extends TelemetryEvent {
  type: 'animation_play' | 'animation_pause' | 'animation_stop' | 'animation_complete' | 'animation_loop';
  componentId: string;
  animationName?: string;
  stateMachineName?: string;
  duration?: number;
  currentTime?: number;
  loopCount?: number;
}

// State Machine Events
export interface StateMachineEvent extends TelemetryEvent {
  type: 'state_change' | 'input_change' | 'event_trigger';
  componentId: string;
  stateMachineName: string;
  fromState?: string;
  toState?: string;
  inputName?: string;
  inputValue?: any;
  eventName?: string;
}

// User Interaction Events
export interface UserInteractionEvent extends TelemetryEvent {
  type: 'user_interaction';
  componentId: string;
  interactionType: 'click' | 'hover' | 'drag' | 'input' | 'scroll' | 'touch';
  target?: string;
  position?: { x: number; y: number };
  value?: any;
}

// Performance Events
export interface PerformanceEvent extends TelemetryEvent {
  type: 'performance';
  componentId: string;
  metrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  fps?: number;
  averageFps?: number;
  frameTime?: number;
  droppedFrames?: number;
  renderTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Error Events
export interface ErrorEvent extends TelemetryEvent {
  type: 'error' | 'warning';
  componentId?: string;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

// Resource Load Events
export interface ResourceLoadEvent extends TelemetryEvent {
  type: 'resource_load';
  resourceType: 'rive_file' | 'image' | 'font' | 'audio';
  resourceUrl: string;
  resourceSize: number;
  loadTime: number;
  cached: boolean;
  success: boolean;
}

// Session Events
export interface SessionEvent extends TelemetryEvent {
  type: 'session_start' | 'session_end';
  userId?: string;
  userAgent?: string;
  platform?: string;
  viewport?: { width: number; height: number };
  duration?: number;
}

// Metric Definitions
export type MetricType =
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'summary'
  | 'rate';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface ComponentMetrics {
  componentId: string;
  componentName: string;
  totalLoads: number;
  totalPlays: number;
  totalErrors: number;
  averageLoadTime: number;
  averageFps: number;
  uniqueUsers: number;
  lastUpdated: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  eventCount: number;
  errorCount: number;
  componentsUsed: string[];
  interactionCount: number;
}

// Aggregation Types
export type AggregationPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface AggregatedMetric {
  metric: string;
  period: AggregationPeriod;
  startTime: number;
  endTime: number;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  percentiles?: {
    p50?: number;
    p75?: number;
    p90?: number;
    p95?: number;
    p99?: number;
  };
  tags?: Record<string, string>;
}

// Query Types
export interface TelemetryQuery {
  startTime?: number;
  endTime?: number;
  eventTypes?: TelemetryEventType[];
  componentIds?: string[];
  sessionIds?: string[];
  severity?: EventSeverity[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface MetricQuery {
  metricNames?: string[];
  startTime?: number;
  endTime?: number;
  aggregation?: AggregationPeriod;
  groupBy?: string[];
  filters?: Record<string, any>;
  limit?: number;
}

export interface TelemetryQueryResult<T = TelemetryEvent> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

// Analytics Types
export interface ConversionFunnel {
  name: string;
  steps: FunnelStep[];
  totalEntered: number;
  totalCompleted: number;
  conversionRate: number;
  averageTime: number;
}

export interface FunnelStep {
  name: string;
  eventType: TelemetryEventType;
  entered: number;
  completed: number;
  dropoffRate: number;
  averageTime: number;
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  events: TelemetryEvent[];
  componentsVisited: string[];
  interactions: number;
  errors: number;
  conversionCompleted: boolean;
}

export interface RetentionMetrics {
  period: AggregationPeriod;
  cohortStartDate: number;
  totalUsers: number;
  returningUsers: number;
  retentionRate: number;
  breakdown: {
    day: number;
    users: number;
    rate: number;
  }[];
}

export interface FeatureAdoptionMetrics {
  featureName: string;
  componentId: string;
  totalUsers: number;
  activeUsers: number;
  adoptionRate: number;
  averageUsagePerUser: number;
  firstUsed: number;
  lastUsed: number;
  trending: 'up' | 'down' | 'stable';
}

// Configuration Types
export interface TelemetryConfig {
  enabled: boolean;
  samplingRate: number;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  endpoint?: string;
  apiKey?: string;
  privacy: PrivacySettings;
  storage: StorageConfig;
  retention: RetentionPolicy;
}

export interface PrivacySettings {
  anonymizeIPs: boolean;
  respectDoNotTrack: boolean;
  cookieConsent: boolean;
  dataMinimization: boolean;
  excludeFields?: string[];
}

export interface StorageConfig {
  type: 'memory' | 'local' | 'remote' | 'timeseries';
  path?: string;
  connectionString?: string;
  options?: Record<string, any>;
}

export interface RetentionPolicy {
  rawEvents: number;  // days
  aggregatedHourly: number;  // days
  aggregatedDaily: number;  // days
  aggregatedWeekly: number;  // days
  aggregatedMonthly: number;  // days
}

// Instrumentation Types
export interface InstrumentationOptions {
  componentId: string;
  autoTrack?: {
    lifecycle?: boolean;
    animations?: boolean;
    interactions?: boolean;
    performance?: boolean;
    errors?: boolean;
  };
  customEvents?: CustomEventConfig[];
  sampling?: number;
  metadata?: Record<string, any>;
}

export interface CustomEventConfig {
  name: string;
  type: TelemetryEventType;
  trigger: string;
  data?: Record<string, any>;
}

// Export Formats
export interface TelemetryExport {
  format: 'json' | 'csv' | 'parquet' | 'avro';
  query: TelemetryQuery | MetricQuery;
  destination?: string;
  compression?: 'gzip' | 'brotli' | 'none';
}

// Dashboard Types
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  refreshInterval?: number;
  dateRange?: {
    start: number;
    end: number;
    preset?: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
  };
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'funnel' | 'timeline';
  title: string;
  query: TelemetryQuery | MetricQuery;
  visualization?: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colors?: string[];
  };
  size?: {
    width: number;
    height: number;
  };
  position?: {
    x: number;
    y: number;
  };
}

// Alert Types
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown?: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  window: number;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, any>;
}
