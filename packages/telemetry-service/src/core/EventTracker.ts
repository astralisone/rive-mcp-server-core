/**
 * Event Tracker
 *
 * High-level API for tracking specific types of telemetry events.
 */

import {
  ComponentLifecycleEvent,
  AnimationEvent,
  StateMachineEvent,
  UserInteractionEvent,
  PerformanceEvent,
  ErrorEvent,
  ResourceLoadEvent,
  PerformanceMetrics,
} from '@astralismotion/types';
import { TelemetryCollector } from './TelemetryCollector';

export class EventTracker {
  constructor(private collector: TelemetryCollector) {}

  /**
   * Track component lifecycle events
   */
  trackComponentLoad(data: {
    componentId: string;
    componentName: string;
    fileSize?: number;
    loadTime?: number;
    framework?: string;
    version?: string;
  }): string | null {
    return this.collector.track('component_load', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  trackComponentReady(data: {
    componentId: string;
    componentName: string;
    initTime?: number;
  }): string | null {
    return this.collector.track('component_ready', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  /**
   * Track animation events
   */
  trackAnimationPlay(data: {
    componentId: string;
    animationName?: string;
    stateMachineName?: string;
  }): string | null {
    return this.collector.track('animation_play', {
      componentId: data.componentId,
      severity: 'debug',
      metadata: data,
    });
  }

  trackAnimationPause(data: {
    componentId: string;
    animationName?: string;
    currentTime?: number;
  }): string | null {
    return this.collector.track('animation_pause', {
      componentId: data.componentId,
      severity: 'debug',
      metadata: data,
    });
  }

  trackAnimationComplete(data: {
    componentId: string;
    animationName?: string;
    duration?: number;
  }): string | null {
    return this.collector.track('animation_complete', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  trackAnimationLoop(data: {
    componentId: string;
    animationName?: string;
    loopCount?: number;
  }): string | null {
    return this.collector.track('animation_loop', {
      componentId: data.componentId,
      severity: 'debug',
      metadata: data,
    });
  }

  /**
   * Track state machine events
   */
  trackStateChange(data: {
    componentId: string;
    stateMachineName: string;
    fromState?: string;
    toState?: string;
  }): string | null {
    return this.collector.track('state_change', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  trackInputChange(data: {
    componentId: string;
    stateMachineName: string;
    inputName: string;
    inputValue: any;
  }): string | null {
    return this.collector.track('input_change', {
      componentId: data.componentId,
      severity: 'debug',
      metadata: data,
    });
  }

  trackEventTrigger(data: {
    componentId: string;
    stateMachineName: string;
    eventName: string;
  }): string | null {
    return this.collector.track('event_trigger', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(data: {
    componentId: string;
    interactionType: 'click' | 'hover' | 'drag' | 'input' | 'scroll' | 'touch';
    target?: string;
    position?: { x: number; y: number };
    value?: any;
  }): string | null {
    return this.collector.track('user_interaction', {
      componentId: data.componentId,
      severity: 'info',
      metadata: data,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(data: {
    componentId: string;
    metrics: PerformanceMetrics;
  }): string | null {
    return this.collector.track('performance', {
      componentId: data.componentId,
      severity: 'info',
      metadata: {
        ...data.metrics,
      },
    });
  }

  /**
   * Track errors and warnings
   */
  trackError(data: {
    componentId?: string;
    errorCode?: string;
    errorMessage: string;
    stackTrace?: string;
    context?: Record<string, any>;
  }): string | null {
    return this.collector.track('error', {
      componentId: data.componentId,
      severity: 'error',
      metadata: data,
    });
  }

  trackWarning(data: {
    componentId?: string;
    warningMessage: string;
    context?: Record<string, any>;
  }): string | null {
    return this.collector.track('warning', {
      componentId: data.componentId,
      severity: 'warning',
      metadata: {
        errorMessage: data.warningMessage,
        ...data.context,
      },
    });
  }

  /**
   * Track resource loading
   */
  trackResourceLoad(data: {
    resourceType: 'rive_file' | 'image' | 'font' | 'audio';
    resourceUrl: string;
    resourceSize: number;
    loadTime: number;
    cached: boolean;
    success: boolean;
  }): string | null {
    return this.collector.track('resource_load', {
      severity: data.success ? 'info' : 'error',
      metadata: data,
    });
  }

  /**
   * Track custom events
   */
  trackCustomEvent(data: {
    componentId?: string;
    eventName: string;
    eventData?: Record<string, any>;
  }): string | null {
    return this.collector.track('user_interaction', {
      componentId: data.componentId,
      severity: 'info',
      metadata: {
        customEvent: true,
        eventName: data.eventName,
        ...data.eventData,
      },
    });
  }

  /**
   * Start performance measurement
   */
  startPerformanceMeasure(measureId: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${measureId}-start`);
    }
  }

  /**
   * End performance measurement and track
   */
  endPerformanceMeasure(
    measureId: string,
    componentId: string,
    metadata?: Record<string, any>
  ): string | null {
    if (typeof performance !== 'undefined') {
      try {
        performance.mark(`${measureId}-end`);
        performance.measure(
          measureId,
          `${measureId}-start`,
          `${measureId}-end`
        );

        const measure = performance.getEntriesByName(measureId)[0];
        if (measure) {
          return this.collector.track('performance', {
            componentId,
            severity: 'info',
            metadata: {
              measureId,
              duration: measure.duration,
              ...metadata,
            },
          });
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
    return null;
  }
}
