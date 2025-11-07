# Telemetry Service

Comprehensive telemetry and analytics service for the Rive MCP system. Tracks component usage, performance metrics, user behavior, and provides data-driven insights for optimization and decision-making.

## Features

### Core Telemetry
- **Event Tracking**: Capture component lifecycle, animations, state changes, and user interactions
- **Session Management**: Track user sessions with automatic timeout and activity monitoring
- **Performance Monitoring**: Real-time FPS, frame time, load time, and resource usage tracking
- **Error Tracking**: Capture and categorize errors with stack traces and context

### Metrics & Analytics
- **Metrics Collection**: Counter, gauge, histogram, and timing metrics with aggregation
- **Component Metrics**: Per-component usage statistics, load times, and error rates
- **Conversion Funnels**: Multi-step funnel analysis with drop-off rates
- **User Journey Analysis**: Track user paths through components and identify friction points
- **Retention Analysis**: Cohort-based retention metrics over time
- **Feature Adoption**: Track feature usage and adoption rates

### Storage & Querying
- **Multiple Storage Backends**: In-memory, time-series optimized storage
- **Flexible Querying**: Filter by time range, component, session, event type, and custom filters
- **Automatic Aggregation**: Hourly, daily, weekly, monthly metric aggregation
- **Data Retention Policies**: Configurable retention for raw and aggregated data

### Instrumentation
- **Auto-Instrumentation**: Automatically track Rive component events
- **Performance Decorators**: Method-level performance measurement
- **Custom Events**: Track domain-specific events and metrics
- **Privacy Controls**: Sampling, DoNotTrack support, data minimization, field exclusion

## Installation

```bash
npm install @astralismotion/telemetry-service
```

## Quick Start

### Basic Setup

```typescript
import { createTelemetryService } from '@astralismotion/telemetry-service';

// Create service with default configuration
const telemetry = createTelemetryService();

// Track events
telemetry.tracker.trackComponentLoad({
  componentId: 'hero-animation',
  componentName: 'HeroAnimation',
  loadTime: 150,
  fileSize: 50000,
});

telemetry.tracker.trackAnimationPlay({
  componentId: 'hero-animation',
  animationName: 'idle',
});

telemetry.tracker.trackUserInteraction({
  componentId: 'hero-animation',
  interactionType: 'click',
  position: { x: 100, y: 200 },
});
```

### With Custom Configuration

```typescript
import { createTelemetryService, productionConfig } from '@astralismotion/telemetry-service';

const telemetry = createTelemetryService({
  ...productionConfig,
  samplingRate: 0.1, // 10% sampling
  endpoint: 'https://analytics.example.com/api',
  apiKey: process.env.ANALYTICS_API_KEY,
  storage: {
    type: 'timeseries',
  },
});
```

## Auto-Instrumentation

Automatically track Rive component events:

```typescript
import { createTelemetryService } from '@astralismotion/telemetry-service';
import { useRive } from '@rive-app/react-canvas';

const telemetry = createTelemetryService();

function MyComponent() {
  const { rive, RiveComponent } = useRive({
    src: 'animation.riv',
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  // Auto-instrument the Rive instance
  useEffect(() => {
    if (rive) {
      const cleanup = telemetry.instrumentation.instrument(rive, {
        componentId: 'my-component',
        autoTrack: {
          lifecycle: true,
          animations: true,
          interactions: true,
          performance: true,
          errors: true,
        },
        metadata: {
          componentName: 'MyComponent',
          version: '1.0.0',
        },
      });

      return cleanup;
    }
  }, [rive]);

  return <RiveComponent />;
}
```

## Metrics Collection

### Recording Metrics

```typescript
// Counter metric
telemetry.metrics.increment('button_clicks', 1, { button: 'submit' });

// Gauge metric
telemetry.metrics.gauge('active_users', 42);

// Timing metric
telemetry.metrics.timing('api_response_time', 250, { endpoint: '/api/data' });

// Histogram
telemetry.metrics.histogram('file_size', 50000, { type: 'rive' });
```

### Querying Metrics

```typescript
// Get raw metrics
const metrics = telemetry.metrics.getMetrics('api_response_time', startTime, endTime);

// Calculate statistics
const stats = telemetry.metrics.calculateStats('api_response_time', startTime, endTime);
console.log(`Average: ${stats.average}ms, P95: ${stats.percentiles.p95}ms`);

// Aggregate metrics
const hourly = telemetry.metrics.aggregate('api_response_time', 'hour', startTime, endTime);
```

## Analytics

### Conversion Funnel Analysis

```typescript
import { analyzeUserBehavior } from '@astralismotion/telemetry-service';

const result = await analyzeUserBehavior(
  {
    collector: telemetry.collector,
    metrics: telemetry.metrics,
    analytics: telemetry.analytics,
    storage: telemetry.storage
  },
  {
    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    includeFunnel: true,
    conversionEvent: 'animation_complete',
  }
);

console.log(`Conversion Rate: ${result.data.engagement.conversionRate}%`);
console.log('Top Drop-off Points:', result.data.dropOffPoints);
```

### Performance Analysis

```typescript
import { analyzePerformance } from '@astralismotion/telemetry-service';

const result = await analyzePerformance(
  {
    collector: telemetry.collector,
    metrics: telemetry.metrics,
    analytics: telemetry.analytics,
    storage: telemetry.storage
  },
  {
    componentIds: ['hero-animation', 'product-carousel'],
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
    includeBreakdown: true,
  }
);

result.data.performance.forEach(component => {
  console.log(`${component.componentId}:`);
  console.log(`  Average Load Time: ${component.loadTime.average}ms`);
  console.log(`  Average FPS: ${component.fps.average}`);
  console.log(`  Errors: ${component.errors}`);
});
```

### Feature Adoption

```typescript
import { analyzeFeatureAdoption } from '@astralismotion/telemetry-service';

const result = await analyzeFeatureAdoption(
  {
    collector: telemetry.collector,
    metrics: telemetry.metrics,
    analytics: telemetry.analytics,
    storage: telemetry.storage
  },
  {
    featureName: 'interactive-hotspots',
    componentId: 'product-viewer',
    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
  }
);

console.log(`Adoption Rate: ${result.data.summary.adoptionRate}`);
console.log(`Trending: ${result.data.summary.trending}`);
```

## MCP Tools Integration

The telemetry service provides MCP tools for analytics agents:

```typescript
// In your MCP server
import { telemetryToolDefinitions, createTelemetryToolsContext } from '@astralismotion/telemetry-service';

const telemetry = createTelemetryService();
const toolsContext = createTelemetryToolsContext(telemetry);

// Register tools with MCP server
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'collect_metrics':
      return await collectMetrics(toolsContext, args);
    case 'analyze_performance':
      return await analyzePerformance(toolsContext, args);
    case 'analyze_user_behavior':
      return await analyzeUserBehavior(toolsContext, args);
    case 'get_realtime_stats':
      return await getRealtimeStats(toolsContext, args);
    case 'analyze_feature_adoption':
      return await analyzeFeatureAdoption(toolsContext, args);
  }
});
```

## Performance Monitoring

### Using Performance Monitor

```typescript
import { PerformanceMonitor } from '@astralismotion/telemetry-service';

const monitor = new PerformanceMonitor();

// Manual measurement
monitor.start('heavy-computation');
await performHeavyComputation();
const mark = monitor.end('heavy-computation');
console.log(`Duration: ${mark?.duration}ms`);

// Measure function
const result = await monitor.measureAsync('fetch-data', async () => {
  return await fetch('/api/data');
});

// Get statistics
const stats = monitor.getStats('fetch-data');
console.log(`Average: ${stats.average}ms, P95: ${stats.p95}ms`);

// Monitor frame rate
const stopMonitoring = monitor.monitorFrameRate((fps) => {
  console.log(`Current FPS: ${fps}`);
}, 1000);

// Stop monitoring
stopMonitoring();
```

### Performance Decorator

```typescript
import { Measure } from '@astralismotion/telemetry-service';

class DataService {
  @Measure('DataService.fetchUsers')
  async fetchUsers() {
    return await fetch('/api/users').then(r => r.json());
  }

  @Measure()  // Uses class.method name
  async processData(data: any[]) {
    // Processing logic
  }
}
```

## Configuration

### Privacy Settings

```typescript
const telemetry = createTelemetryService({
  privacy: {
    anonymizeIPs: true,
    respectDoNotTrack: true,
    cookieConsent: true,
    dataMinimization: true,
    excludeFields: [
      'metadata.email',
      'metadata.phoneNumber',
      'metadata.address',
    ],
  },
});
```

### Retention Policies

```typescript
const telemetry = createTelemetryService({
  retention: {
    rawEvents: 7,           // Keep raw events for 7 days
    aggregatedHourly: 30,   // Keep hourly aggregates for 30 days
    aggregatedDaily: 90,    // Keep daily aggregates for 90 days
    aggregatedWeekly: 180,  // Keep weekly aggregates for 180 days
    aggregatedMonthly: 365, // Keep monthly aggregates for 1 year
  },
});
```

### Storage Configuration

```typescript
// In-memory storage (development)
const telemetry = createTelemetryService({
  storage: {
    type: 'memory',
  },
});

// Time-series storage (production)
const telemetry = createTelemetryService({
  storage: {
    type: 'timeseries',
  },
});
```

## Event Types

The service tracks the following event types:

- `component_load` - Component loaded into memory
- `component_ready` - Component initialized and ready
- `animation_play` - Animation started
- `animation_pause` - Animation paused
- `animation_stop` - Animation stopped
- `animation_complete` - Animation completed
- `animation_loop` - Animation looped
- `state_change` - State machine state changed
- `input_change` - State machine input changed
- `event_trigger` - State machine event triggered
- `user_interaction` - User interacted with component
- `error` - Error occurred
- `warning` - Warning issued
- `performance` - Performance metrics recorded
- `resource_load` - Resource loaded
- `session_start` - Session started
- `session_end` - Session ended

## API Reference

### TelemetryService

```typescript
interface TelemetryService {
  collector: TelemetryCollector;
  tracker: EventTracker;
  metrics: MetricsCollector;
  analytics: AnalyticsEngine;
  storage: StorageAdapter;
  instrumentation: AutoInstrumentation;
  performance: PerformanceMonitor;
  shutdown: () => Promise<void>;
}
```

### TelemetryCollector

- `track(type, data)` - Track an event
- `trackBatch(events)` - Track multiple events
- `flush()` - Flush queued events to storage
- `getSessionId()` - Get current session ID
- `startSession(userId?, metadata?)` - Start new session
- `endSession()` - End current session
- `updateConfig(config)` - Update configuration
- `shutdown()` - Shutdown and flush

### EventTracker

- `trackComponentLoad(data)` - Track component load
- `trackComponentReady(data)` - Track component ready
- `trackAnimationPlay(data)` - Track animation play
- `trackAnimationPause(data)` - Track animation pause
- `trackAnimationComplete(data)` - Track animation complete
- `trackStateChange(data)` - Track state change
- `trackInputChange(data)` - Track input change
- `trackUserInteraction(data)` - Track user interaction
- `trackPerformance(data)` - Track performance metrics
- `trackError(data)` - Track error
- `trackResourceLoad(data)` - Track resource load

### MetricsCollector

- `record(name, value, type?, tags?, unit?)` - Record metric
- `increment(name, value?, tags?)` - Increment counter
- `gauge(name, value, tags?, unit?)` - Set gauge value
- `histogram(name, value, tags?, unit?)` - Record histogram value
- `timing(name, durationMs, tags?)` - Record timing
- `aggregate(name, period, startTime?, endTime?)` - Aggregate metrics
- `calculateStats(name, startTime?, endTime?)` - Calculate statistics
- `getMetrics(name, startTime?, endTime?)` - Get raw metrics
- `clear()` - Clear all metrics

### AnalyticsEngine

- `analyzeFunnel(events, steps)` - Analyze conversion funnel
- `analyzeUserJourneys(events, conversionEvent?)` - Analyze user journeys
- `calculateRetention(events, cohortStartDate, period?)` - Calculate retention
- `analyzeFeatureAdoption(events, featureName, componentId)` - Analyze feature adoption
- `findDropOffPoints(journeys)` - Find drop-off points

## Best Practices

1. **Sampling**: Use sampling in production to reduce overhead
   ```typescript
   samplingRate: 0.1  // 10% of events
   ```

2. **Batching**: Configure appropriate batch sizes and flush intervals
   ```typescript
   batchSize: 100,
   flushInterval: 10000  // 10 seconds
   ```

3. **Privacy**: Enable privacy features for user data protection
   ```typescript
   privacy: {
     anonymizeIPs: true,
     respectDoNotTrack: true,
     dataMinimization: true,
   }
   ```

4. **Retention**: Set appropriate retention policies for your use case
   ```typescript
   retention: {
     rawEvents: 7,  // Days to keep raw events
     aggregatedDaily: 90,
   }
   ```

5. **Error Handling**: Always wrap telemetry calls in try-catch to prevent failures from affecting application logic

6. **Performance**: Use auto-instrumentation judiciously; manually track only critical events in performance-sensitive code

## License

MIT
