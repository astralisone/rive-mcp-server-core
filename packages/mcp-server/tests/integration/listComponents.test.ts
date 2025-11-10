/**
 * Integration Tests for listComponents MCP Tool
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { setStorageConfig, saveLibrary, getAllComponents } from '../../src/utils/storage';
import { RiveLibrary, RiveComponent } from '../../src/types';

describe('listComponents MCP Tool', () => {
  let testManifestsDir: string;
  let testAssetsDir: string;
  let testLibraries: RiveLibrary[];

  beforeAll(async () => {
    // Create temporary test directories
    const tmpDir = await fs.mkdtemp(path.join('/tmp', 'rive-test-'));
    testManifestsDir = path.join(tmpDir, 'manifests');
    testAssetsDir = path.join(tmpDir, 'assets');

    await fs.mkdir(testManifestsDir, { recursive: true });
    await fs.mkdir(testAssetsDir, { recursive: true });

    // Configure storage to use test directories
    setStorageConfig({
      manifestsPath: testManifestsDir,
      assetsPath: testAssetsDir,
    });

    // Generate real test data programmatically
    const casinoLibrary: RiveLibrary = {
      id: 'astralis-casino',
      name: 'Astralis Casino Components',
      version: '1.0.0',
      description: 'Casino game components for testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'astralis-slot-machine',
          libraryId: 'astralis-casino',
          name: 'Slot Machine',
          description: 'Interactive slot machine component',
          filePath: path.join(testAssetsDir, 'astralis-slot-machine.riv'),
          artboardName: 'SlotMachineArtboard',
          stateMachineName: 'SlotMachineSM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['ui', 'game-elements', 'casino'],
          metadata: {
            category: 'game-elements',
          },
        },
        {
          id: 'game-character-avatar',
          libraryId: 'astralis-casino',
          name: 'Character Avatar',
          description: 'Animated character avatar',
          filePath: path.join(testAssetsDir, 'game-character-avatar.riv'),
          artboardName: 'CharacterArtboard',
          stateMachineName: 'CharacterSM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['character', 'game-elements'],
          metadata: {
            category: 'game-elements',
          },
        },
      ],
      tags: ['casino', 'game'],
    };

    const uiLibrary: RiveLibrary = {
      id: 'ui-components',
      name: 'UI Components Library',
      version: '1.0.0',
      description: 'Common UI components for testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'ui-loading-spinner',
          libraryId: 'ui-components',
          name: 'Loading Spinner',
          description: 'Animated loading spinner',
          filePath: path.join(testAssetsDir, 'ui-loading-spinner.riv'),
          artboardName: 'SpinnerArtboard',
          stateMachineName: 'LoadingStateMachine',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['ui', 'loading'],
          metadata: {
            category: 'ui-elements',
          },
        },
        {
          id: 'ui-interactive-button',
          libraryId: 'ui-components',
          name: 'Interactive Button',
          description: 'Interactive button with animations',
          filePath: path.join(testAssetsDir, 'ui-interactive-button.riv'),
          artboardName: 'ButtonArtboard',
          stateMachineName: 'ButtonSM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['ui', 'button'],
          metadata: {
            category: 'ui-elements',
          },
        },
      ],
      tags: ['ui'],
    };

    // Save libraries to test storage
    await saveLibrary(casinoLibrary);
    await saveLibrary(uiLibrary);

    testLibraries = [casinoLibrary, uiLibrary];
  });

  afterAll(async () => {
    // Clean up test directories
    if (testManifestsDir) {
      await fs.rm(path.dirname(testManifestsDir), { recursive: true, force: true });
    }
  });

  it('should list all available components', async () => {
    const componentManifests = await getAllComponents();
    const components = componentManifests.map(cm => cm.component);

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBe(4); // 2 from casino library + 2 from ui library
  });

  it('should filter components by library', async () => {
    const componentManifests = await getAllComponents();
    const libraryId = 'astralis-casino';
    const components = componentManifests
      .filter(cm => cm.component.libraryId === libraryId)
      .map(cm => cm.component);

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBe(2);
    expect(components.every(c => c.libraryId === libraryId)).toBe(true);
  });

  it('should filter components by tag', async () => {
    const componentManifests = await getAllComponents();
    const tag = 'ui';
    const components = componentManifests
      .filter(cm => cm.component.tags && cm.component.tags.includes(tag))
      .map(cm => cm.component);

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThan(0);
    expect(components.every(c => c.tags?.includes(tag))).toBe(true);
  });

  it('should filter components by category', async () => {
    const componentManifests = await getAllComponents();
    const category = 'game-elements';
    const components = componentManifests
      .filter(cm => cm.component.metadata?.category === category)
      .map(cm => cm.component);

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBe(2);
    expect(components.every(c => c.metadata?.category === category)).toBe(true);
  });

  it('should return component metadata', async () => {
    const componentManifests = await getAllComponents();
    const components = componentManifests.map(cm => cm.component);

    expect(components.length).toBeGreaterThan(0);

    const component = components[0];
    expect(component).toHaveProperty('id');
    expect(component).toHaveProperty('name');
    expect(component).toHaveProperty('libraryId');
    expect(component).toHaveProperty('filePath');
    expect(component).toHaveProperty('createdAt');
    expect(component).toHaveProperty('updatedAt');
  });

  it('should include state machine name when present', async () => {
    const componentManifests = await getAllComponents();
    const components = componentManifests.map(cm => cm.component);

    expect(components.length).toBeGreaterThan(0);

    const component = components[0];
    expect(component).toHaveProperty('stateMachineName');
    expect(typeof component.stateMachineName).toBe('string');
    expect(component.stateMachineName).toBeTruthy();
  });
});
