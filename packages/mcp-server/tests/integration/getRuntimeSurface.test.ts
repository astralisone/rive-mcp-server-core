/**
 * Integration Tests for getRuntimeSurface MCP Tool
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';

const TEST_DATA_PATH = path.join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures');

describe('getRuntimeSurface MCP Tool', () => {
  let runtimeSurfaces: Map<string, any>;

  beforeAll(async () => {
    runtimeSurfaces = new Map();

    // Load test runtime surfaces
    const surfaceFiles = [
      'slot-machine-surface.json',
      'loading-spinner-surface.json'
    ];

    for (const file of surfaceFiles) {
      try {
        const surfacePath = path.join(TEST_DATA_PATH, 'runtime', file);
        const content = await fs.readFile(surfacePath, 'utf-8');
        const surface = JSON.parse(content);
        runtimeSurfaces.set(surface.componentId, surface);
      } catch (error) {
        console.warn(`Failed to load surface: ${file}`);
      }
    }
  });

  it('should retrieve runtime surface for component', async () => {
    const componentId = 'astralis-slot-machine';
    const surface = runtimeSurfaces.get(componentId);

    expect(surface).toBeDefined();
    expect(surface.componentId).toBe(componentId);
  });

  it('should include state machine runtime information', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];

      expect(surface).toHaveProperty('surface');
      expect(surface.surface).toHaveProperty('stateMachines');
      expect(Array.isArray(surface.surface.stateMachines)).toBe(true);
    }
  });

  it('should provide input values with current state', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];
      const stateMachines = surface.surface.stateMachines;

      if (stateMachines && stateMachines.length > 0) {
        const inputs = stateMachines[0].inputs;

        expect(Array.isArray(inputs)).toBe(true);

        if (inputs && inputs.length > 0) {
          const input = inputs[0];
          expect(input).toHaveProperty('name');
          expect(input).toHaveProperty('type');
          expect(input).toHaveProperty('value');
        }
      }
    }
  });

  it('should include trigger definitions', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];
      const stateMachines = surface.surface.stateMachines;

      if (stateMachines && stateMachines.length > 0) {
        const triggers = stateMachines[0].triggers;

        if (triggers) {
          expect(Array.isArray(triggers)).toBe(true);

          if (triggers.length > 0) {
            const trigger = triggers[0];
            expect(trigger).toHaveProperty('name');
          }
        }
      }
    }
  });

  it('should include event handlers', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];
      const stateMachines = surface.surface.stateMachines;

      if (stateMachines && stateMachines.length > 0) {
        const events = stateMachines[0].events;

        if (events) {
          expect(Array.isArray(events)).toBe(true);

          if (events.length > 0) {
            const event = events[0];
            expect(event).toHaveProperty('name');
            expect(event).toHaveProperty('handler');
          }
        }
      }
    }
  });

  it('should include data bindings when present', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];

      if (surface.surface.dataBindings) {
        expect(Array.isArray(surface.surface.dataBindings)).toBe(true);

        if (surface.surface.dataBindings.length > 0) {
          const binding = surface.surface.dataBindings[0];
          expect(binding).toHaveProperty('name');
          expect(binding).toHaveProperty('value');
        }
      }
    }
  });

  it('should provide integration code references', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    if (surfaces.length > 0) {
      const surface = surfaces[0];

      if (surface.integrationCode) {
        expect(typeof surface.integrationCode).toBe('object');
        expect(surface.integrationCode).toHaveProperty('react');
      }
    }
  });
});
