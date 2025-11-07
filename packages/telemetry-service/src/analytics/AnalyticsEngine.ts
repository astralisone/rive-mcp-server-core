/**
 * Analytics Engine
 *
 * Provides high-level analytics capabilities including funnels,
 * retention, cohort analysis, and feature adoption tracking.
 */

import {
  TelemetryEvent,
  ConversionFunnel,
  FunnelStep,
  UserJourney,
  RetentionMetrics,
  FeatureAdoptionMetrics,
  AggregationPeriod,
  TelemetryEventType,
} from '@astralismotion/types';

export class AnalyticsEngine {
  /**
   * Analyze conversion funnel
   */
  analyzeFunnel(
    events: TelemetryEvent[],
    funnelSteps: Array<{
      name: string;
      eventType: TelemetryEventType;
      filter?: (event: TelemetryEvent) => boolean;
    }>
  ): ConversionFunnel {
    const sessionMap = new Map<string, TelemetryEvent[]>();

    // Group events by session
    events.forEach((event) => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    });

    // Sort events in each session by timestamp
    sessionMap.forEach((sessionEvents) => {
      sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
    });

    const steps: FunnelStep[] = [];
    let previousCompleted = sessionMap.size;

    funnelSteps.forEach((stepDef, index) => {
      let entered = 0;
      let completed = 0;
      const stepTimes: number[] = [];

      sessionMap.forEach((sessionEvents) => {
        // Check if user reached this step
        const stepEvent = sessionEvents.find(
          (e) =>
            e.type === stepDef.eventType &&
            (!stepDef.filter || stepDef.filter(e))
        );

        if (stepEvent) {
          entered++;

          // Check if user completed to next step
          if (index < funnelSteps.length - 1) {
            const nextStepDef = funnelSteps[index + 1];
            const nextStepEvent = sessionEvents.find(
              (e) =>
                e.type === nextStepDef.eventType &&
                e.timestamp > stepEvent.timestamp &&
                (!nextStepDef.filter || nextStepDef.filter(e))
            );

            if (nextStepEvent) {
              completed++;
              stepTimes.push(nextStepEvent.timestamp - stepEvent.timestamp);
            }
          } else {
            // Last step, mark as completed
            completed++;
          }
        }
      });

      const averageTime =
        stepTimes.length > 0
          ? stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length
          : 0;

      const dropoffRate = entered > 0 ? ((entered - completed) / entered) * 100 : 0;

      steps.push({
        name: stepDef.name,
        eventType: stepDef.eventType,
        entered,
        completed,
        dropoffRate,
        averageTime,
      });

      previousCompleted = completed;
    });

    const totalEntered = steps[0]?.entered || 0;
    const totalCompleted = steps[steps.length - 1]?.completed || 0;
    const conversionRate =
      totalEntered > 0 ? (totalCompleted / totalEntered) * 100 : 0;

    const totalTime = steps.reduce((sum, step) => sum + step.averageTime, 0);

    return {
      name: 'Conversion Funnel',
      steps,
      totalEntered,
      totalCompleted,
      conversionRate,
      averageTime: totalTime,
    };
  }

  /**
   * Analyze user journeys
   */
  analyzeUserJourneys(
    events: TelemetryEvent[],
    conversionEvent?: TelemetryEventType
  ): UserJourney[] {
    const sessionMap = new Map<string, TelemetryEvent[]>();

    events.forEach((event) => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    });

    const journeys: UserJourney[] = [];

    sessionMap.forEach((sessionEvents, sessionId) => {
      sessionEvents.sort((a, b) => a.timestamp - b.timestamp);

      const componentsVisited = new Set<string>();
      let interactions = 0;
      let errors = 0;
      let conversionCompleted = false;

      sessionEvents.forEach((event) => {
        if (event.componentId) {
          componentsVisited.add(event.componentId);
        }

        if (event.type === 'user_interaction') {
          interactions++;
        }

        if (event.type === 'error') {
          errors++;
        }

        if (conversionEvent && event.type === conversionEvent) {
          conversionCompleted = true;
        }
      });

      journeys.push({
        sessionId,
        userId: sessionEvents[0].metadata?.userId,
        startTime: sessionEvents[0].timestamp,
        endTime: sessionEvents[sessionEvents.length - 1].timestamp,
        events: sessionEvents,
        componentsVisited: Array.from(componentsVisited),
        interactions,
        errors,
        conversionCompleted,
      });
    });

    return journeys;
  }

  /**
   * Calculate retention metrics
   */
  calculateRetention(
    events: TelemetryEvent[],
    cohortStartDate: number,
    period: AggregationPeriod = 'day'
  ): RetentionMetrics {
    const periodMs = this.getPeriodMilliseconds(period);
    const userSessions = new Map<string, Set<number>>();

    // Track which periods each user was active
    events.forEach((event) => {
      const userId = event.sessionId; // Or extract actual userId from metadata
      const periodIndex = Math.floor(
        (event.timestamp - cohortStartDate) / periodMs
      );

      if (periodIndex >= 0) {
        if (!userSessions.has(userId)) {
          userSessions.set(userId, new Set());
        }
        userSessions.get(userId)!.add(periodIndex);
      }
    });

    const totalUsers = userSessions.size;
    const breakdown: { day: number; users: number; rate: number }[] = [];

    // Calculate retention for each period
    for (let day = 0; day <= 30; day++) {
      const returningUsers = Array.from(userSessions.values()).filter((periods) =>
        periods.has(day)
      ).length;

      const rate = totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

      breakdown.push({
        day,
        users: returningUsers,
        rate,
      });
    }

    const returningUsers = breakdown[breakdown.length - 1].users;
    const retentionRate =
      totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

    return {
      period,
      cohortStartDate,
      totalUsers,
      returningUsers,
      retentionRate,
      breakdown,
    };
  }

  /**
   * Analyze feature adoption
   */
  analyzeFeatureAdoption(
    events: TelemetryEvent[],
    featureName: string,
    componentId: string
  ): FeatureAdoptionMetrics {
    const featureEvents = events.filter(
      (e) =>
        e.componentId === componentId &&
        (e.metadata?.featureName === featureName ||
          e.metadata?.componentName === featureName)
    );

    const uniqueUsers = new Set<string>();
    const userUsageCount = new Map<string, number>();
    let firstUsed = Infinity;
    let lastUsed = 0;

    featureEvents.forEach((event) => {
      const userId = event.sessionId;
      uniqueUsers.add(userId);

      userUsageCount.set(userId, (userUsageCount.get(userId) || 0) + 1);

      if (event.timestamp < firstUsed) {
        firstUsed = event.timestamp;
      }
      if (event.timestamp > lastUsed) {
        lastUsed = event.timestamp;
      }
    });

    const totalUsers = new Set(events.map((e) => e.sessionId)).size;
    const activeUsers = uniqueUsers.size;
    const adoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    const totalUsage = Array.from(userUsageCount.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const averageUsagePerUser = activeUsers > 0 ? totalUsage / activeUsers : 0;

    // Calculate trending (simplified - compare first half vs second half)
    const midpoint = firstUsed + (lastUsed - firstUsed) / 2;
    const firstHalfUsers = new Set(
      featureEvents.filter((e) => e.timestamp < midpoint).map((e) => e.sessionId)
    ).size;
    const secondHalfUsers = new Set(
      featureEvents.filter((e) => e.timestamp >= midpoint).map((e) => e.sessionId)
    ).size;

    let trending: 'up' | 'down' | 'stable' = 'stable';
    if (secondHalfUsers > firstHalfUsers * 1.1) {
      trending = 'up';
    } else if (secondHalfUsers < firstHalfUsers * 0.9) {
      trending = 'down';
    }

    return {
      featureName,
      componentId,
      totalUsers,
      activeUsers,
      adoptionRate,
      averageUsagePerUser,
      firstUsed: firstUsed === Infinity ? 0 : firstUsed,
      lastUsed,
      trending,
    };
  }

  /**
   * Find drop-off points in user journeys
   */
  findDropOffPoints(journeys: UserJourney[]): Array<{
    componentId: string;
    dropOffRate: number;
    totalSessions: number;
    droppedSessions: number;
  }> {
    const componentStats = new Map<
      string,
      { total: number; completed: number }
    >();

    journeys.forEach((journey) => {
      journey.componentsVisited.forEach((componentId, index) => {
        if (!componentStats.has(componentId)) {
          componentStats.set(componentId, { total: 0, completed: 0 });
        }

        const stats = componentStats.get(componentId)!;
        stats.total++;

        // Check if user continued to next component
        if (index < journey.componentsVisited.length - 1) {
          stats.completed++;
        } else if (journey.conversionCompleted) {
          stats.completed++;
        }
      });
    });

    const dropOffPoints = Array.from(componentStats.entries()).map(
      ([componentId, stats]) => ({
        componentId,
        dropOffRate: ((stats.total - stats.completed) / stats.total) * 100,
        totalSessions: stats.total,
        droppedSessions: stats.total - stats.completed,
      })
    );

    return dropOffPoints.sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  // Private helper methods

  private getPeriodMilliseconds(period: AggregationPeriod): number {
    const periods = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }
}
