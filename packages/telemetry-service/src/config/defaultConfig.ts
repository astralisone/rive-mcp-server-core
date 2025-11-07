/**
 * Default Telemetry Configuration
 *
 * Default settings for the telemetry service.
 */

import { TelemetryConfig } from '@astralismotion/types';

export const defaultConfig: TelemetryConfig = {
  enabled: true,
  samplingRate: 1.0, // 100% sampling by default
  batchSize: 100,
  flushInterval: 10000, // 10 seconds
  maxQueueSize: 10000,
  privacy: {
    anonymizeIPs: true,
    respectDoNotTrack: true,
    cookieConsent: false,
    dataMinimization: true,
    excludeFields: [
      'metadata.password',
      'metadata.token',
      'metadata.apiKey',
      'metadata.secret',
    ],
  },
  storage: {
    type: 'memory',
  },
  retention: {
    rawEvents: 7, // 7 days
    aggregatedHourly: 30, // 30 days
    aggregatedDaily: 90, // 90 days
    aggregatedWeekly: 180, // 180 days
    aggregatedMonthly: 365, // 1 year
  },
};

export const developmentConfig: TelemetryConfig = {
  ...defaultConfig,
  enabled: true,
  samplingRate: 1.0,
  flushInterval: 5000, // More frequent flushing in dev
  storage: {
    type: 'memory',
  },
};

export const productionConfig: TelemetryConfig = {
  ...defaultConfig,
  enabled: true,
  samplingRate: 0.1, // 10% sampling in production
  batchSize: 500,
  flushInterval: 30000, // 30 seconds
  maxQueueSize: 50000,
  storage: {
    type: 'timeseries',
  },
  retention: {
    rawEvents: 30,
    aggregatedHourly: 90,
    aggregatedDaily: 180,
    aggregatedWeekly: 365,
    aggregatedMonthly: 730, // 2 years
  },
};

export const testConfig: TelemetryConfig = {
  ...defaultConfig,
  enabled: true,
  samplingRate: 1.0,
  flushInterval: 1000,
  maxQueueSize: 1000,
  storage: {
    type: 'memory',
  },
  retention: {
    rawEvents: 1,
    aggregatedHourly: 1,
    aggregatedDaily: 1,
    aggregatedWeekly: 1,
    aggregatedMonthly: 1,
  },
};
