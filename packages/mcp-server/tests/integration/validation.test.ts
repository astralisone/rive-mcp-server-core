/**
 * Integration Tests for Validation Utilities
 *
 * Tests Phase 1 validation enhancements:
 * - FitMode validation
 * - Alignment validation
 * - Component ID validation
 * - Runtime surface validation
 * - State machine validation
 * - File path validation
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateFitMode,
  validateAlignment,
  validateComponentId,
  validateRuntimeSurface,
  validateStateMachine,
  validateFilePath,
  getValidFitModes,
  getValidAlignments,
} from '../../src/utils/validation';
import { FitMode, Alignment, RiveStateMachine, RiveRuntimeSurface } from '../../src/types';

describe('Validation Utilities Integration Tests', () => {
  describe('validateFitMode', () => {
    describe('Valid FitModes', () => {
      const validFitModes: FitMode[] = [
        'cover',
        'contain',
        'fill',
        'fitWidth',
        'fitHeight',
        'none',
        'scaleDown',
      ];

      validFitModes.forEach(fitMode => {
        it(`should validate "${fitMode}" as valid`, () => {
          expect(validateFitMode(fitMode)).toBe(true);
        });
      });

      it('should validate all fit modes from getValidFitModes', () => {
        const fitModes = getValidFitModes();
        fitModes.forEach(fitMode => {
          expect(validateFitMode(fitMode)).toBe(true);
        });
      });
    });

    describe('Invalid FitModes', () => {
      const invalidFitModes = [
        'invalid',
        'CONTAIN',
        'Cover',
        'fit-width',
        'fit_width',
        '',
        ' ',
        'stretch',
        'zoom',
      ];

      invalidFitModes.forEach(fitMode => {
        it(`should reject "${fitMode}" as invalid`, () => {
          expect(validateFitMode(fitMode)).toBe(false);
        });
      });

      it('should reject null values', () => {
        expect(validateFitMode(null as any)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(validateFitMode(undefined as any)).toBe(false);
      });

      it('should reject numeric values', () => {
        expect(validateFitMode(123 as any)).toBe(false);
      });

      it('should reject object values', () => {
        expect(validateFitMode({} as any)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should be case-sensitive', () => {
        expect(validateFitMode('Contain')).toBe(false);
        expect(validateFitMode('CONTAIN')).toBe(false);
        expect(validateFitMode('contain')).toBe(true);
      });

      it('should not accept fit modes with whitespace', () => {
        expect(validateFitMode(' contain')).toBe(false);
        expect(validateFitMode('contain ')).toBe(false);
        expect(validateFitMode(' contain ')).toBe(false);
      });
    });
  });

  describe('validateAlignment', () => {
    describe('Valid Alignments', () => {
      const validAlignments: Alignment[] = [
        'center',
        'topLeft',
        'topCenter',
        'topRight',
        'centerLeft',
        'centerRight',
        'bottomLeft',
        'bottomCenter',
        'bottomRight',
      ];

      validAlignments.forEach(alignment => {
        it(`should validate "${alignment}" as valid`, () => {
          expect(validateAlignment(alignment)).toBe(true);
        });
      });

      it('should validate all alignments from getValidAlignments', () => {
        const alignments = getValidAlignments();
        alignments.forEach(alignment => {
          expect(validateAlignment(alignment)).toBe(true);
        });
      });
    });

    describe('Invalid Alignments', () => {
      const invalidAlignments = [
        'invalid',
        'CENTER',
        'Center',
        'top-left',
        'top_left',
        '',
        ' ',
        'left',
        'right',
        'top',
        'bottom',
        'middle',
      ];

      invalidAlignments.forEach(alignment => {
        it(`should reject "${alignment}" as invalid`, () => {
          expect(validateAlignment(alignment)).toBe(false);
        });
      });

      it('should reject null values', () => {
        expect(validateAlignment(null as any)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(validateAlignment(undefined as any)).toBe(false);
      });

      it('should reject numeric values', () => {
        expect(validateAlignment(123 as any)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should be case-sensitive', () => {
        expect(validateAlignment('Center')).toBe(false);
        expect(validateAlignment('CENTER')).toBe(false);
        expect(validateAlignment('center')).toBe(true);
      });

      it('should not accept alignments with whitespace', () => {
        expect(validateAlignment(' center')).toBe(false);
        expect(validateAlignment('center ')).toBe(false);
        expect(validateAlignment('top Left')).toBe(false);
      });
    });
  });

  describe('validateComponentId', () => {
    describe('Valid Component IDs', () => {
      const validIds = [
        'component-1',
        'my_component',
        'Component123',
        'test-component-name',
        'button_primary_large',
        'ui-loading-spinner',
        'astralis-slot-machine',
        'a',
        'A',
        '1',
        'component-with-many-hyphens-and-numbers-123',
        'component_with_many_underscores_and_numbers_456',
        'MixedCaseComponentName',
      ];

      validIds.forEach(id => {
        it(`should validate "${id}" as valid`, () => {
          expect(validateComponentId(id)).toBe(true);
        });
      });
    });

    describe('Invalid Component IDs', () => {
      const invalidIds = [
        '',
        ' ',
        'component with spaces',
        'component@special',
        'component#hash',
        'component$dollar',
        'component%percent',
        'component&ampersand',
        'component*asterisk',
        'component+plus',
        'component=equals',
        'component[brackets]',
        'component{braces}',
        'component|pipe',
        'component\\backslash',
        'component/slash',
        'component:colon',
        'component;semicolon',
        'component"quote',
        "component'apostrophe",
        'component<less>',
        'component>greater',
        'component,comma',
        'component.period',
        'component?question',
        '   leading-spaces',
        'trailing-spaces   ',
      ];

      invalidIds.forEach(id => {
        it(`should reject "${id}" as invalid`, () => {
          expect(validateComponentId(id)).toBe(false);
        });
      });

      it('should reject null values', () => {
        expect(validateComponentId(null as any)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(validateComponentId(undefined as any)).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(validateComponentId(123 as any)).toBe(false);
        expect(validateComponentId({} as any)).toBe(false);
        expect(validateComponentId([] as any)).toBe(false);
      });

      it('should reject IDs longer than 255 characters', () => {
        const longId = 'a'.repeat(256);
        expect(validateComponentId(longId)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should accept IDs with exactly 255 characters', () => {
        const maxLengthId = 'a'.repeat(255);
        expect(validateComponentId(maxLengthId)).toBe(true);
      });

      it('should accept single character IDs', () => {
        expect(validateComponentId('a')).toBe(true);
        expect(validateComponentId('1')).toBe(true);
        expect(validateComponentId('-')).toBe(true);
        expect(validateComponentId('_')).toBe(true);
      });

      it('should accept IDs starting with numbers', () => {
        expect(validateComponentId('123component')).toBe(true);
      });

      it('should accept IDs starting with hyphens', () => {
        expect(validateComponentId('-component')).toBe(true);
      });

      it('should accept IDs starting with underscores', () => {
        expect(validateComponentId('_component')).toBe(true);
      });
    });
  });

  describe('validateRuntimeSurface', () => {
    function createValidRuntimeSurface(): RiveRuntimeSurface {
      return {
        componentId: 'test-component',
        artboards: [
          {
            name: 'MainArtboard',
            width: 1920,
            height: 1080,
          },
        ],
        stateMachines: [
          {
            name: 'MainStateMachine',
            inputs: [
              { name: 'isActive', type: 'bool', defaultValue: false },
            ],
            layerCount: 1,
          },
        ],
        events: [
          { name: 'Activated' },
        ],
        metadata: {
          fileSize: 1024,
          parseDate: new Date().toISOString(),
          runtimeVersion: 'web-v2.7.1',
        },
      };
    }

    describe('Valid Runtime Surfaces', () => {
      it('should validate complete runtime surface', () => {
        const surface = createValidRuntimeSurface();
        const result = validateRuntimeSurface(surface);

        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should validate runtime surface with multiple artboards', () => {
        const surface = createValidRuntimeSurface();
        surface.artboards.push({
          name: 'SecondArtboard',
          width: 800,
          height: 600,
        });

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(true);
      });

      it('should validate runtime surface with multiple state machines', () => {
        const surface = createValidRuntimeSurface();
        surface.stateMachines.push({
          name: 'SecondStateMachine',
          inputs: [],
          layerCount: 1,
        });

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(true);
      });

      it('should validate runtime surface with data bindings', () => {
        const surface = createValidRuntimeSurface();
        surface.dataBindings = [
          {
            name: 'userData',
            type: 'object',
            path: 'user.data',
          },
        ];

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(true);
      });

      it('should validate runtime surface with event properties', () => {
        const surface = createValidRuntimeSurface();
        surface.events[0].properties = {
          timestamp: 'number',
          userId: 'string',
        };

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid Runtime Surfaces', () => {
      it('should reject null surface', () => {
        const result = validateRuntimeSurface(null);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject undefined surface', () => {
        const result = validateRuntimeSurface(undefined);
        expect(result.valid).toBe(false);
      });

      it('should reject surface without componentId', () => {
        const surface: any = createValidRuntimeSurface();
        delete surface.componentId;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('componentId'))).toBe(true);
      });

      it('should reject surface with invalid componentId', () => {
        const surface = createValidRuntimeSurface();
        surface.componentId = 'invalid@#$%';

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('componentId'))).toBe(true);
      });

      it('should reject surface without artboards array', () => {
        const surface: any = createValidRuntimeSurface();
        delete surface.artboards;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('artboards'))).toBe(true);
      });

      it('should reject surface without state machines array', () => {
        const surface: any = createValidRuntimeSurface();
        delete surface.stateMachines;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('stateMachines'))).toBe(true);
      });

      it('should reject artboard without name', () => {
        const surface = createValidRuntimeSurface();
        surface.artboards[0].name = '' as any;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
      });

      it('should reject artboard with invalid width', () => {
        const surface = createValidRuntimeSurface();
        surface.artboards[0].width = -100;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('width'))).toBe(true);
      });

      it('should reject artboard with zero height', () => {
        const surface = createValidRuntimeSurface();
        surface.artboards[0].height = 0;

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('height'))).toBe(true);
      });

      it('should reject state machine without name', () => {
        const surface = createValidRuntimeSurface();
        surface.stateMachines[0].name = '';

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
      });

      it('should reject state machine with invalid input type', () => {
        const surface = createValidRuntimeSurface();
        surface.stateMachines[0].inputs.push({
          name: 'invalidInput',
          type: 'invalid-type' as any,
          defaultValue: 0,
        });

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
      });

      it('should reject event without name', () => {
        const surface = createValidRuntimeSurface();
        surface.events.push({ name: '' } as any);

        const result = validateRuntimeSurface(surface);
        expect(result.valid).toBe(false);
      });
    });

    describe('Warnings', () => {
      it('should warn about empty artboards array', () => {
        const surface = createValidRuntimeSurface();
        surface.artboards = [];

        const result = validateRuntimeSurface(surface);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('artboards'))).toBe(true);
      });

      it('should warn about empty state machines array', () => {
        const surface = createValidRuntimeSurface();
        surface.stateMachines = [];

        const result = validateRuntimeSurface(surface);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('state machines'))).toBe(true);
      });

      it('should warn about missing metadata', () => {
        const surface: any = createValidRuntimeSurface();
        delete surface.metadata;

        const result = validateRuntimeSurface(surface);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('metadata'))).toBe(true);
      });

      it('should warn about missing events array', () => {
        const surface: any = createValidRuntimeSurface();
        delete surface.events;

        const result = validateRuntimeSurface(surface);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('events'))).toBe(true);
      });
    });
  });

  describe('validateStateMachine', () => {
    function createValidStateMachine(): RiveStateMachine {
      return {
        name: 'TestStateMachine',
        inputs: [
          { name: 'input1', type: 'bool', defaultValue: false },
          { name: 'input2', type: 'number', defaultValue: 0 },
          { name: 'trigger1', type: 'trigger' },
        ],
        layerCount: 2,
        inputCount: 3,
        eventNames: ['Event1', 'Event2'],
      };
    }

    describe('Valid State Machines', () => {
      it('should validate complete state machine', () => {
        const sm = createValidStateMachine();
        const result = validateStateMachine(sm);

        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should validate state machine without optional fields', () => {
        const sm: RiveStateMachine = {
          name: 'MinimalSM',
          inputs: [],
          layerCount: 1,
        };

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(true);
      });

      it('should validate state machine with only bool inputs', () => {
        const sm: RiveStateMachine = {
          name: 'BoolSM',
          inputs: [
            { name: 'flag1', type: 'bool', defaultValue: true },
            { name: 'flag2', type: 'bool', defaultValue: false },
          ],
          layerCount: 1,
        };

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(true);
      });

      it('should validate state machine with only number inputs', () => {
        const sm: RiveStateMachine = {
          name: 'NumberSM',
          inputs: [
            { name: 'value1', type: 'number', defaultValue: 0 },
            { name: 'value2', type: 'number', defaultValue: 100 },
          ],
          layerCount: 1,
        };

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(true);
      });

      it('should validate state machine with only triggers', () => {
        const sm: RiveStateMachine = {
          name: 'TriggerSM',
          inputs: [
            { name: 'trigger1', type: 'trigger' },
            { name: 'trigger2', type: 'trigger' },
          ],
          layerCount: 1,
        };

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid State Machines', () => {
      it('should reject null state machine', () => {
        const result = validateStateMachine(null);
        expect(result.valid).toBe(false);
      });

      it('should reject undefined state machine', () => {
        const result = validateStateMachine(undefined);
        expect(result.valid).toBe(false);
      });

      it('should reject state machine without name', () => {
        const sm: any = createValidStateMachine();
        delete sm.name;

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
      });

      it('should reject state machine with empty name', () => {
        const sm = createValidStateMachine();
        sm.name = '';

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(false);
      });

      it('should reject state machine without inputs array', () => {
        const sm: any = createValidStateMachine();
        delete sm.inputs;

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('inputs'))).toBe(true);
      });

      it('should reject input without name', () => {
        const sm = createValidStateMachine();
        sm.inputs.push({ name: '', type: 'bool', defaultValue: false });

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(false);
      });

      it('should reject input with invalid type', () => {
        const sm = createValidStateMachine();
        (sm.inputs as any).push({
          name: 'invalidInput',
          type: 'string',
          defaultValue: 'invalid',
        });

        const result = validateStateMachine(sm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
      });
    });

    describe('Warnings', () => {
      it('should warn about missing layerCount', () => {
        const sm: any = createValidStateMachine();
        delete sm.layerCount;

        const result = validateStateMachine(sm);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('layerCount'))).toBe(true);
      });

      it('should warn about invalid inputCount', () => {
        const sm: any = createValidStateMachine();
        sm.inputCount = 'invalid';

        const result = validateStateMachine(sm);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('inputCount'))).toBe(true);
      });

      it('should warn about invalid eventNames', () => {
        const sm: any = createValidStateMachine();
        sm.eventNames = 'not-an-array';

        const result = validateStateMachine(sm);
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.some(w => w.includes('eventNames'))).toBe(true);
      });
    });
  });

  describe('validateFilePath', () => {
    describe('Valid File Paths', () => {
      const validPaths = [
        '/path/to/file.riv',
        'relative/path/file.riv',
        './file.riv',
        '../file.riv',
        'file.riv',
        '/absolute/path/to/animation.riv',
        'C:\\Windows\\path\\file.riv',
        '/path/with-hyphens/file.riv',
        '/path/with_underscores/file.riv',
        '/path/with.periods/file.riv',
        '/path/with spaces/file.riv',
      ];

      validPaths.forEach(filePath => {
        it(`should validate "${filePath}" as valid`, () => {
          expect(validateFilePath(filePath)).toBe(true);
        });
      });
    });

    describe('Invalid File Paths', () => {
      const invalidPaths = [
        '',
        ' ',
        '/path/to/file.txt',
        '/path/to/file.json',
        '/path/to/file',
        'file',
        '/path/to/file.RIV',
        '/path/to/file.Riv',
        'file.riv.backup',
        '/path/with<invalid>chars/file.riv',
        '/path/with|pipe/file.riv',
        '/path/with"quote/file.riv',
        '/path/with*asterisk/file.riv',
        '/path/with?question/file.riv',
      ];

      invalidPaths.forEach(filePath => {
        it(`should reject "${filePath}" as invalid`, () => {
          expect(validateFilePath(filePath)).toBe(false);
        });
      });

      it('should reject null values', () => {
        expect(validateFilePath(null as any)).toBe(false);
      });

      it('should reject undefined values', () => {
        expect(validateFilePath(undefined as any)).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(validateFilePath(123 as any)).toBe(false);
        expect(validateFilePath({} as any)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should require .riv extension', () => {
        expect(validateFilePath('file.riv')).toBe(true);
        expect(validateFilePath('file.txt')).toBe(false);
        expect(validateFilePath('file')).toBe(false);
      });

      it('should be case-sensitive for extension', () => {
        expect(validateFilePath('file.riv')).toBe(true);
        expect(validateFilePath('file.RIV')).toBe(false);
        expect(validateFilePath('file.Riv')).toBe(false);
      });

      it('should allow paths with spaces', () => {
        expect(validateFilePath('/path/with spaces/file.riv')).toBe(true);
      });

      it('should reject paths with control characters', () => {
        expect(validateFilePath('/path/\x00/file.riv')).toBe(false);
        expect(validateFilePath('/path/\x01/file.riv')).toBe(false);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getValidFitModes', () => {
      it('should return array of valid fit modes', () => {
        const fitModes = getValidFitModes();

        expect(Array.isArray(fitModes)).toBe(true);
        expect(fitModes.length).toBeGreaterThan(0);

        // Should contain all expected fit modes
        expect(fitModes).toContain('cover');
        expect(fitModes).toContain('contain');
        expect(fitModes).toContain('fill');
        expect(fitModes).toContain('fitWidth');
        expect(fitModes).toContain('fitHeight');
        expect(fitModes).toContain('none');
        expect(fitModes).toContain('scaleDown');
      });

      it('should return a new array (not modify internal state)', () => {
        const fitModes1 = getValidFitModes();
        const fitModes2 = getValidFitModes();

        expect(fitModes1).toEqual(fitModes2);
        expect(fitModes1).not.toBe(fitModes2); // Different array instances
      });
    });

    describe('getValidAlignments', () => {
      it('should return array of valid alignments', () => {
        const alignments = getValidAlignments();

        expect(Array.isArray(alignments)).toBe(true);
        expect(alignments.length).toBeGreaterThan(0);

        // Should contain all expected alignments
        expect(alignments).toContain('center');
        expect(alignments).toContain('topLeft');
        expect(alignments).toContain('topCenter');
        expect(alignments).toContain('topRight');
        expect(alignments).toContain('centerLeft');
        expect(alignments).toContain('centerRight');
        expect(alignments).toContain('bottomLeft');
        expect(alignments).toContain('bottomCenter');
        expect(alignments).toContain('bottomRight');
      });

      it('should return a new array (not modify internal state)', () => {
        const alignments1 = getValidAlignments();
        const alignments2 = getValidAlignments();

        expect(alignments1).toEqual(alignments2);
        expect(alignments1).not.toBe(alignments2); // Different array instances
      });
    });
  });
});
