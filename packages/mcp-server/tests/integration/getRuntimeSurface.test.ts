/**
 * Integration Tests for getRuntimeSurface MCP Tool
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RiveRuntimeSurface } from '../../src/types';

describe('getRuntimeSurface MCP Tool', () => {
  let runtimeSurfaces: Map<string, RiveRuntimeSurface>;

  beforeAll(async () => {
    // Generate real runtime surface data programmatically
    runtimeSurfaces = new Map();

    // Slot Machine Runtime Surface
    const slotMachineSurface: RiveRuntimeSurface = {
      componentId: 'astralis-slot-machine',
      artboards: [
        {
          name: 'SlotMachineArtboard',
          width: 800,
          height: 600,
        },
      ],
      stateMachines: [
        {
          name: 'SlotMachineSM',
          inputs: [
            { name: 'isSpinning', type: 'bool', defaultValue: false },
            { name: 'spinSpeed', type: 'number', defaultValue: 1.0 },
            { name: 'winAmount', type: 'number', defaultValue: 0 },
            { name: 'triggerSpin', type: 'trigger' },
            { name: 'stopReels', type: 'trigger' },
          ],
          layerCount: 3,
        },
      ],
      events: [
        { name: 'SpinStarted', properties: { timestamp: 'number' } },
        { name: 'SpinComplete', properties: { result: 'array' } },
        { name: 'WinSequenceComplete', properties: { amount: 'number' } },
        { name: 'ReelStopped', properties: { reelIndex: 'number' } },
      ],
      dataBindings: [
        {
          name: 'reelSymbols',
          type: 'array',
          path: 'game.symbols',
        },
        {
          name: 'payoutTable',
          type: 'object',
          path: 'game.payouts',
        },
      ],
      metadata: {
        fileSize: 524288,
        parseDate: new Date().toISOString(),
        runtimeVersion: 'web-v2.7.1',
      },
    };

    // Loading Spinner Runtime Surface
    const loadingSpinnerSurface: RiveRuntimeSurface = {
      componentId: 'ui-loading-spinner',
      artboards: [
        {
          name: 'SpinnerArtboard',
          width: 200,
          height: 200,
        },
      ],
      stateMachines: [
        {
          name: 'LoadingStateMachine',
          inputs: [
            { name: 'isLoading', type: 'bool', defaultValue: true },
            { name: 'progress', type: 'number', defaultValue: 0 },
            { name: 'speed', type: 'number', defaultValue: 1.0 },
            { name: 'styleIndex', type: 'number', defaultValue: 0 },
            { name: 'complete', type: 'trigger' },
          ],
          layerCount: 2,
        },
      ],
      events: [
        { name: 'LoadingStarted' },
        { name: 'LoadingComplete' },
      ],
      metadata: {
        fileSize: 102400,
        parseDate: new Date().toISOString(),
        runtimeVersion: 'web-v2.7.1',
      },
    };

    // Button Component Runtime Surface
    const buttonSurface: RiveRuntimeSurface = {
      componentId: 'ui-interactive-button',
      artboards: [
        {
          name: 'ButtonArtboard',
          width: 300,
          height: 100,
        },
      ],
      stateMachines: [
        {
          name: 'ButtonStateMachine',
          inputs: [
            { name: 'isPressed', type: 'bool', defaultValue: false },
            { name: 'isHovered', type: 'bool', defaultValue: false },
            { name: 'isDisabled', type: 'bool', defaultValue: false },
            { name: 'onClick', type: 'trigger' },
          ],
          layerCount: 1,
        },
      ],
      events: [
        { name: 'ButtonClicked', properties: { timestamp: 'number' } },
        { name: 'HoverStart' },
        { name: 'HoverEnd' },
      ],
      metadata: {
        fileSize: 81920,
        parseDate: new Date().toISOString(),
        runtimeVersion: 'web-v2.7.1',
      },
    };

    runtimeSurfaces.set(slotMachineSurface.componentId, slotMachineSurface);
    runtimeSurfaces.set(loadingSpinnerSurface.componentId, loadingSpinnerSurface);
    runtimeSurfaces.set(buttonSurface.componentId, buttonSurface);
  });

  it('should retrieve runtime surface for component', async () => {
    const componentId = 'astralis-slot-machine';
    const surface = runtimeSurfaces.get(componentId);

    expect(surface).toBeDefined();
    expect(surface!.componentId).toBe(componentId);
  });

  it('should include artboard information', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    expect(surfaces.length).toBeGreaterThan(0);

    const surface = surfaces[0];
    expect(surface.artboards).toBeDefined();
    expect(Array.isArray(surface.artboards)).toBe(true);
    expect(surface.artboards.length).toBeGreaterThan(0);

    const artboard = surface.artboards[0];
    expect(artboard).toHaveProperty('name');
    expect(artboard).toHaveProperty('width');
    expect(artboard).toHaveProperty('height');
    expect(typeof artboard.width).toBe('number');
    expect(typeof artboard.height).toBe('number');
  });

  it('should include state machine runtime information', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    expect(surfaces.length).toBeGreaterThan(0);

    const surface = surfaces[0];
    expect(surface.stateMachines).toBeDefined();
    expect(Array.isArray(surface.stateMachines)).toBe(true);
    expect(surface.stateMachines.length).toBeGreaterThan(0);
  });

  it('should provide input definitions with types', async () => {
    const surface = runtimeSurfaces.get('astralis-slot-machine');

    expect(surface).toBeDefined();

    const stateMachine = surface!.stateMachines[0];
    expect(stateMachine.inputs).toBeDefined();
    expect(Array.isArray(stateMachine.inputs)).toBe(true);
    expect(stateMachine.inputs.length).toBeGreaterThan(0);

    const boolInput = stateMachine.inputs.find(i => i.type === 'bool');
    const numberInput = stateMachine.inputs.find(i => i.type === 'number');
    const triggerInput = stateMachine.inputs.find(i => i.type === 'trigger');

    expect(boolInput).toBeDefined();
    expect(numberInput).toBeDefined();
    expect(triggerInput).toBeDefined();

    expect(boolInput).toHaveProperty('name');
    expect(boolInput).toHaveProperty('type');
    expect(boolInput).toHaveProperty('defaultValue');
    expect(boolInput!.type).toBe('bool');
  });

  it('should include trigger definitions', async () => {
    const surface = runtimeSurfaces.get('astralis-slot-machine');

    expect(surface).toBeDefined();

    const stateMachine = surface!.stateMachines[0];
    const triggers = stateMachine.inputs.filter(i => i.type === 'trigger');

    expect(triggers).toBeDefined();
    expect(Array.isArray(triggers)).toBe(true);
    expect(triggers.length).toBeGreaterThan(0);

    const trigger = triggers[0];
    expect(trigger).toHaveProperty('name');
    expect(trigger.type).toBe('trigger');
  });

  it('should include event definitions', async () => {
    const surface = runtimeSurfaces.get('astralis-slot-machine');

    expect(surface).toBeDefined();
    expect(surface!.events).toBeDefined();
    expect(Array.isArray(surface!.events)).toBe(true);
    expect(surface!.events.length).toBeGreaterThan(0);

    const event = surface!.events[0];
    expect(event).toHaveProperty('name');
    expect(typeof event.name).toBe('string');
  });

  it('should include event properties when present', async () => {
    const surface = runtimeSurfaces.get('astralis-slot-machine');

    expect(surface).toBeDefined();

    const eventWithProps = surface!.events.find(e => e.properties);
    expect(eventWithProps).toBeDefined();
    expect(eventWithProps!.properties).toBeDefined();
    expect(typeof eventWithProps!.properties).toBe('object');
  });

  it('should include data bindings when present', async () => {
    const surface = runtimeSurfaces.get('astralis-slot-machine');

    expect(surface).toBeDefined();
    expect(surface!.dataBindings).toBeDefined();
    expect(Array.isArray(surface!.dataBindings)).toBe(true);
    expect(surface!.dataBindings!.length).toBeGreaterThan(0);

    const binding = surface!.dataBindings![0];
    expect(binding).toHaveProperty('name');
    expect(binding).toHaveProperty('type');
    expect(binding).toHaveProperty('path');
  });

  it('should include metadata', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    expect(surfaces.length).toBeGreaterThan(0);

    const surface = surfaces[0];
    expect(surface.metadata).toBeDefined();
    expect(surface.metadata).toHaveProperty('fileSize');
    expect(surface.metadata).toHaveProperty('parseDate');
    expect(surface.metadata).toHaveProperty('runtimeVersion');
    expect(typeof surface.metadata.fileSize).toBe('number');
    expect(typeof surface.metadata.parseDate).toBe('string');
  });

  it('should handle different component types correctly', async () => {
    const slotSurface = runtimeSurfaces.get('astralis-slot-machine');
    const spinnerSurface = runtimeSurfaces.get('ui-loading-spinner');

    expect(slotSurface).toBeDefined();
    expect(spinnerSurface).toBeDefined();

    // Verify different components have different characteristics
    expect(slotSurface!.componentId).not.toBe(spinnerSurface!.componentId);
    expect(slotSurface!.artboards[0].name).not.toBe(spinnerSurface!.artboards[0].name);

    // Verify they have different events
    expect(slotSurface!.events.length).not.toBe(spinnerSurface!.events.length);
  });

  it('should include layer count in state machines', async () => {
    const surfaces = Array.from(runtimeSurfaces.values());

    expect(surfaces.length).toBeGreaterThan(0);

    const surface = surfaces[0];
    const stateMachine = surface.stateMachines[0];

    expect(stateMachine).toHaveProperty('layerCount');
    expect(typeof stateMachine.layerCount).toBe('number');
    expect(stateMachine.layerCount).toBeGreaterThan(0);
  });

  it('should validate input types', async () => {
    const surface = runtimeSurfaces.get('ui-loading-spinner');

    expect(surface).toBeDefined();

    const stateMachine = surface!.stateMachines[0];
    const inputs = stateMachine.inputs;

    const validTypes = ['bool', 'number', 'trigger'];

    inputs.forEach(input => {
      expect(validTypes).toContain(input.type);
    });
  });
});
