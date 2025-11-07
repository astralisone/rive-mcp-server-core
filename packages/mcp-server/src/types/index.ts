/**
 * Type definitions for Rive MCP Server
 */

export interface RiveLibrary {
  id: string;
  name: string;
  version: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  components: RiveComponent[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RiveComponent {
  id: string;
  libraryId: string;
  name: string;
  description?: string;
  filePath: string;
  fileUrl?: string;
  artboardName?: string;
  stateMachineName?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RiveStateMachineInput {
  name: string;
  type: 'bool' | 'number' | 'trigger';
  defaultValue?: boolean | number;
}

export interface RiveStateMachineEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface RiveDataBinding {
  name: string;
  type: string;
  path: string;
}

export interface RiveArtboard {
  name: string;
  width: number;
  height: number;
}

export interface RiveStateMachine {
  name: string;
  inputs: RiveStateMachineInput[];
  layerCount: number;
}

export interface RiveRuntimeSurface {
  componentId: string;
  artboards: RiveArtboard[];
  stateMachines: RiveStateMachine[];
  events: RiveStateMachineEvent[];
  dataBindings?: RiveDataBinding[];
  metadata: {
    fileSize: number;
    parseDate: string;
    runtimeVersion?: string;
  };
}

export interface LibraryManifest {
  library: RiveLibrary;
  storagePath: string;
}

export interface ComponentManifest {
  component: RiveComponent;
  library: RiveLibrary;
  storagePath: string;
}

export interface GenerateWrapperParams {
  componentId: string;
  framework: 'react' | 'vue' | 'stencil' | 'angular' | 'svelte';
  options?: {
    typescript?: boolean;
    includeTypes?: boolean;
    styleApproach?: 'css' | 'styled-components' | 'emotion' | 'tailwind';
    exportFormat?: 'esm' | 'cjs' | 'umd';
  };
}

export interface ComposeSceneParams {
  name: string;
  description?: string;
  components: Array<{
    componentId: string;
    instanceName: string;
    position?: { x: number; y: number };
    scale?: number;
    zIndex?: number;
    interactions?: Array<{
      trigger: string;
      target: string;
      action: string;
      params?: Record<string, any>;
    }>;
  }>;
  orchestration?: {
    timeline?: Array<{
      time: number;
      component: string;
      action: string;
      params?: Record<string, any>;
    }>;
    rules?: Array<{
      condition: string;
      actions: Array<{
        component: string;
        action: string;
        params?: Record<string, any>;
      }>;
    }>;
  };
}

export interface MCPToolResponse<T = any> {
  status: 'success' | 'error' | 'not_implemented';
  tool: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
