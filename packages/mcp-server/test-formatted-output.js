/**
 * Test script to verify formatted outputs
 */

// Import the formatter utilities
import {
  formatTableResponse,
  formatError,
  formatHierarchical,
  formatSuccess,
  ICONS,
} from './dist/utils/responseFormatter.js';

console.log('\n' + '='.repeat(80));
console.log('TESTING FORMATTED RESPONSE OUTPUTS');
console.log('='.repeat(80) + '\n');

// Test 1: Table Response (listLibraries style)
console.log('TEST 1: Table Response (List Libraries)');
console.log('-'.repeat(80));
const tableResponse = formatTableResponse(
  'RIVE LIBRARIES',
  ['Status', 'Library ID', 'Name', 'Version', 'Components', 'Tags'],
  [
    {
      status: ICONS.GREEN_CIRCLE,
      library_id: 'ui-components',
      name: 'UI Components',
      version: '1.0.0',
      components: 12,
      tags: 'ui, buttons',
    },
    {
      status: ICONS.GREEN_CIRCLE,
      library_id: 'game-assets',
      name: 'Game Assets',
      version: '2.1.0',
      components: 8,
      tags: 'game, sprites',
    },
    {
      status: ICONS.YELLOW_CIRCLE,
      library_id: 'experimental',
      name: 'Experimental',
      version: '0.1.0',
      components: 3,
      tags: 'beta',
    },
  ],
  {
    title: 'RIVE LIBRARIES',
    summary: 'Found 3 libraries with 23 total components',
    metadata: { duration: 87 },
    nextSteps: [
      'Use list_components to see individual components',
      'Use get_component_detail for detailed information',
    ],
  }
);
console.log(tableResponse.content[0].text);

// Test 2: Error Response
console.log('\n\nTEST 2: Error Response (Component Not Found)');
console.log('-'.repeat(80));
const errorResponse = formatError(
  'getComponentDetail',
  {
    code: 'COMPONENT_NOT_FOUND',
    message: 'Component "my-component" does not exist',
  },
  {
    title: 'COMPONENT NOT FOUND',
    context: {
      'Requested ID': 'my-component',
      'Library': 'ui-library',
      'Storage Backend': 'local',
    },
    suggestions: [
      'Check component ID spelling',
      'Use list_components to see available components',
      'Verify component exists in the library',
    ],
    metadata: { duration: 12 },
  }
);
console.log(errorResponse.content[0].text);

// Test 3: Hierarchical Response (Component Detail style)
console.log('\n\nTEST 3: Hierarchical Response (Component Detail)');
console.log('-'.repeat(80));
const hierarchicalResponse = formatHierarchical(
  'COMPONENT DETAIL',
  [
    {
      title: 'Component Information',
      icon: ICONS.PACKAGE,
      items: [
        { label: 'ID', value: 'button-primary' },
        { label: 'Name', value: 'Primary Button' },
        { label: 'Description', value: 'Interactive button with hover states' },
      ],
    },
    {
      title: 'Library',
      icon: ICONS.LIBRARY,
      items: [
        { label: 'ID', value: 'ui-components' },
        { label: 'Name', value: 'UI Components' },
        { label: 'Version', value: '1.0.0' },
      ],
    },
    {
      title: 'State Machine: ButtonSM',
      icon: ICONS.SETTINGS,
      items: [
        { label: 'Layer Count', value: 3 },
        { label: 'Input Count', value: 2 },
      ],
      table: {
        headers: ['Input Name', 'Type', 'Default Value'],
        rows: [
          { input_name: 'isHovered', type: 'bool', default_value: 'false' },
          { input_name: 'isPressed', type: 'bool', default_value: 'false' },
        ],
      },
    },
  ],
  {
    title: 'COMPONENT: Primary Button',
    metadata: { duration: 45 },
  }
);
console.log(hierarchicalResponse.content[0].text);

// Test 4: Success Response
console.log('\n\nTEST 4: Success Response (General)');
console.log('-'.repeat(80));
const successResponse = formatSuccess(
  'generate_wrapper',
  {},
  {
    title: 'WRAPPER GENERATED',
    summary: 'Successfully generated React wrapper component',
    sections: [
      {
        title: 'Generated Files',
        icon: ICONS.FILE,
        content: 'ButtonPrimary.tsx (2.3 KB)\nButtonPrimary.types.ts (0.8 KB)',
      },
      {
        title: 'Code Preview',
        icon: ICONS.SPARKLES,
        content:
          'import { useRive } from "@rive-app/react-canvas";\n\nexport const ButtonPrimary = () => {\n  const { rive, RiveComponent } = useRive(...);\n  return <RiveComponent />;\n};',
      },
    ],
    nextSteps: [
      'Import the component in your application',
      'Add props to control state machine inputs',
      'Style the component wrapper as needed',
    ],
    metadata: { duration: 234 },
  }
);
console.log(successResponse.content[0].text);

console.log('\n' + '='.repeat(80));
console.log('ALL TESTS COMPLETED');
console.log('='.repeat(80) + '\n');
