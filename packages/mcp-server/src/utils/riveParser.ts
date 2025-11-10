/**
 * Rive file parsing and runtime inspection utilities
 * Uses @rive-app/canvas-advanced runtime for deep inspection with jsdom
 *
 * This implementation uses jsdom to provide a proper DOM environment for the Rive runtime.
 * The @rive-app/canvas-advanced package requires Web APIs that are mocked via jsdom.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { Canvas } from 'canvas';
import fetch from 'node-fetch';
import RiveCanvas from '@rive-app/canvas-advanced';
import type { RiveCanvas as RiveCanvasType, File, Artboard, StateMachineInstance, SMIInput } from '@rive-app/canvas-advanced';
import {
  RiveRuntimeSurface,
  RiveArtboard,
  RiveStateMachine,
  RiveStateMachineInput,
  RiveStateMachineEvent,
} from '../types';

// Singleton for Rive runtime
let riveRuntime: RiveCanvasType | null = null;
let runtimeInitializationAttempted = false;
let runtimeInitializationError: Error | null = null;
let jsdomInstance: JSDOM | null = null;

/**
 * Setup DOM environment using jsdom
 */
function setupDOMEnvironment(): void {
  if (jsdomInstance) {
    return; // Already setup
  }

  // Create a jsdom instance
  jsdomInstance = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
  });

  const { window } = jsdomInstance;

  // Set up global references
  (global as any).window = window;
  (global as any).document = window.document;
  (global as any).HTMLCanvasElement = window.HTMLCanvasElement;
  (global as any).XMLHttpRequest = window.XMLHttpRequest;

  // Create a custom fetch that handles file system paths for WASM loading
  (global as any).fetch = async (url: string | URL, options?: any) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    // Handle file:// URLs and direct filesystem paths for WASM loading
    if (urlString.startsWith('file://') || (urlString.includes('.wasm') && !urlString.startsWith('http'))) {
      const filePath = urlString.replace('file://', '');
      try {
        const fileBuffer = fsSync.readFileSync(filePath);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
          blob: async () => new Blob([fileBuffer]),
          json: async () => JSON.parse(fileBuffer.toString()),
          text: async () => fileBuffer.toString(),
          headers: new Headers({ 'content-type': 'application/wasm' }),
        };
      } catch (error) {
        console.error(`Failed to load WASM file: ${filePath}`, error);
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob([]),
          json: async () => ({}),
          text: async () => '',
          headers: new Headers(),
        };
      }
    }

    // Fallback to node-fetch for http/https URLs
    return fetch(url, options);
  };

  // Setup navigator carefully - it may be read-only
  try {
    (global as any).navigator = window.navigator;
  } catch (err) {
    // If navigator is read-only, define it with defineProperty
    Object.defineProperty(global, 'navigator', {
      value: window.navigator,
      writable: true,
      configurable: true,
    });
  }

  // Polyfill for File API if needed
  if (!global.File) {
    (global as any).File = class File {
      constructor(public content: any, public name: string) {}
    };
  }

  // Setup canvas polyfill for 2D context
  const originalCreateElement = window.document.createElement.bind(window.document);
  window.document.createElement = function (tagName: string) {
    if (tagName.toLowerCase() === 'canvas') {
      const canvas = new Canvas(800, 600) as any;
      // Add DOM-like properties
      canvas.style = {};
      canvas.addEventListener = () => {};
      canvas.removeEventListener = () => {};
      return canvas;
    }
    return originalCreateElement(tagName);
  } as any;
}

/**
 * Initialize and get the Rive runtime
 * Returns null if initialization fails
 */
async function getRiveRuntime(): Promise<RiveCanvasType | null> {
  if (runtimeInitializationError) {
    return null;
  }

  if (!riveRuntime && !runtimeInitializationAttempted) {
    runtimeInitializationAttempted = true;

    try {
      // Setup DOM environment first
      setupDOMEnvironment();

      // Find the WASM file path
      const wasmPath = require.resolve('@rive-app/canvas-advanced/rive.wasm');

      riveRuntime = await RiveCanvas({
        locateFile: (file: string) => {
          // Return the full filesystem path to the WASM file
          if (file === 'rive.wasm' || file.endsWith('.wasm')) {
            return wasmPath;
          }
          return file;
        },
      });

      console.log('Rive runtime initialized successfully');
    } catch (error) {
      runtimeInitializationError = error instanceof Error ? error : new Error('Unknown error initializing Rive runtime');
      console.error('Rive runtime initialization failed:', runtimeInitializationError.message);
      return null;
    }
  }

  return riveRuntime;
}

/**
 * Parse a Rive file and extract runtime surface information
 * This requires the Rive runtime to properly inspect the file
 * Enhanced with better error messages and validation
 */
export async function parseRiveFile(filePath: string): Promise<RiveRuntimeSurface> {
  try {
    // Validate file path
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (accessError) {
      throw new Error(`File not found or not accessible: ${filePath}`);
    }

    // Read the .riv file
    const fileBuffer = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);

    // Validate file size
    if (fileStats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }

    // Validate file extension
    if (!filePath.endsWith('.riv')) {
      console.warn(`File does not have .riv extension: ${filePath}`);
    }

    // Use the actual Rive runtime to parse the file
    const runtimeSurface = await inspectRiveRuntime(fileBuffer, filePath);

    return {
      ...runtimeSurface,
      metadata: {
        fileSize: fileStats.size,
        parseDate: new Date().toISOString(),
        runtimeVersion: getRiveRuntimeVersion(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse Rive file at ${filePath}: ${errorMessage}`);
  }
}

/**
 * Inspect Rive file using runtime
 * Uses @rive-app/canvas-advanced to extract actual runtime surface information
 */
async function inspectRiveRuntime(
  fileBuffer: Buffer,
  filePath: string
): Promise<Omit<RiveRuntimeSurface, 'metadata'>> {
  const rive = await getRiveRuntime();
  const componentId = path.basename(filePath, '.riv');

  // Load the Rive file - convert Buffer to Uint8Array
  const riveFile = await rive.load(new Uint8Array(fileBuffer));

  try {
    // Extract artboards
    const artboards = await extractArtboards(riveFile);

    // Extract state machines and events from all artboards
    const { stateMachines, events } = await extractStateMachinesAndEvents(riveFile, artboards);

    return {
      componentId,
      artboards,
      stateMachines,
      events,
      dataBindings: [],
    };
  } finally {
    // Clean up the file reference
    if (riveFile && typeof riveFile.unref === 'function') {
      riveFile.unref();
    }
  }
}

/**
 * Extract artboards from Rive file
 * Uses the Rive runtime to get actual artboard information
 */
async function extractArtboards(riveFile: File): Promise<RiveArtboard[]> {
  const artboards: RiveArtboard[] = [];
  const artboardCount = riveFile.artboardCount();

  for (let i = 0; i < artboardCount; i++) {
    const artboard = riveFile.artboardByIndex(i);

    try {
      const bounds = artboard.bounds;

      artboards.push({
        name: artboard.name,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      });
    } finally {
      // Clean up artboard instance
      if (artboard && typeof artboard.delete === 'function') {
        artboard.delete();
      }
    }
  }

  return artboards;
}

/**
 * Extract state machines, their inputs, and events from Rive file
 * Uses the Rive runtime to inspect all artboards and their state machines
 * Enhanced to capture input counts, event names, and better metadata
 */
async function extractStateMachinesAndEvents(
  riveFile: File,
  artboards: RiveArtboard[]
): Promise<{
  stateMachines: RiveStateMachine[];
  events: RiveStateMachineEvent[];
}> {
  const stateMachines: RiveStateMachine[] = [];
  const eventsSet = new Set<string>();
  const events: RiveStateMachineEvent[] = [];

  const rive = await getRiveRuntime();

  if (!rive) {
    throw new Error('Rive runtime not initialized. Cannot extract state machines.');
  }

  // Iterate through all artboards to collect state machines
  for (let artboardIndex = 0; artboardIndex < artboards.length; artboardIndex++) {
    const artboard = riveFile.artboardByIndex(artboardIndex);

    try {
      const stateMachineCount = artboard.stateMachineCount();

      // Log state machine discovery for debugging
      if (stateMachineCount === 0) {
        console.warn(`Artboard '${artboards[artboardIndex].name}' has no state machines`);
      }

      for (let smIndex = 0; smIndex < stateMachineCount; smIndex++) {
        const stateMachine = artboard.stateMachineByIndex(smIndex);
        const stateMachineInstance = new rive.StateMachineInstance(stateMachine, artboard);

        try {
          // Extract inputs from the state machine instance
          const inputs: RiveStateMachineInput[] = [];
          const inputCount = stateMachineInstance.inputCount();
          const eventNamesForThisSM: string[] = [];

          for (let inputIndex = 0; inputIndex < inputCount; inputIndex++) {
            const input = stateMachineInstance.input(inputIndex);

            // Map input type from Rive constants to our type strings
            let inputType: 'bool' | 'number' | 'trigger';
            if (input.type === rive.SMIInput.bool) {
              inputType = 'bool';
            } else if (input.type === rive.SMIInput.number) {
              inputType = 'number';
            } else if (input.type === rive.SMIInput.trigger) {
              inputType = 'trigger';
            } else {
              // Default to trigger for unknown types
              console.warn(`Unknown input type for '${input.name}' in state machine '${stateMachine.name}', defaulting to trigger`);
              inputType = 'trigger';
            }

            inputs.push({
              name: input.name,
              type: inputType,
              defaultValue: input.value,
            });
          }

          // Extract events by advancing the state machine briefly
          // This is a heuristic approach - we advance the state machine to see if any events are reported
          stateMachineInstance.advance(0.016); // Advance by one frame (~16ms)
          const reportedEventCount = stateMachineInstance.reportedEventCount();

          for (let eventIndex = 0; eventIndex < reportedEventCount; eventIndex++) {
            const event = stateMachineInstance.reportedEventAt(eventIndex);
            if (event && event.name) {
              eventNamesForThisSM.push(event.name);
              if (!eventsSet.has(event.name)) {
                eventsSet.add(event.name);
                events.push({
                  name: event.name,
                  properties: event.properties || {},
                });
              }
            }
          }

          // Get layer count from state machine if available
          // Note: layerCount is not directly exposed in the Rive runtime API
          // We default to 1 as a reasonable estimate
          const layerCount = 1;

          // Add state machine info with enhanced metadata
          stateMachines.push({
            name: stateMachine.name,
            inputs,
            layerCount,
            inputCount, // Add explicit input count
            eventNames: eventNamesForThisSM.length > 0 ? eventNamesForThisSM : undefined, // Add event names associated with this SM
          });

          console.log(`Extracted state machine '${stateMachine.name}' with ${inputCount} inputs and ${eventNamesForThisSM.length} events`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error extracting state machine '${stateMachine.name}' from artboard '${artboards[artboardIndex].name}': ${errorMessage}`);
          throw new Error(`Failed to extract state machine '${stateMachine.name}': ${errorMessage}`);
        } finally {
          // Clean up state machine instance
          if (stateMachineInstance && typeof stateMachineInstance.delete === 'function') {
            stateMachineInstance.delete();
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing artboard '${artboards[artboardIndex].name}': ${errorMessage}`);
      throw new Error(`Failed to process artboard '${artboards[artboardIndex].name}': ${errorMessage}`);
    } finally {
      // Clean up artboard instance
      if (artboard && typeof artboard.delete === 'function') {
        artboard.delete();
      }
    }
  }

  if (stateMachines.length === 0) {
    console.warn('No state machines found in any artboard. This may indicate an empty or invalid Rive file.');
  }

  return { stateMachines, events };
}

/**
 * Get Rive runtime version
 */
function getRiveRuntimeVersion(): string {
  try {
    // Get the version from package.json
    const packageJson = require('@rive-app/canvas-advanced/package.json');
    return packageJson.version || '2.0.0';
  } catch (error) {
    // Fallback if we can't read the package.json
    return '2.0.0';
  }
}

/**
 * Validate a Rive file
 */
export async function validateRiveFile(filePath: string): Promise<boolean> {
  try {
    const fileBuffer = await fs.readFile(filePath);

    // Check if it's a valid Rive file by checking magic bytes
    // Rive files start with specific bytes
    if (fileBuffer.length < 4) {
      return false;
    }

    // Basic validation - in production, use actual Rive runtime validation
    const header = fileBuffer.toString('utf-8', 0, 4);
    return header === 'RIVE' || fileBuffer[0] === 0x52; // 'R' in ASCII
  } catch (error) {
    return false;
  }
}

/**
 * Extract metadata from Rive file without full parsing
 */
export async function extractRiveMetadata(filePath: string): Promise<{
  fileName: string;
  fileSize: number;
  isValid: boolean;
  lastModified: Date;
}> {
  const stats = await fs.stat(filePath);
  const isValid = await validateRiveFile(filePath);

  return {
    fileName: path.basename(filePath),
    fileSize: stats.size,
    isValid,
    lastModified: stats.mtime,
  };
}
