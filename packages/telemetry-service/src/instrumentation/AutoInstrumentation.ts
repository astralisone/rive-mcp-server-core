/**
 * Auto Instrumentation
 *
 * Automatically instruments Rive components with telemetry tracking.
 */

import { InstrumentationOptions } from '@astralismotion/types';
import { EventTracker } from '../core/EventTracker';

export class AutoInstrumentation {
  constructor(private tracker: EventTracker) {}

  /**
   * Instrument a Rive component instance
   */
  instrument(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    const cleanup: Array<() => void> = [];

    // Track lifecycle events
    if (options.autoTrack?.lifecycle !== false) {
      cleanup.push(this.trackLifecycle(riveInstance, options));
    }

    // Track animation events
    if (options.autoTrack?.animations !== false) {
      cleanup.push(this.trackAnimations(riveInstance, options));
    }

    // Track interactions
    if (options.autoTrack?.interactions !== false) {
      cleanup.push(this.trackInteractions(riveInstance, options));
    }

    // Track performance
    if (options.autoTrack?.performance !== false) {
      cleanup.push(this.trackPerformance(riveInstance, options));
    }

    // Track errors
    if (options.autoTrack?.errors !== false) {
      cleanup.push(this.trackErrors(riveInstance, options));
    }

    // Return cleanup function
    return () => {
      cleanup.forEach((fn) => fn());
    };
  }

  /**
   * Track component lifecycle
   */
  private trackLifecycle(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    const startTime = Date.now();

    // Track load event
    const handleLoad = () => {
      this.tracker.trackComponentLoad({
        componentId: options.componentId,
        componentName: options.metadata?.componentName || options.componentId,
        loadTime: Date.now() - startTime,
        fileSize: riveInstance.contents?.byteLength,
        ...options.metadata,
      });
    };

    // Track ready event
    const handleReady = () => {
      this.tracker.trackComponentReady({
        componentId: options.componentId,
        componentName: options.metadata?.componentName || options.componentId,
        initTime: Date.now() - startTime,
      });
    };

    if (riveInstance.on) {
      riveInstance.on('load', handleLoad);
      riveInstance.on('loaderror', (error: Error) => {
        this.tracker.trackError({
          componentId: options.componentId,
          errorMessage: error.message,
          errorCode: 'LOAD_ERROR',
          stackTrace: error.stack,
        });
      });

      return () => {
        if (riveInstance.off) {
          riveInstance.off('load', handleLoad);
        }
      };
    }

    // If already loaded
    if (riveInstance.isLoaded) {
      handleLoad();
      handleReady();
    }

    return () => {};
  }

  /**
   * Track animation events
   */
  private trackAnimations(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    const handlers: Array<[string, Function]> = [];

    const addEventListener = (event: string, handler: Function) => {
      if (riveInstance.on) {
        riveInstance.on(event, handler as any);
        handlers.push([event, handler]);
      }
    };

    addEventListener('play', (event: any) => {
      this.tracker.trackAnimationPlay({
        componentId: options.componentId,
        animationName: event?.data,
        stateMachineName: riveInstance.stateMachineNames?.[0],
      });
    });

    addEventListener('pause', (event: any) => {
      this.tracker.trackAnimationPause({
        componentId: options.componentId,
        animationName: event?.data,
      });
    });

    addEventListener('stop', (event: any) => {
      this.tracker.trackAnimationComplete({
        componentId: options.componentId,
        animationName: event?.data,
      });
    });

    addEventListener('loop', (event: any) => {
      this.tracker.trackAnimationLoop({
        componentId: options.componentId,
        animationName: event?.data?.name,
        loopCount: event?.data?.loopCount,
      });
    });

    addEventListener('statechange', (event: any) => {
      this.tracker.trackStateChange({
        componentId: options.componentId,
        stateMachineName: event?.data?.stateMachineName,
        fromState: event?.data?.from,
        toState: event?.data?.to,
      });
    });

    return () => {
      if (riveInstance.off) {
        handlers.forEach(([event, handler]) => {
          riveInstance.off(event, handler);
        });
      }
    };
  }

  /**
   * Track user interactions
   */
  private trackInteractions(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    if (!riveInstance.canvas) {
      return () => {};
    }

    const canvas = riveInstance.canvas;
    const handlers: Array<[string, EventListener]> = [];

    const addEventListener = (
      event: string,
      handler: EventListener
    ) => {
      canvas.addEventListener(event, handler);
      handlers.push([event, handler]);
    };

    addEventListener('click', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      this.tracker.trackUserInteraction({
        componentId: options.componentId,
        interactionType: 'click',
        position: { x: mouseEvent.offsetX, y: mouseEvent.offsetY },
      });
    });

    addEventListener('mouseenter', () => {
      this.tracker.trackUserInteraction({
        componentId: options.componentId,
        interactionType: 'hover',
      });
    });

    addEventListener('touchstart', (e: Event) => {
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.touches[0];
      this.tracker.trackUserInteraction({
        componentId: options.componentId,
        interactionType: 'touch',
        position: { x: touch.clientX, y: touch.clientY },
      });
    });

    return () => {
      handlers.forEach(([event, handler]) => {
        canvas.removeEventListener(event, handler);
      });
    };
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    let frameCount = 0;
    let lastFrameTime = Date.now();
    let fpsSum = 0;
    const reportInterval = 5000; // Report every 5 seconds

    const measurePerformance = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTime;

      if (deltaTime > 0) {
        const currentFps = 1000 / deltaTime;
        fpsSum += currentFps;
        frameCount++;

        lastFrameTime = now;
      }
    };

    // Set up frame callback if available
    let animationFrameId: number;
    const frameLoop = () => {
      measurePerformance();
      animationFrameId = requestAnimationFrame(frameLoop);
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      animationFrameId = requestAnimationFrame(frameLoop);
    }

    // Report metrics periodically
    const intervalId = setInterval(() => {
      if (frameCount > 0) {
        const averageFps = fpsSum / frameCount;

        this.tracker.trackPerformance({
          componentId: options.componentId,
          metrics: {
            fps: averageFps,
            averageFps,
            frameTime: 1000 / averageFps,
          },
        });

        // Reset counters
        frameCount = 0;
        fpsSum = 0;
      }
    }, reportInterval);

    return () => {
      clearInterval(intervalId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }

  /**
   * Track errors
   */
  private trackErrors(
    riveInstance: any,
    options: InstrumentationOptions
  ): () => void {
    const errorHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
      let errorMessage: string;
      let stackTrace: string | undefined;

      if (event instanceof ErrorEvent) {
        errorMessage = event.message;
        stackTrace = event.error?.stack;
      } else {
        errorMessage = String(event.reason);
        stackTrace = event.reason?.stack;
      }

      this.tracker.trackError({
        componentId: options.componentId,
        errorMessage,
        stackTrace,
        context: {
          type: event.type,
          ...options.metadata,
        },
      });
    };

    // Listen for Rive-specific errors
    if (riveInstance.on) {
      riveInstance.on('error', (error: Error) => {
        this.tracker.trackError({
          componentId: options.componentId,
          errorMessage: error.message,
          stackTrace: error.stack,
          errorCode: 'RIVE_ERROR',
        });
      });

      riveInstance.on('loaderror', (error: Error) => {
        this.tracker.trackError({
          componentId: options.componentId,
          errorMessage: error.message,
          stackTrace: error.stack,
          errorCode: 'LOAD_ERROR',
        });
      });
    }

    // Capture global errors (if in browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', errorHandler);
      window.addEventListener('unhandledrejection', errorHandler);

      return () => {
        window.removeEventListener('error', errorHandler);
        window.removeEventListener('unhandledrejection', errorHandler);
      };
    }

    return () => {};
  }
}
