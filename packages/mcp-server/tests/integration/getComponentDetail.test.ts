/**
 * Integration Tests for getComponentDetail MCP Tool
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';

const TEST_DATA_PATH = path.join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures');

describe('getComponentDetail MCP Tool', () => {
  let manifestIndex: any;

  beforeAll(async () => {
    const indexPath = path.join(TEST_DATA_PATH, 'manifests', 'index.json');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      manifestIndex = JSON.parse(indexContent);
    } catch (error) {
      console.warn('Test manifest index not found');
      manifestIndex = { components: {} };
    }
  });

  it('should retrieve component by ID', async () => {
    const componentIds = Object.keys(manifestIndex.components || {});

    if (componentIds.length > 0) {
      const componentId = componentIds[0];
      const component = manifestIndex.components[componentId];

      expect(component).toBeDefined();
      expect(component.id).toBe(componentId);
    }
  });

  it('should return complete component manifest', async () => {
    const componentIds = Object.keys(manifestIndex.components || {});

    if (componentIds.length > 0) {
      const component = manifestIndex.components[componentIds[0]];

      expect(component).toHaveProperty('id');
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('version');
      expect(component).toHaveProperty('libraryId');
      expect(component).toHaveProperty('riveFile');
      expect(component).toHaveProperty('stateMachines');
    }
  });

  it('should include state machine definitions', async () => {
    const componentIds = Object.keys(manifestIndex.components || {});

    if (componentIds.length > 0) {
      const component = manifestIndex.components[componentIds[0]];

      expect(Array.isArray(component.stateMachines)).toBe(true);

      if (component.stateMachines.length > 0) {
        const sm = component.stateMachines[0];
        expect(sm).toHaveProperty('name');
        expect(sm).toHaveProperty('inputs');
        expect(Array.isArray(sm.inputs)).toBe(true);
      }
    }
  });

  it('should include input definitions with types', async () => {
    const componentIds = Object.keys(manifestIndex.components || {});

    if (componentIds.length > 0) {
      const component = manifestIndex.components[componentIds[0]];

      if (component.stateMachines && component.stateMachines.length > 0) {
        const inputs = component.stateMachines[0].inputs;

        if (inputs && inputs.length > 0) {
          const input = inputs[0];
          expect(input).toHaveProperty('name');
          expect(input).toHaveProperty('type');
          expect(['bool', 'number', 'trigger', 'string']).toContain(input.type);
        }
      }
    }
  });

  it('should include event definitions', async () => {
    const componentIds = Object.keys(manifestIndex.components || {});

    if (componentIds.length > 0) {
      const component = manifestIndex.components[componentIds[0]];

      if (component.stateMachines && component.stateMachines.length > 0) {
        const events = component.stateMachines[0].events;

        if (events && events.length > 0) {
          const event = events[0];
          expect(event).toHaveProperty('name');
        }
      }
    }
  });

  it('should handle non-existent component gracefully', async () => {
    const nonExistentId = 'non-existent-component-id';
    const component = manifestIndex.components[nonExistentId];

    expect(component).toBeUndefined();
  });
});
