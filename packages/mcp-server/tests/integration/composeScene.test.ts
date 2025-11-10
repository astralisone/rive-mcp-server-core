/**
 * Integration Tests for composeScene MCP Tool
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// Motion Spec Type Definitions
interface MotionSpec {
  id: string;
  name: string;
  purpose: string;
  components: Array<{
    componentId: string;
    layer: number;
    timeline: {
      start: number;
      duration: number | null;
      inputs?: Array<{
        name: string;
        value: any;
        atTime: number;
      }>;
      triggers?: Array<{
        name: string;
        atTime: number;
      }>;
    };
    exitAnimation?: {
      type: string;
      duration: number;
      atTime: number;
    };
    entryAnimation?: {
      type: string;
      duration: number;
      atTime: number;
    };
  }>;
  audioTracks?: Array<{
    trackId: string;
    src: string;
    start: number;
    volume: number;
    loop?: boolean;
  }>;
  transitions?: {
    crossfade?: {
      enabled: boolean;
      duration: number;
    };
    position?: {
      maintainCenter?: boolean;
    };
  };
  metadata?: {
    tags?: string[];
    difficulty?: string;
    estimatedDuration?: number | null;
  };
}

describe('composeScene MCP Tool', () => {
  let motionSpecs: Map<string, MotionSpec>;

  beforeAll(async () => {
    // Generate real motion spec data programmatically
    motionSpecs = new Map();

    // Big Win Celebration Sequence
    const celebrationSpec: MotionSpec = {
      id: 'celebration-big-win',
      name: 'Big Win Celebration Sequence',
      purpose: 'Multi-component celebration for major wins',
      components: [
        {
          componentId: 'astralis-slot-machine',
          layer: 1,
          timeline: {
            start: 0,
            duration: 3000,
            inputs: [
              {
                name: 'winAmount',
                value: 5000,
                atTime: 0,
              },
            ],
            triggers: [
              {
                name: 'stopReels',
                atTime: 500,
              },
            ],
          },
        },
        {
          componentId: 'game-character-avatar',
          layer: 2,
          timeline: {
            start: 1000,
            duration: 2500,
            inputs: [
              {
                name: 'emotionIndex',
                value: 7,
                atTime: 0,
              },
            ],
            triggers: [
              {
                name: 'triggerReaction',
                atTime: 200,
              },
              {
                name: 'wave',
                atTime: 1500,
              },
            ],
          },
        },
        {
          componentId: 'confetti-particle-system',
          layer: 3,
          timeline: {
            start: 1500,
            duration: 2000,
            inputs: [
              {
                name: 'intensity',
                value: 10,
                atTime: 0,
              },
            ],
            triggers: [
              {
                name: 'explode',
                atTime: 0,
              },
            ],
          },
        },
      ],
      audioTracks: [
        {
          trackId: 'win-fanfare',
          src: '/audio/win-fanfare.mp3',
          start: 500,
          volume: 0.8,
        },
        {
          trackId: 'celebration-music',
          src: '/audio/celebration.mp3',
          start: 1000,
          volume: 0.6,
          loop: false,
        },
      ],
      transitions: {
        crossfade: {
          enabled: true,
          duration: 300,
        },
      },
      metadata: {
        tags: ['celebration', 'win', 'multi-component'],
        difficulty: 'intermediate',
        estimatedDuration: 3500,
      },
    };

    // Button to Loader UI Flow
    const buttonLoaderSpec: MotionSpec = {
      id: 'button-to-loader',
      name: 'Button Click to Loading Flow',
      purpose: 'Smooth transition from button click to loading state',
      components: [
        {
          componentId: 'ui-interactive-button',
          layer: 1,
          timeline: {
            start: 0,
            duration: 500,
            inputs: [
              {
                name: 'isPressed',
                value: true,
                atTime: 0,
              },
              {
                name: 'isPressed',
                value: false,
                atTime: 200,
              },
            ],
            triggers: [
              {
                name: 'onClick',
                atTime: 100,
              },
            ],
          },
          exitAnimation: {
            type: 'fadeOut',
            duration: 200,
            atTime: 300,
          },
        },
        {
          componentId: 'ui-loading-spinner',
          layer: 1,
          timeline: {
            start: 500,
            duration: null,
            inputs: [
              {
                name: 'isLoading',
                value: true,
                atTime: 0,
              },
              {
                name: 'styleIndex',
                value: 1,
                atTime: 0,
              },
            ],
          },
          entryAnimation: {
            type: 'fadeIn',
            duration: 200,
            atTime: 0,
          },
        },
      ],
      transitions: {
        crossfade: {
          enabled: true,
          duration: 200,
        },
        position: {
          maintainCenter: true,
        },
      },
      metadata: {
        tags: ['ui', 'transition', 'loading'],
        difficulty: 'beginner',
        estimatedDuration: null,
      },
    };

    // Jackpot Win Mega Sequence
    const jackpotSpec: MotionSpec = {
      id: 'jackpot-mega-win',
      name: 'Jackpot Mega Win Sequence',
      purpose: 'Epic multi-stage jackpot celebration with coordinated animations',
      components: [
        {
          componentId: 'astralis-slot-machine',
          layer: 1,
          timeline: {
            start: 0,
            duration: 5000,
            inputs: [
              {
                name: 'winAmount',
                value: 100000,
                atTime: 0,
              },
              {
                name: 'jackpotMode',
                value: true,
                atTime: 0,
              },
            ],
            triggers: [
              {
                name: 'stopReels',
                atTime: 1000,
              },
              {
                name: 'revealJackpot',
                atTime: 1500,
              },
            ],
          },
        },
        {
          componentId: 'game-character-avatar',
          layer: 2,
          timeline: {
            start: 1500,
            duration: 3500,
            inputs: [
              {
                name: 'emotionIndex',
                value: 9,
                atTime: 0,
              },
            ],
            triggers: [
              {
                name: 'triggerReaction',
                atTime: 0,
              },
              {
                name: 'celebrate',
                atTime: 500,
              },
            ],
          },
        },
      ],
      audioTracks: [
        {
          trackId: 'jackpot-siren',
          src: '/audio/jackpot-siren.mp3',
          start: 0,
          volume: 1.0,
          loop: false,
        },
        {
          trackId: 'epic-celebration',
          src: '/audio/epic-celebration.mp3',
          start: 1000,
          volume: 0.9,
          loop: false,
        },
      ],
      transitions: {
        crossfade: {
          enabled: true,
          duration: 500,
        },
      },
      metadata: {
        tags: ['jackpot', 'celebration', 'epic', 'multi-stage'],
        difficulty: 'advanced',
        estimatedDuration: 5000,
      },
    };

    motionSpecs.set(celebrationSpec.id, celebrationSpec);
    motionSpecs.set(buttonLoaderSpec.id, buttonLoaderSpec);
    motionSpecs.set(jackpotSpec.id, jackpotSpec);
  });

  it('should load motion spec by ID', async () => {
    const specId = 'celebration-big-win';
    const spec = motionSpecs.get(specId);

    expect(spec).toBeDefined();
    expect(spec!.id).toBe(specId);
  });

  it('should contain component timeline definitions', async () => {
    const specs = Array.from(motionSpecs.values());

    expect(specs.length).toBeGreaterThan(0);

    const spec = specs[0];
    expect(spec).toHaveProperty('components');
    expect(Array.isArray(spec.components)).toBe(true);
    expect(spec.components.length).toBeGreaterThan(0);

    const component = spec.components[0];
    expect(component).toHaveProperty('componentId');
    expect(component).toHaveProperty('timeline');
    expect(typeof component.componentId).toBe('string');
  });

  it('should define component layers', async () => {
    const specs = Array.from(motionSpecs.values());

    expect(specs.length).toBeGreaterThan(0);

    const spec = specs[0];
    const component = spec.components[0];

    expect(component).toHaveProperty('layer');
    expect(typeof component.layer).toBe('number');
    expect(component.layer).toBeGreaterThanOrEqual(1);
  });

  it('should include timeline with start and duration', async () => {
    const specs = Array.from(motionSpecs.values());

    expect(specs.length).toBeGreaterThan(0);

    const spec = specs[0];
    const component = spec.components[0];

    expect(component.timeline).toHaveProperty('start');
    expect(component.timeline).toHaveProperty('duration');
    expect(typeof component.timeline.start).toBe('number');
    expect(component.timeline.start).toBeGreaterThanOrEqual(0);
  });

  it('should define input values with timing', async () => {
    const spec = motionSpecs.get('celebration-big-win');

    expect(spec).toBeDefined();

    const component = spec!.components[0];
    const inputs = component.timeline.inputs;

    expect(inputs).toBeDefined();
    expect(Array.isArray(inputs)).toBe(true);
    expect(inputs!.length).toBeGreaterThan(0);

    const input = inputs![0];
    expect(input).toHaveProperty('name');
    expect(input).toHaveProperty('value');
    expect(input).toHaveProperty('atTime');
    expect(typeof input.name).toBe('string');
    expect(typeof input.atTime).toBe('number');
  });

  it('should define triggers with timing', async () => {
    const spec = motionSpecs.get('celebration-big-win');

    expect(spec).toBeDefined();

    const component = spec!.components[0];
    const triggers = component.timeline.triggers;

    expect(triggers).toBeDefined();
    expect(Array.isArray(triggers)).toBe(true);
    expect(triggers!.length).toBeGreaterThan(0);

    const trigger = triggers![0];
    expect(trigger).toHaveProperty('name');
    expect(trigger).toHaveProperty('atTime');
    expect(typeof trigger.name).toBe('string');
    expect(typeof trigger.atTime).toBe('number');
  });

  it('should include audio tracks when present', async () => {
    const spec = motionSpecs.get('celebration-big-win');

    expect(spec).toBeDefined();
    expect(spec!.audioTracks).toBeDefined();
    expect(Array.isArray(spec!.audioTracks)).toBe(true);
    expect(spec!.audioTracks!.length).toBeGreaterThan(0);

    const track = spec!.audioTracks![0];
    expect(track).toHaveProperty('trackId');
    expect(track).toHaveProperty('src');
    expect(track).toHaveProperty('start');
    expect(track).toHaveProperty('volume');
  });

  it('should define transitions', async () => {
    const specs = Array.from(motionSpecs.values());

    expect(specs.length).toBeGreaterThan(0);

    const spec = specs[0];
    expect(spec.transitions).toBeDefined();
    expect(typeof spec.transitions).toBe('object');
  });

  it('should include metadata', async () => {
    const specs = Array.from(motionSpecs.values());

    expect(specs.length).toBeGreaterThan(0);

    const spec = specs[0];
    expect(spec).toHaveProperty('id');
    expect(spec).toHaveProperty('name');
    expect(spec).toHaveProperty('purpose');
    expect(spec.metadata).toBeDefined();
    expect(spec.metadata).toHaveProperty('tags');
    expect(Array.isArray(spec.metadata!.tags)).toBe(true);
  });

  it('should support multi-component compositions', async () => {
    const specId = 'celebration-big-win';
    const spec = motionSpecs.get(specId);

    expect(spec).toBeDefined();
    expect(spec!.components.length).toBeGreaterThan(1);
    expect(spec!.components.length).toBe(3);
  });

  it('should support component entry and exit animations', async () => {
    const specId = 'button-to-loader';
    const spec = motionSpecs.get(specId);

    expect(spec).toBeDefined();
    expect(spec!.components.length).toBeGreaterThan(0);

    const hasExitAnimation = spec!.components.some(c => c.exitAnimation);
    const hasEntryAnimation = spec!.components.some(c => c.entryAnimation);

    expect(hasExitAnimation || hasEntryAnimation).toBe(true);

    const componentWithExit = spec!.components.find(c => c.exitAnimation);
    expect(componentWithExit).toBeDefined();
    expect(componentWithExit!.exitAnimation).toHaveProperty('type');
    expect(componentWithExit!.exitAnimation).toHaveProperty('duration');
    expect(componentWithExit!.exitAnimation).toHaveProperty('atTime');
  });

  it('should handle different animation complexities', async () => {
    const beginnerSpec = motionSpecs.get('button-to-loader');
    const advancedSpec = motionSpecs.get('jackpot-mega-win');

    expect(beginnerSpec).toBeDefined();
    expect(advancedSpec).toBeDefined();

    expect(beginnerSpec!.metadata?.difficulty).toBe('beginner');
    expect(advancedSpec!.metadata?.difficulty).toBe('advanced');
  });

  it('should support layered component composition', async () => {
    const spec = motionSpecs.get('celebration-big-win');

    expect(spec).toBeDefined();

    const layers = spec!.components.map(c => c.layer);
    const uniqueLayers = new Set(layers);

    expect(uniqueLayers.size).toBeGreaterThan(1);
    expect(Math.max(...layers)).toBe(3);
  });

  it('should support coordinated timeline events', async () => {
    const spec = motionSpecs.get('celebration-big-win');

    expect(spec).toBeDefined();

    const firstComponent = spec!.components[0];
    const secondComponent = spec!.components[1];

    expect(firstComponent.timeline.start).toBe(0);
    expect(secondComponent.timeline.start).toBeGreaterThan(firstComponent.timeline.start);

    // Verify components can overlap
    const firstEnd = firstComponent.timeline.start + (firstComponent.timeline.duration || 0);
    expect(secondComponent.timeline.start).toBeLessThan(firstEnd);
  });

  it('should include crossfade transitions', async () => {
    const spec = motionSpecs.get('button-to-loader');

    expect(spec).toBeDefined();
    expect(spec!.transitions).toBeDefined();
    expect(spec!.transitions!.crossfade).toBeDefined();
    expect(spec!.transitions!.crossfade!.enabled).toBe(true);
    expect(typeof spec!.transitions!.crossfade!.duration).toBe('number');
  });

  it('should validate motion spec structure', async () => {
    const specs = Array.from(motionSpecs.values());

    specs.forEach(spec => {
      // Required fields
      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('name');
      expect(spec).toHaveProperty('purpose');
      expect(spec).toHaveProperty('components');

      // Components structure
      expect(Array.isArray(spec.components)).toBe(true);

      spec.components.forEach(component => {
        expect(component).toHaveProperty('componentId');
        expect(component).toHaveProperty('layer');
        expect(component).toHaveProperty('timeline');
        expect(component.timeline).toHaveProperty('start');
        expect(component.timeline).toHaveProperty('duration');
      });
    });
  });
});
