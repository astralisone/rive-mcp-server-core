#!/usr/bin/env node
/**
 * Seed Manifests Script
 * Populates storage with example manifests and components
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface SeedOptions {
  basePath?: string;
  examplesPath?: string;
  verbose?: boolean;
}

async function copyFile(src: string, dest: string, verbose: boolean = false): Promise<void> {
  try {
    const content = await fs.readFile(src, 'utf-8');
    await fs.writeFile(dest, content);
    if (verbose) {
      console.log(`✓ Copied: ${path.basename(src)} -> ${dest}`);
    }
  } catch (error) {
    console.error(`✗ Failed to copy ${src}:`, error);
    throw error;
  }
}

async function seedManifests(options: SeedOptions = {}): Promise<void> {
  const basePath = options.basePath || path.join(process.cwd(), 'data');
  const examplesPath = options.examplesPath || path.join(process.cwd(), 'libs', 'rive-manifests', 'examples');
  const verbose = options.verbose ?? true;

  console.log('🌱 Seeding Rive MCP Manifests...\n');
  console.log(`Base path: ${basePath}`);
  console.log(`Examples path: ${examplesPath}\n`);

  // Check if examples directory exists
  try {
    await fs.access(examplesPath);
  } catch (error) {
    console.error(`❌ Examples directory not found: ${examplesPath}`);
    console.error('Please ensure the examples directory exists with sample manifests.');
    process.exit(1);
  }

  // Copy component manifests
  console.log('Copying component manifests...');
  const componentExamples = [
    'slot-machine-component.json',
    'loading-spinner-component.json',
    'button-animation-component.json',
    'character-avatar-component.json',
  ];

  const componentsDir = path.join(basePath, 'manifests', 'components');
  for (const example of componentExamples) {
    const src = path.join(examplesPath, example);
    const dest = path.join(componentsDir, example);
    await copyFile(src, dest, verbose);
  }

  // Copy library manifests
  console.log('\nCopying library manifests...');
  const libraryExamples = [
    'astralis-casino-library.json',
    'ui-components-library.json',
  ];

  const librariesDir = path.join(basePath, 'manifests', 'libraries');
  for (const example of libraryExamples) {
    const src = path.join(examplesPath, example);
    const dest = path.join(librariesDir, example);
    await copyFile(src, dest, verbose);
  }

  // Copy manifest index
  console.log('\nCopying manifest index...');
  const indexSrc = path.join(examplesPath, 'manifest-index.json');
  const indexDest = path.join(basePath, 'manifests', 'index.json');
  await copyFile(indexSrc, indexDest, verbose);

  console.log('\n✅ Manifest seeding complete!\n');
  console.log('Seeded data:');
  console.log(`  • ${componentExamples.length} component manifests`);
  console.log(`  • ${libraryExamples.length} library manifests`);
  console.log('  • 1 manifest index\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run validate-setup (to verify configuration)');
  console.log('  2. Start the MCP server: npm start\n');
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    verbose: !args.includes('--quiet'),
  };

  // Parse arguments
  const basePathIndex = args.indexOf('--base-path');
  if (basePathIndex !== -1 && args[basePathIndex + 1]) {
    options.basePath = args[basePathIndex + 1];
  }

  const examplesPathIndex = args.indexOf('--examples-path');
  if (examplesPathIndex !== -1 && args[examplesPathIndex + 1]) {
    options.examplesPath = args[examplesPathIndex + 1];
  }

  seedManifests(options).catch((error) => {
    console.error('\n❌ Manifest seeding failed:', error);
    process.exit(1);
  });
}

export { seedManifests };
