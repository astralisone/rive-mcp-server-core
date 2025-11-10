/**
 * Integration Tests for getComponentDetail MCP Tool
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { setStorageConfig, saveLibrary, getComponentById } from '../../src/utils/storage';
import { RiveLibrary } from '../../src/types';

describe('getComponentDetail MCP Tool', () => {
  let testManifestsDir: string;
  let testAssetsDir: string;
  let testComponentIds: string[];

  beforeAll(async () => {
    // Create temporary test directories
    const tmpDir = await fs.mkdtemp(path.join('/tmp', 'rive-test-detail-'));
    testManifestsDir = path.join(tmpDir, 'manifests');
    testAssetsDir = path.join(tmpDir, 'assets');

    await fs.mkdir(testManifestsDir, { recursive: true });
    await fs.mkdir(testAssetsDir, { recursive: true });

    // Configure storage to use test directories
    setStorageConfig({
      manifestsPath: testManifestsDir,
      assetsPath: testAssetsDir,
    });

    // Generate real test data
    const testLibrary: RiveLibrary = {
      id: 'test-library',
      name: 'Test Component Library',
      version: '1.0.0',
      description: 'Library for component detail testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'slot-machine-component',
          libraryId: 'test-library',
          name: 'Slot Machine Component',
          description: 'Detailed slot machine with state machines',
          filePath: path.join(testAssetsDir, 'slot-machine-component.riv'),
          artboardName: 'MainArtboard',
          stateMachineName: 'SlotMachineSM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['game', 'casino', 'interactive'],
          metadata: {
            category: 'game-elements',
            complexity: 'high',
            recommendedFrameworks: ['react', 'vue'],
          },
        },
        {
          id: 'loading-spinner-component',
          libraryId: 'test-library',
          name: 'Loading Spinner',
          description: 'Animated loading spinner with multiple styles',
          filePath: path.join(testAssetsDir, 'loading-spinner-component.riv'),
          artboardName: 'SpinnerArtboard',
          stateMachineName: 'LoadingStateMachine',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['ui', 'loading', 'animation'],
          metadata: {
            category: 'ui-elements',
            complexity: 'low',
          },
        },
      ],
      tags: ['test'],
    };

    await saveLibrary(testLibrary);
    testComponentIds = testLibrary.components.map(c => c.id);
  });

  afterAll(async () => {
    // Clean up test directories
    if (testManifestsDir) {
      await fs.rm(path.dirname(testManifestsDir), { recursive: true, force: true });
    }
  });

  it('should retrieve component by ID', async () => {
    const componentId = testComponentIds[0];
    const componentManifest = await getComponentById(componentId);

    expect(componentManifest).toBeDefined();
    expect(componentManifest).not.toBeNull();
    expect(componentManifest!.component.id).toBe(componentId);
  });

  it('should return complete component manifest', async () => {
    const componentId = testComponentIds[0];
    const componentManifest = await getComponentById(componentId);

    expect(componentManifest).not.toBeNull();

    const { component, library } = componentManifest!;

    expect(component).toHaveProperty('id');
    expect(component).toHaveProperty('name');
    expect(component).toHaveProperty('libraryId');
    expect(component).toHaveProperty('filePath');
    expect(component).toHaveProperty('artboardName');
    expect(component).toHaveProperty('stateMachineName');
    expect(component).toHaveProperty('createdAt');
    expect(component).toHaveProperty('updatedAt');
    expect(component).toHaveProperty('tags');
    expect(component).toHaveProperty('metadata');

    expect(library).toHaveProperty('id');
    expect(library).toHaveProperty('name');
    expect(library).toHaveProperty('version');
  });

  it('should include artboard and state machine names', async () => {
    const componentId = testComponentIds[0];
    const componentManifest = await getComponentById(componentId);

    expect(componentManifest).not.toBeNull();

    const { component } = componentManifest!;

    expect(component.artboardName).toBeDefined();
    expect(component.stateMachineName).toBeDefined();
    expect(typeof component.artboardName).toBe('string');
    expect(typeof component.stateMachineName).toBe('string');
  });

  it('should include component tags', async () => {
    const componentId = testComponentIds[0];
    const componentManifest = await getComponentById(componentId);

    expect(componentManifest).not.toBeNull();

    const { component } = componentManifest!;

    expect(Array.isArray(component.tags)).toBe(true);
    expect(component.tags!.length).toBeGreaterThan(0);
    expect(component.tags).toContain('game');
    expect(component.tags).toContain('casino');
  });

  it('should include component metadata', async () => {
    const componentId = testComponentIds[0];
    const componentManifest = await getComponentById(componentId);

    expect(componentManifest).not.toBeNull();

    const { component } = componentManifest!;

    expect(component.metadata).toBeDefined();
    expect(component.metadata).toHaveProperty('category');
    expect(component.metadata!.category).toBe('game-elements');
  });

  it('should handle non-existent component gracefully', async () => {
    const nonExistentId = 'non-existent-component-id-12345';
    const componentManifest = await getComponentById(nonExistentId);

    expect(componentManifest).toBeNull();
  });

  it('should retrieve different components with correct details', async () => {
    const componentId1 = testComponentIds[0];
    const componentId2 = testComponentIds[1];

    const manifest1 = await getComponentById(componentId1);
    const manifest2 = await getComponentById(componentId2);

    expect(manifest1).not.toBeNull();
    expect(manifest2).not.toBeNull();

    expect(manifest1!.component.id).not.toBe(manifest2!.component.id);
    expect(manifest1!.component.name).not.toBe(manifest2!.component.name);
    expect(manifest1!.library.id).toBe(manifest2!.library.id); // Same library
  });
});
