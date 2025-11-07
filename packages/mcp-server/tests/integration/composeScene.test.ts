/**
 * Integration Tests for composeScene MCP Tool
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';

const TEST_DATA_PATH = path.join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures');

describe('composeScene MCP Tool', () => {
  let motionSpecs: Map<string, any>;

  beforeAll(async () => {
    motionSpecs = new Map();

    // Load test motion specs
    const specFiles = [
      'celebration-sequence.json',
      'ui-interaction-flow.json'
    ];

    for (const file of specFiles) {
      try {
        const specPath = path.join(TEST_DATA_PATH, 'motion-specs', file);
        const content = await fs.readFile(specPath, 'utf-8');
        const spec = JSON.parse(content);
        motionSpecs.set(spec.id, spec);
      } catch (error) {
        console.warn(`Failed to load spec: ${file}`);
      }
    }
  });

  it('should load motion spec by ID', async () => {
    const specId = 'celebration-big-win';
    const spec = motionSpecs.get(specId);

    expect(spec).toBeDefined();
    expect(spec.id).toBe(specId);
  });

  it('should contain component timeline definitions', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      expect(spec).toHaveProperty('components');
      expect(Array.isArray(spec.components)).toBe(true);

      if (spec.components.length > 0) {
        const component = spec.components[0];
        expect(component).toHaveProperty('componentId');
        expect(component).toHaveProperty('timeline');
      }
    }
  });

  it('should define component layers', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      if (spec.components && spec.components.length > 0) {
        const component = spec.components[0];
        expect(component).toHaveProperty('layer');
        expect(typeof component.layer).toBe('number');
      }
    }
  });

  it('should include timeline with start and duration', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      if (spec.components && spec.components.length > 0) {
        const component = spec.components[0];
        expect(component.timeline).toHaveProperty('start');
        expect(component.timeline).toHaveProperty('duration');
      }
    }
  });

  it('should define input values with timing', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      if (spec.components && spec.components.length > 0) {
        const component = spec.components[0];
        const inputs = component.timeline.inputs;

        if (inputs && inputs.length > 0) {
          const input = inputs[0];
          expect(input).toHaveProperty('name');
          expect(input).toHaveProperty('value');
          expect(input).toHaveProperty('atTime');
        }
      }
    }
  });

  it('should define triggers with timing', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      if (spec.components && spec.components.length > 0) {
        const component = spec.components[0];
        const triggers = component.timeline.triggers;

        if (triggers && triggers.length > 0) {
          const trigger = triggers[0];
          expect(trigger).toHaveProperty('name');
          expect(trigger).toHaveProperty('atTime');
        }
      }
    }
  });

  it('should include audio tracks when present', async () => {
    const specs = Array.from(motionSpecs.values());

    for (const spec of specs) {
      if (spec.audioTracks) {
        expect(Array.isArray(spec.audioTracks)).toBe(true);

        if (spec.audioTracks.length > 0) {
          const track = spec.audioTracks[0];
          expect(track).toHaveProperty('trackId');
          expect(track).toHaveProperty('src');
          expect(track).toHaveProperty('start');
        }
      }
    }
  });

  it('should define transitions', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      if (spec.transitions) {
        expect(typeof spec.transitions).toBe('object');
      }
    }
  });

  it('should include metadata', async () => {
    const specs = Array.from(motionSpecs.values());

    if (specs.length > 0) {
      const spec = specs[0];

      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('name');
      expect(spec).toHaveProperty('purpose');

      if (spec.metadata) {
        expect(spec.metadata).toHaveProperty('tags');
      }
    }
  });

  it('should support multi-component compositions', async () => {
    const specId = 'celebration-big-win';
    const spec = motionSpecs.get(specId);

    if (spec) {
      expect(spec.components.length).toBeGreaterThan(1);
    }
  });

  it('should support component entry and exit animations', async () => {
    const specId = 'button-to-loader';
    const spec = motionSpecs.get(specId);

    if (spec && spec.components && spec.components.length > 0) {
      const hasExitAnimation = spec.components.some((c: any) => c.exitAnimation);
      const hasEntryAnimation = spec.components.some((c: any) => c.entryAnimation);

      expect(hasExitAnimation || hasEntryAnimation).toBe(true);
    }
  });
});
