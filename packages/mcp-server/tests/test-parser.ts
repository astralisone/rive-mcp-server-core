/**
 * Test script for Rive parser
 * Tests the real implementation of riveParser.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import { parseRiveFile } from '../src/utils/riveParser';

/**
 * Download a sample Rive file from Rive CDN
 */
async function downloadSampleRiveFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          await fs.writeFile(outputPath, Buffer.concat(chunks));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Main test function
 */
async function testParser() {
  console.log('Testing Rive Parser Implementation\n');
  console.log('=' .repeat(60));

  // Create test directory
  const testDir = path.join(__dirname, 'integration', 'fixtures');
  await fs.mkdir(testDir, { recursive: true });

  // Download a sample Rive file from Rive's CDN
  const sampleUrl = 'https://cdn.rive.app/animations/vehicles.riv';
  const samplePath = path.join(testDir, 'vehicles.riv');

  try {
    console.log('\n1. Downloading sample Rive file...');
    console.log(`   URL: ${sampleUrl}`);
    await downloadSampleRiveFile(sampleUrl, samplePath);
    console.log(`   Saved to: ${samplePath}`);
    console.log('   Download successful!\n');

    console.log('2. Parsing Rive file...');
    const runtimeSurface = await parseRiveFile(samplePath);
    console.log('   Parsing successful!\n');

    console.log('3. Results:');
    console.log('=' .repeat(60));
    console.log(`\nComponent ID: ${runtimeSurface.componentId}`);

    console.log(`\nArtboards (${runtimeSurface.artboards.length}):`);
    runtimeSurface.artboards.forEach((artboard, index) => {
      console.log(`  ${index + 1}. ${artboard.name}`);
      console.log(`     Dimensions: ${artboard.width} x ${artboard.height}`);
    });

    console.log(`\nState Machines (${runtimeSurface.stateMachines.length}):`);
    runtimeSurface.stateMachines.forEach((sm, index) => {
      console.log(`  ${index + 1}. ${sm.name}`);
      console.log(`     Inputs: ${sm.inputs.length}`);
      sm.inputs.forEach((input) => {
        console.log(`       - ${input.name} (${input.type})${input.defaultValue !== undefined ? `: ${input.defaultValue}` : ''}`);
      });
    });

    console.log(`\nEvents (${runtimeSurface.events.length}):`);
    runtimeSurface.events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.name}`);
      if (Object.keys(event.properties || {}).length > 0) {
        console.log(`     Properties: ${JSON.stringify(event.properties)}`);
      }
    });

    console.log(`\nMetadata:`);
    console.log(`  File Size: ${runtimeSurface.metadata.fileSize} bytes`);
    console.log(`  Runtime Version: ${runtimeSurface.metadata.runtimeVersion}`);
    console.log(`  Parse Date: ${runtimeSurface.metadata.parseDate}`);

    console.log('\n' + '='.repeat(60));
    console.log('All tests passed successfully!');
    console.log('=' .repeat(60) + '\n');

  } catch (error) {
    console.error('\nError during testing:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testParser().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
