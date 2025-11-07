/**
 * Rive Component Manifest Type Definitions
 */

export interface RiveComponentManifest {
  id: string;
  name: string;
  description?: string;
  version: string;
  libraryId: string;

  // Asset references
  riveFile: string;
  thumbnailUrl?: string;
  previewUrl?: string;

  // Metadata
  tags?: string[];
  category?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;

  // Runtime information
  stateMachines: StateMachineDefinition[];
  artboards?: string[];
  dataBindings?: DataBindingDefinition[];

  // Integration hints
  recommendedFrameworks?: string[];
  runtimeVersion?: string;

  // Storage metadata
  storageBackend?: 'local' | 's3' | 'remote';
  storagePath?: string;
}

export interface StateMachineDefinition {
  name: string;
  inputs: StateMachineInput[];
  events?: StateMachineEvent[];
  description?: string;
}

export interface StateMachineInput {
  name: string;
  type: 'bool' | 'number' | 'trigger' | 'string';
  defaultValue?: boolean | number | string;
  description?: string;
  min?: number;
  max?: number;
}

export interface StateMachineEvent {
  name: string;
  description?: string;
  eventType?: string;
}

export interface DataBindingDefinition {
  name: string;
  type: 'array' | 'object' | 'image' | 'text';
  itemSchema?: Record<string, string>;
  description?: string;
  required?: boolean;
}

export interface RiveLibraryManifest {
  id: string;
  name: string;
  description?: string;
  version: string;

  // Components in this library
  components: string[]; // Component IDs

  // Metadata
  tags?: string[];
  author?: string;
  license?: string;
  createdAt: string;
  updatedAt: string;

  // Storage metadata
  storageBackend?: 'local' | 's3' | 'remote';
  storagePath?: string;
}

export interface ManifestIndex {
  libraries: Record<string, RiveLibraryManifest>;
  components: Record<string, RiveComponentManifest>;
  version: string;
  lastUpdated: string;
}
