export interface RuntimeSurface {
  componentId: string;
  stateMachines: {
    name: string;
    inputs: { name: string; type: "bool" | "number" | "string"; defaultValue?: any }[];
    events?: { name: string; description?: string }[];
  }[];
  dataBindings?: {
    name: string;
    type: "array" | "object" | "image" | "text";
    itemSchema?: Record<string, string>;
  }[];
  recommendedFrameworks?: string[];
  runtimeVersion?: string;
}

// Export all type definitions
export * from './manifest';
export * from './config';
export * from './storage';
export * from './telemetry';
