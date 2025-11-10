/**
 * Integration Tests for Response Formatting System
 *
 * Tests Phase 1 response formatting enhancements:
 * - Table formatting with borders and icons
 * - Hierarchical formatting for detail views
 * - Error response formatting
 * - Metadata timestamps and durations
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { BOX, ICONS, formatTableResponse, formatHierarchical, formatError, formatMetadata, TableRow } from '../../src/utils/responseFormatter';
import { RiveLibrary, MCPToolResponse, RiveComponent } from '../../src/types';

describe('Response Formatting Integration Tests', () => {
  let testLibrary: RiveLibrary;
  let testComponents: RiveComponent[];

  beforeAll(() => {
    // Create test components
    const testComponent1: RiveComponent = {
      id: 'test-component-1',
      libraryId: 'test-formatting-lib',
      name: 'Test Component 1',
      description: 'Component for testing formatting',
      filePath: '/test/fixtures/vehicles.riv',
      artboardName: 'TestArtboard',
      stateMachineName: 'TestStateMachine',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'ui'],
    };

    const testComponent2: RiveComponent = {
      id: 'test-component-2',
      libraryId: 'test-formatting-lib',
      name: 'Test Component 2',
      description: 'Second component for testing',
      filePath: '/test/fixtures/vehicles.riv',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test'],
    };

    testComponents = [testComponent1, testComponent2];

    // Create test library
    testLibrary = {
      id: 'test-formatting-lib',
      name: 'Test Formatting Library',
      version: '1.0.0',
      description: 'Library for testing response formatting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: testComponents,
      tags: ['test', 'formatting'],
    };
  });

  describe('Table Response Formatting', () => {
    it('should return formatted response with table borders', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Status', 'Library ID', 'Name', 'Version', 'Components', 'Tags'],
        [{
          status: ICONS.GREEN_CIRCLE,
          library_id: testLibrary.id,
          name: testLibrary.name,
          version: testLibrary.version,
          components: testLibrary.components.length,
          tags: testLibrary.tags?.join(', ') || '-',
        }],
        {
          title: 'RIVE LIBRARIES',
          summary: `Found 1 library with 2 total components`,
          metadata: { duration: 10 },
        }
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = result.content[0].text;

      // Verify table border characters are present
      expect(text).toContain(BOX.LIGHT_TOP_LEFT);
      expect(text).toContain(BOX.LIGHT_TOP_RIGHT);
      expect(text).toContain(BOX.LIGHT_BOTTOM_LEFT);
      expect(text).toContain(BOX.LIGHT_BOTTOM_RIGHT);
      expect(text).toContain(BOX.LIGHT_HORIZONTAL);
      expect(text).toContain(BOX.LIGHT_VERTICAL);
    });

    it('should include header with title and icons', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Status', 'Name'],
        [{ status: ICONS.GREEN_CIRCLE, name: 'Test' }],
        { title: 'RIVE LIBRARIES' }
      );

      const text = result.content[0].text;

      // Verify header box characters
      expect(text).toContain(BOX.TOP_LEFT);
      expect(text).toContain(BOX.TOP_RIGHT);
      expect(text).toContain(BOX.HORIZONTAL);

      // Verify title is present
      expect(text).toContain('RIVE LIBRARIES');

      // Verify icon is present
      expect(text).toContain(ICONS.LIBRARY);
    });

    it('should include metadata with timing information', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Name'],
        [{ name: 'Test' }],
        { metadata: { duration: 42 } }
      );

      const text = result.content[0].text;

      // Verify timing metadata is present (in the success message)
      expect(text).toContain('ms');
      expect(text).toContain('42ms');
      expect(text).toMatch(/\d+ms/); // Should contain duration in milliseconds
    });

    it('should include summary section', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Name'],
        [{ name: 'Test' }],
        { summary: 'Found 1 library' }
      );

      const text = result.content[0].text;

      expect(text).toContain(ICONS.CHART);
      expect(text).toContain('Summary:');
      expect(text).toContain('Found 1 library');
    });

    it('should include next steps section', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Name'],
        [{ name: 'Test' }],
        {
          nextSteps: [
            'Use list_components to see individual components',
            'Use get_component_detail for detailed information',
          ],
        }
      );

      const text = result.content[0].text;

      expect(text).toContain(ICONS.LIGHTBULB);
      expect(text).toContain('Next Steps:');
      expect(text).toContain('list_components');
      expect(text).toContain('get_component_detail');
    });

    it('should include status icons in table rows', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Status', 'Name'],
        [{ status: ICONS.GREEN_CIRCLE, name: 'Test' }]
      );

      const text = result.content[0].text;
      expect(text).toContain(ICONS.GREEN_CIRCLE);
    });

    it('should format table columns correctly', () => {
      const result = formatTableResponse(
        'RIVE LIBRARIES',
        ['Status', 'Library ID', 'Name', 'Version', 'Components', 'Tags'],
        [{
          status: ICONS.GREEN_CIRCLE,
          library_id: 'test-lib',
          name: 'Test',
          version: '1.0.0',
          components: 2,
          tags: 'test, ui',
        }]
      );

      const text = result.content[0].text;

      // Verify expected column headers
      expect(text).toContain('Status');
      expect(text).toContain('Library ID');
      expect(text).toContain('Name');
      expect(text).toContain('Version');
      expect(text).toContain('Components');
      expect(text).toContain('Tags');
    });
  });

  describe('Hierarchical Response Formatting', () => {
    it('should return hierarchical formatted output', () => {
      const sections = [
        {
          title: 'Component Information',
          icon: ICONS.PACKAGE,
          items: [
            { label: 'ID', value: 'test-component-1' },
            { label: 'Name', value: 'Test Component' },
          ],
        },
      ];

      const result = formatHierarchical('COMPONENT DETAIL', sections, {
        title: 'COMPONENT: Test Component',
        metadata: { duration: 10 },
      });

      expect(result.content).toBeDefined();
      const text = result.content[0].text;

      // Should have header structure
      expect(text).toContain(BOX.TOP_LEFT);
      expect(text).toContain('COMPONENT: Test Component');
    });

    it('should include multiple sections with icons', () => {
      const sections = [
        {
          title: 'Component Information',
          icon: ICONS.PACKAGE,
          items: [{ label: 'ID', value: 'test' }],
        },
        {
          title: 'Library',
          icon: ICONS.LIBRARY,
          items: [{ label: 'Name', value: 'Test Lib' }],
        },
        {
          title: 'Artboard & State Machine',
          icon: ICONS.ART,
          items: [{ label: 'Artboard', value: 'Main' }],
        },
      ];

      const result = formatHierarchical('DETAIL', sections);
      const text = result.content[0].text;

      // Verify different section icons
      expect(text).toContain(ICONS.PACKAGE);
      expect(text).toContain(ICONS.LIBRARY);
      expect(text).toContain(ICONS.ART);
    });

    it('should include key-value pairs with arrows', () => {
      const sections = [
        {
          title: 'Info',
          items: [
            { label: 'ID', value: 'test-123' },
            { label: 'Name', value: 'Test Name' },
          ],
        },
      ];

      const result = formatHierarchical('DETAIL', sections);
      const text = result.content[0].text;

      // Verify arrow icon for key-value pairs
      expect(text).toContain(ICONS.ARROW);
      expect(text).toContain('ID:');
      expect(text).toContain('Name:');
      expect(text).toContain('test-123');
      expect(text).toContain('Test Name');
    });

    it('should include metadata with duration', () => {
      const result = formatHierarchical('DETAIL', [], {
        metadata: { duration: 25 },
      });

      const text = result.content[0].text;
      expect(text).toContain(ICONS.SUCCESS);
      expect(text).toContain('25ms');
    });
  });

  describe('Error Response Formatting', () => {
    it('should format error with red circle icon', () => {
      const result = formatError(
        'getComponentDetail',
        {
          code: 'COMPONENT_NOT_FOUND',
          message: 'Component not found',
        },
        {
          title: 'COMPONENT NOT FOUND',
          metadata: { duration: 10 },
        }
      );

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);

      const text = result.content[0].text;

      // Verify error formatting
      expect(text).toContain(ICONS.ERROR);
      expect(text).toContain(ICONS.RED_CIRCLE);
    });

    it('should include error details with context', () => {
      const result = formatError(
        'getComponentDetail',
        {
          code: 'COMPONENT_NOT_FOUND',
          message: 'Component not found',
        },
        {
          context: {
            'Requested ID': 'test-123',
            'Storage Backend': 'local',
          },
        }
      );

      const text = result.content[0].text;

      // Verify error details section
      expect(text).toContain(ICONS.MEMO);
      expect(text).toContain('Details:');
      expect(text).toContain('Requested ID');
      expect(text).toContain('test-123');
    });

    it('should include suggestions for error resolution', () => {
      const result = formatError(
        'getComponentDetail',
        {
          code: 'COMPONENT_NOT_FOUND',
          message: 'Component not found',
        },
        {
          suggestions: [
            'Check component ID spelling',
            'Use list_components to see available components',
          ],
        }
      );

      const text = result.content[0].text;

      // Verify suggestions section
      expect(text).toContain(ICONS.TOOL);
      expect(text).toContain('Suggestions:');
      expect(text).toContain('1.');
      expect(text).toContain('2.');
      expect(text).toContain('Check component ID spelling');
    });

    it('should include timing even for errors', () => {
      const result = formatError(
        'getComponentDetail',
        {
          code: 'ERROR',
          message: 'Error occurred',
        },
        {
          metadata: { duration: 15 },
        }
      );

      const text = result.content[0].text;
      expect(text).toContain(ICONS.CLOCK);
      expect(text).toContain('15ms');
    });
  });

  describe('Metadata Formatting', () => {
    it('should format duration metadata', () => {
      const result = formatMetadata({ duration: 42 });
      expect(result).toContain(ICONS.CLOCK);
      expect(result).toContain('42ms');
    });

    it('should format counts metadata', () => {
      const result = formatMetadata({
        counts: {
          libraries: 5,
          components: 20,
        },
      });

      expect(result).toContain(ICONS.CHART);
      expect(result).toContain('libraries: 5');
      expect(result).toContain('components: 20');
    });
  });

  describe('Visual Structure and Consistency', () => {
    it('should maintain consistent border width across responses', () => {
      const tableResult = formatTableResponse('TEST', ['Name'], [{ name: 'Test' }]);
      const hierarchicalResult = formatHierarchical('TEST', []);
      const errorResult = formatError('test', { code: 'ERROR', message: 'Error' });

      const tableText = tableResult.content[0].text;
      const hierarchicalText = hierarchicalResult.content[0].text;
      const errorText = errorResult.content[0].text;

      // All should have top borders of same width (60 chars)
      const extractTopBorder = (text: string) => {
        const lines = text.split('\n');
        return lines.find(line => line.startsWith(BOX.TOP_LEFT));
      };

      const tableBorder = extractTopBorder(tableText);
      const hierarchicalBorder = extractTopBorder(hierarchicalText);
      const errorBorder = extractTopBorder(errorText);

      expect(tableBorder?.length).toBe(hierarchicalBorder?.length);
      expect(hierarchicalBorder?.length).toBe(errorBorder?.length);
    });

    it('should use consistent icon placement', () => {
      const result = formatTableResponse(
        'TEST',
        ['Name'],
        [{ name: 'Test' }],
        {
          summary: 'Test summary',
          nextSteps: ['Step 1'],
        }
      );

      const text = result.content[0].text;
      const lines = text.split('\n');

      // Icons should be consistently placed at start of sections
      const iconLines = lines.filter(line =>
        Object.values(ICONS).some(icon => line.includes(icon))
      );

      expect(iconLines.length).toBeGreaterThan(0);

      // Each icon line should have the icon near the start
      iconLines.forEach(line => {
        const iconPosition = Object.values(ICONS).reduce((pos, icon) => {
          const idx = line.indexOf(icon);
          return idx !== -1 && (pos === -1 || idx < pos) ? idx : pos;
        }, -1);

        expect(iconPosition).toBeGreaterThanOrEqual(0);
        expect(iconPosition).toBeLessThan(10); // Icon should be within first 10 chars
      });
    });

    it('should properly format empty results', () => {
      const result = formatTableResponse('TEST', ['Name'], [], {
        summary: 'Found 0 items',
      });

      const text = result.content[0].text;

      // Should still have proper structure even with no results
      expect(text).toContain(BOX.TOP_LEFT);
      expect(text).toContain(ICONS.SUCCESS);
      expect(text).toContain('Found 0');
    });
  });

  describe('Content Type and Structure', () => {
    it('should return array of content objects', () => {
      const result = formatTableResponse('TEST', ['Name'], [{ name: 'Test' }]);

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should have text type for all content objects', () => {
      const result = formatTableResponse('TEST', ['Name'], [{ name: 'Test' }]);

      result.content.forEach(content => {
        expect(content.type).toBe('text');
        expect(typeof content.text).toBe('string');
        expect(content.text.length).toBeGreaterThan(0);
      });
    });

    it('should set isError flag correctly', () => {
      const successResult = formatTableResponse('TEST', ['Name'], [{ name: 'Test' }]);
      const errorResult = formatError('test', { code: 'ERROR', message: 'Error' });

      expect(successResult.isError).toBeUndefined();
      expect(errorResult.isError).toBe(true);
    });
  });
});
