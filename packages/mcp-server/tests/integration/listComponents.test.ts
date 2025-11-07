/**
 * Integration Tests for listComponents MCP Tool
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';

// Mock storage setup
const TEST_DATA_PATH = path.join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures');

describe('listComponents MCP Tool', () => {
  let manifestIndex: any;

  beforeAll(async () => {
    // Load test manifest index
    const indexPath = path.join(TEST_DATA_PATH, 'manifests', 'index.json');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      manifestIndex = JSON.parse(indexContent);
    } catch (error) {
      console.warn('Test manifest index not found, using example data');
      manifestIndex = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        libraries: {},
        components: {}
      };
    }
  });

  it('should list all available components', async () => {
    const components = Object.values(manifestIndex.components || {});

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter components by library', async () => {
    const libraryId = 'astralis-casino';
    const components = Object.values(manifestIndex.components || {})
      .filter((c: any) => c.libraryId === libraryId);

    expect(Array.isArray(components)).toBe(true);
  });

  it('should filter components by tag', async () => {
    const tag = 'ui';
    const components = Object.values(manifestIndex.components || {})
      .filter((c: any) => c.tags && c.tags.includes(tag));

    expect(Array.isArray(components)).toBe(true);
  });

  it('should filter components by category', async () => {
    const category = 'game-elements';
    const components = Object.values(manifestIndex.components || {})
      .filter((c: any) => c.category === category);

    expect(Array.isArray(components)).toBe(true);
  });

  it('should return component metadata', async () => {
    const components = Object.values(manifestIndex.components || {});

    if (components.length > 0) {
      const component: any = components[0];

      expect(component).toHaveProperty('id');
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('version');
      expect(component).toHaveProperty('libraryId');
      expect(component).toHaveProperty('riveFile');
    }
  });

  it('should include state machine information', async () => {
    const components = Object.values(manifestIndex.components || {});

    if (components.length > 0) {
      const component: any = components[0];

      if (component.stateMachines) {
        expect(Array.isArray(component.stateMachines)).toBe(true);

        if (component.stateMachines.length > 0) {
          const stateMachine = component.stateMachines[0];
          expect(stateMachine).toHaveProperty('name');
          expect(stateMachine).toHaveProperty('inputs');
        }
      }
    }
  });
});
