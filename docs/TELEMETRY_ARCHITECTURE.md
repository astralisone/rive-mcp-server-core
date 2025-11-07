# Telemetry Service Architecture

## Overview

The telemetry service provides comprehensive analytics and performance tracking for the Rive MCP system. It captures component usage, performance metrics, user behavior, and provides data-driven insights through integrated analytics tools accessible via MCP.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rive Components & Wrappers                  │
│              (React, Vue, Stencil, WebComponents)               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Auto-Instrumentation                          │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │
│  │  Lifecycle   │  Animations  │ Interactions │ Performance │  │
│  │   Tracking   │   Tracking   │   Tracking   │   Monitor   │  │
│  └──────────────┴──────────────┴──────────────┴─────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Event Tracker & Collector                    │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │   Event      │   Session    │       Event Queue            │ │
│  │  Tracking    │   Manager    │   (Batching & Sampling)      │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Storage Adapters                               │
│  ┌──────────────────────┬──────────────────────────────────┐   │
│  │   Memory Storage     │   Time-Series Storage            │   │
│  │   (Development)      │   (Production with Aggregation)  │   │
│  └──────────────────────┴──────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌─────────────────────────┐
│  Metrics         │    │  Analytics Engine       │
│  Collector       │    │  - Conversion Funnels   │
│  - Aggregation   │    │  - User Journeys        │
│  - Statistics    │    │  - Retention Analysis   │
│  - Time-Series   │    │  - Feature Adoption     │
└──────────────────┘    └─────────────────────────┘
        │                         │
        └────────────┬────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Tools Layer                            │
│  ┌────────────────┬─────────────────┬────────────────────────┐ │
│  │ collect_metrics│analyze_performance│analyze_user_behavior │ │
│  ├────────────────┼─────────────────┼────────────────────────┤ │
│  │get_realtime_   │analyze_feature_│                         │ │
│  │    stats       │   adoption     │                         │ │
│  └────────────────┴─────────────────┴────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Telemetry & Analytics Agent                    │
│                    (Business Intelligence)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Event Collection Layer

#### TelemetryCollector
- **Purpose**: Main entry point for collecting telemetry events
- **Features**:
  - Event batching and queuing
  - Configurable sampling rates
  - Privacy controls (DoNotTrack, data minimization, field exclusion)
  - Automatic session management
  - Periodic flushing to storage

#### EventQueue
- **Purpose**: Thread-safe circular buffer for events
- **Features**:
  - Configurable max size (default 10,000 events)
  - Automatic dropping of oldest events when full
  - Batch dequeue operations
  - Queue statistics and monitoring

#### SessionManager
- **Purpose**: Track user sessions and activity
- **Features**:
  - Automatic session creation and timeout
  - Session activity tracking
  - Per-session metrics (events, errors, interactions, components)
  - Configurable session timeout (default 30 minutes)

### 2. Event Tracking Layer

#### EventTracker
- **Purpose**: High-level API for tracking specific event types
- **Event Categories**:
  - **Component Lifecycle**: Load, ready, initialization
  - **Animations**: Play, pause, stop, complete, loop
  - **State Machines**: State changes, input changes, event triggers
  - **User Interactions**: Click, hover, drag, input, scroll, touch
  - **Performance**: FPS, frame time, load time, resource usage
  - **Errors**: Errors and warnings with stack traces
  - **Resources**: Resource loading (Rive files, images, fonts, audio)

### 3. Metrics Collection

#### MetricsCollector
- **Purpose**: Collect and aggregate numeric metrics
- **Metric Types**:
  - **Counter**: Incrementing values (e.g., button clicks)
  - **Gauge**: Current values (e.g., active users)
  - **Histogram**: Value distributions (e.g., response times)
  - **Timing**: Duration measurements (e.g., API calls)

- **Aggregation**:
  - Time-based aggregation (minute, hour, day, week, month)
  - Statistical calculations (average, min, max, percentiles)
  - Component-level metrics tracking

### 4. Storage Layer

#### MemoryStorage
- **Purpose**: In-memory storage for development and testing
- **Features**:
  - Fast querying with filtering
  - No external dependencies
  - Automatic sorting by timestamp
  - Support for complex filters (operators: $gt, $gte, $lt, $lte, $ne, $in, $nin)

#### TimeSeriesStorage
- **Purpose**: Optimized storage for production use
- **Features**:
  - Time-bucketed storage (1-hour buckets)
  - Automatic aggregation at configurable intervals
  - Data retention policy enforcement
  - Background cleanup tasks
  - Efficient range queries

### 5. Analytics Layer

#### AnalyticsEngine
- **Purpose**: Advanced analytics and insights
- **Capabilities**:
  - **Conversion Funnels**: Multi-step funnel analysis with drop-off rates
  - **User Journeys**: Path analysis through components
  - **Retention Analysis**: Cohort-based retention over time
  - **Feature Adoption**: Usage patterns and adoption rates
  - **Drop-off Analysis**: Identify friction points in user flows

### 6. Instrumentation

#### AutoInstrumentation
- **Purpose**: Automatically instrument Rive components
- **Tracks**:
  - Component lifecycle events
  - Animation playback events
  - State machine transitions
  - User interactions (clicks, hovers, touches)
  - Performance metrics (FPS, frame time)
  - Errors and exceptions

#### PerformanceMonitor
- **Purpose**: Performance measurement utilities
- **Features**:
  - Manual start/end timing
  - Function wrapping for measurements
  - Async function support
  - Frame rate monitoring
  - Memory usage tracking
  - Method decorators (`@Measure`)

### 7. MCP Integration

#### MCP Tools
Five specialized tools for analytics:

1. **collect_metrics**
   - Retrieve telemetry metrics for components
   - Support for time ranges and aggregation
   - Component-specific filtering

2. **analyze_performance**
   - Analyze load times, FPS, frame times
   - Performance statistics (average, min, max, P95, P99)
   - Error rate tracking

3. **analyze_user_behavior**
   - User journey analysis
   - Conversion funnel analysis
   - Drop-off point identification
   - Engagement metrics

4. **get_realtime_stats**
   - Current session information
   - Queue statistics
   - Storage statistics
   - System health metrics

5. **analyze_feature_adoption**
   - Feature usage tracking
   - Adoption rate calculations
   - Trending analysis (up, down, stable)

## Data Flow

### Event Collection Flow

```
1. Component Event Occurs
   ↓
2. Auto-Instrumentation (if enabled) OR Manual Tracking
   ↓
3. EventTracker.trackXXX() called
   ↓
4. TelemetryCollector.track() applies:
   - Sampling rate
   - Privacy filters
   - Data minimization
   ↓
5. Event added to EventQueue
   ↓
6. Queue reaches batch size OR flush interval triggered
   ↓
7. Events flushed to StorageAdapter
   ↓
8. Storage persists events and updates indexes
```

### Analytics Flow

```
1. MCP Tool Called (e.g., analyze_user_behavior)
   ↓
2. Query StorageAdapter for relevant events
   ↓
3. Filter and transform events
   ↓
4. AnalyticsEngine processes data
   ↓
5. Calculate metrics and insights
   ↓
6. Return structured results to agent
```

## Event Types

### Core Events

| Event Type | Severity | Description |
|------------|----------|-------------|
| `component_load` | info | Component loaded into memory |
| `component_ready` | info | Component initialized and ready |
| `animation_play` | debug | Animation started |
| `animation_pause` | debug | Animation paused |
| `animation_stop` | debug | Animation stopped |
| `animation_complete` | info | Animation completed |
| `animation_loop` | debug | Animation looped |
| `state_change` | info | State machine state changed |
| `input_change` | debug | State machine input changed |
| `event_trigger` | info | State machine event triggered |
| `user_interaction` | info | User interacted with component |
| `error` | error | Error occurred |
| `warning` | warning | Warning issued |
| `performance` | info | Performance metrics recorded |
| `resource_load` | info | Resource loaded |
| `session_start` | info | Session started |
| `session_end` | info | Session ended |

## Metrics Tracked

### Component Metrics
- Total loads
- Total plays
- Total errors
- Average load time
- Average FPS
- Unique users
- Last updated timestamp

### Session Metrics
- Session duration
- Event count
- Error count
- Components used
- Interaction count

### Performance Metrics
- FPS (current, average)
- Frame time
- Dropped frames
- Render time
- Memory usage
- CPU usage

## Configuration

### Default Configuration
```typescript
{
  enabled: true,
  samplingRate: 1.0,           // 100% sampling
  batchSize: 100,              // Events per batch
  flushInterval: 10000,        // 10 seconds
  maxQueueSize: 10000,         // Max events in queue
  privacy: {
    anonymizeIPs: true,
    respectDoNotTrack: true,
    cookieConsent: false,
    dataMinimization: true,
    excludeFields: ['metadata.password', 'metadata.token']
  },
  storage: { type: 'memory' },
  retention: {
    rawEvents: 7,              // 7 days
    aggregatedHourly: 30,      // 30 days
    aggregatedDaily: 90,       // 90 days
    aggregatedWeekly: 180,     // 180 days
    aggregatedMonthly: 365     // 1 year
  }
}
```

### Production Configuration
```typescript
{
  enabled: true,
  samplingRate: 0.1,           // 10% sampling
  batchSize: 500,
  flushInterval: 30000,        // 30 seconds
  maxQueueSize: 50000,
  storage: { type: 'timeseries' },
  retention: {
    rawEvents: 30,             // 30 days
    aggregatedHourly: 90,      // 90 days
    aggregatedDaily: 180,      // 180 days
    aggregatedWeekly: 365,     // 1 year
    aggregatedMonthly: 730     // 2 years
  }
}
```

## Privacy & Security

### Privacy Controls
1. **Sampling**: Reduce data collection volume
2. **DoNotTrack**: Respect browser DNT settings
3. **Data Minimization**: Only collect essential fields
4. **Field Exclusion**: Exclude sensitive fields from events
5. **Cookie Consent**: Optional cookie consent checking
6. **IP Anonymization**: Hash or truncate IP addresses

### Security Considerations
- No database write operations (read-only queries)
- All sensitive fields excluded by default
- Configurable data retention policies
- No PII collection unless explicitly configured
- Local storage option for sensitive environments

## Performance Characteristics

### Event Collection
- **Overhead**: < 1ms per event (with queue)
- **Memory**: ~1KB per event in queue
- **Flush Time**: < 100ms for 100 events

### Storage
- **Memory Storage**: O(log n) query time with binary search
- **Time-Series Storage**: O(k) query time where k = number of buckets
- **Aggregation**: Background task, no blocking

### Analytics
- **Funnel Analysis**: O(n * s) where n = events, s = steps
- **Journey Analysis**: O(n) where n = events
- **Retention Analysis**: O(n * p) where n = users, p = periods

## Integration Points

### 1. Component Wrappers
- React, Vue, Stencil wrappers can automatically track events
- Opt-in instrumentation via configuration
- Custom event tracking API available

### 2. MCP Server
- Tools registered in MCP server tool list
- Context passed to tool handlers
- Results formatted for agent consumption

### 3. External Analytics
- Export capability for external systems
- Webhook support for real-time streaming
- REST API for dashboard integration

## Extensibility

### Custom Storage Adapters
Implement `StorageAdapter` interface:
- `storeEvents()`
- `storeMetrics()`
- `queryEvents()`
- `queryMetrics()`
- `deleteOldData()`

### Custom Event Types
Define custom telemetry events:
```typescript
interface CustomEvent extends TelemetryEvent {
  type: 'custom_event_type';
  metadata: {
    // Custom fields
  };
}
```

### Custom Analytics
Extend `AnalyticsEngine` with domain-specific analysis:
```typescript
class CustomAnalytics extends AnalyticsEngine {
  analyzeCustomMetric(events: TelemetryEvent[]) {
    // Custom analysis logic
  }
}
```

## Usage Examples

See `/packages/telemetry-service/README.md` for detailed usage examples including:
- Basic setup and configuration
- Auto-instrumentation
- Manual event tracking
- Metrics collection and aggregation
- Analytics queries
- MCP tool integration
- Performance monitoring
- Privacy configuration

## File Structure

```
packages/telemetry-service/
├── src/
│   ├── core/
│   │   ├── TelemetryCollector.ts      # Main collector
│   │   ├── EventQueue.ts               # Event buffering
│   │   ├── SessionManager.ts           # Session tracking
│   │   └── EventTracker.ts             # High-level tracking API
│   ├── metrics/
│   │   └── MetricsCollector.ts         # Metrics aggregation
│   ├── analytics/
│   │   └── AnalyticsEngine.ts          # Analytics algorithms
│   ├── storage/
│   │   ├── StorageAdapter.ts           # Storage interface
│   │   ├── MemoryStorage.ts            # In-memory storage
│   │   └── TimeSeriesStorage.ts        # Time-series storage
│   ├── instrumentation/
│   │   ├── AutoInstrumentation.ts      # Auto-tracking
│   │   └── PerformanceMonitor.ts       # Performance utilities
│   ├── mcp/
│   │   └── telemetryTools.ts           # MCP tool definitions
│   ├── config/
│   │   └── defaultConfig.ts            # Default configurations
│   └── index.ts                        # Main exports
├── package.json
├── tsconfig.json
└── README.md

libs/types/
└── telemetry.d.ts                      # Type definitions
```

## Dependencies

### Runtime Dependencies
- `@astralismotion/types` - Shared type definitions

### Development Dependencies
- `typescript` - Type system
- `@types/node` - Node.js types
- `jest` - Testing framework
- `eslint` - Code linting

## Testing Strategy

### Unit Tests
- Event queue operations
- Session management
- Metrics aggregation
- Storage adapter queries
- Analytics calculations

### Integration Tests
- End-to-end event flow
- Storage persistence
- MCP tool execution
- Auto-instrumentation

### Performance Tests
- High-volume event ingestion
- Query performance
- Memory usage
- Aggregation performance

## Future Enhancements

1. **Real-time Streaming**: WebSocket support for live dashboards
2. **Database Backends**: PostgreSQL, MongoDB, InfluxDB adapters
3. **Alerting System**: Threshold-based alerts with actions
4. **Export Formats**: CSV, Parquet, Avro exports
5. **Visualization**: Built-in dashboard components
6. **Machine Learning**: Anomaly detection, predictive analytics
7. **A/B Testing**: Experiment tracking and analysis
8. **Cohort Analysis**: Advanced cohort segmentation
9. **Custom Dashboards**: Dashboard configuration API
10. **Data Warehouse Integration**: BigQuery, Snowflake connectors

## License

MIT
