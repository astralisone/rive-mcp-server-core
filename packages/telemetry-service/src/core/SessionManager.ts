/**
 * Session Manager
 *
 * Manages user sessions and tracks session lifecycle.
 */

import { SessionEvent, SessionMetrics } from '@astralismotion/types';

export interface Session {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  lastActivity: number;
  metadata?: Record<string, any>;
  eventCount: number;
  errorCount: number;
  componentsUsed: Set<string>;
  interactionCount: number;
}

export class SessionManager {
  private currentSession?: Session;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private activityCheckInterval?: NodeJS.Timeout;
  private sessionCounter: number = 0;

  constructor(sessionTimeout?: number) {
    if (sessionTimeout) {
      this.sessionTimeout = sessionTimeout;
    }
  }

  /**
   * Start a new session
   */
  startSession(userId?: string, metadata?: Record<string, any>): string {
    // End existing session if any
    if (this.currentSession) {
      this.endSession();
    }

    const sessionId = this.generateSessionId();
    this.currentSession = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      metadata: {
        ...metadata,
        userAgent: this.getUserAgent(),
        platform: this.getPlatform(),
        viewport: this.getViewport(),
      },
      eventCount: 0,
      errorCount: 0,
      componentsUsed: new Set(),
      interactionCount: 0,
    };

    this.startActivityCheck();
    return sessionId;
  }

  /**
   * End current session
   */
  endSession(): SessionMetrics | null {
    if (!this.currentSession) {
      return null;
    }

    this.stopActivityCheck();

    const metrics: SessionMetrics = {
      sessionId: this.currentSession.id,
      startTime: this.currentSession.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.currentSession.startTime,
      eventCount: this.currentSession.eventCount,
      errorCount: this.currentSession.errorCount,
      componentsUsed: Array.from(this.currentSession.componentsUsed),
      interactionCount: this.currentSession.interactionCount,
    };

    this.currentSession = undefined;
    return metrics;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    if (!this.currentSession) {
      return this.startSession();
    }

    this.updateActivity();
    return this.currentSession.id;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | undefined {
    return this.currentSession;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
    }
  }

  /**
   * Track event in session
   */
  trackEvent(componentId?: string, isError: boolean = false): void {
    if (this.currentSession) {
      this.currentSession.eventCount++;
      if (isError) {
        this.currentSession.errorCount++;
      }
      if (componentId) {
        this.currentSession.componentsUsed.add(componentId);
      }
      this.updateActivity();
    }
  }

  /**
   * Track interaction in session
   */
  trackInteraction(componentId?: string): void {
    if (this.currentSession) {
      this.currentSession.interactionCount++;
      if (componentId) {
        this.currentSession.componentsUsed.add(componentId);
      }
      this.updateActivity();
    }
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    if (!this.currentSession) {
      return false;
    }

    const timeSinceActivity = Date.now() - this.currentSession.lastActivity;
    return timeSinceActivity < this.sessionTimeout;
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }
    return Date.now() - this.currentSession.startTime;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): SessionMetrics | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.id,
      startTime: this.currentSession.startTime,
      duration: this.getSessionDuration(),
      eventCount: this.currentSession.eventCount,
      errorCount: this.currentSession.errorCount,
      componentsUsed: Array.from(this.currentSession.componentsUsed),
      interactionCount: this.currentSession.interactionCount,
    };
  }

  /**
   * Set session timeout
   */
  setSessionTimeout(timeout: number): void {
    this.sessionTimeout = timeout;
  }

  // Private methods

  private generateSessionId(): string {
    const timestamp = Date.now();
    const counter = this.sessionCounter++;
    const random = Math.random().toString(36).substring(2, 15);
    return `ses_${timestamp}_${counter}_${random}`;
  }

  private startActivityCheck(): void {
    this.stopActivityCheck();
    this.activityCheckInterval = setInterval(() => {
      if (!this.isSessionActive()) {
        this.endSession();
      }
    }, 60000); // Check every minute
  }

  private stopActivityCheck(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = undefined;
    }
  }

  private getUserAgent(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return undefined;
  }

  private getPlatform(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.platform;
    }
    return undefined;
  }

  private getViewport(): { width: number; height: number } | undefined {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return undefined;
  }
}
