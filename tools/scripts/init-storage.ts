#!/usr/bin/env node
/**
 * Initialize Storage Script
 * Creates necessary directories and initializes storage for local development
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface InitOptions {
  basePath?: string;
  verbose?: boolean;
}

async function createDirectory(dirPath: string, verbose: boolean = false): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    if (verbose) {
      console.log(`✓ Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

async function createEmptyIndex(filePath: string, verbose: boolean = false): Promise<void> {
  const emptyIndex = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    libraries: {},
    components: {}
  };

  try {
    await fs.writeFile(filePath, JSON.stringify(emptyIndex, null, 2));
    if (verbose) {
      console.log(`✓ Created empty index: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create index ${filePath}:`, error);
    throw error;
  }
}

async function initStorage(options: InitOptions = {}): Promise<void> {
  const basePath = options.basePath || path.join(process.cwd(), 'data');
  const verbose = options.verbose ?? true;

  console.log('🚀 Initializing Rive MCP Storage...\n');
  console.log(`Base path: ${basePath}\n`);

  // Create directory structure
  const directories = [
    basePath,
    path.join(basePath, 'manifests'),
    path.join(basePath, 'manifests', 'components'),
    path.join(basePath, 'manifests', 'libraries'),
    path.join(basePath, 'assets'),
    path.join(basePath, 'assets', 'rive'),
    path.join(basePath, '.cache'),
    path.join(basePath, '.cache', 'manifests'),
    path.join(basePath, '.cache', 'assets'),
  ];

  console.log('Creating directory structure...');
  for (const dir of directories) {
    await createDirectory(dir, verbose);
  }

  // Create empty manifest index
  console.log('\nInitializing manifest index...');
  const indexPath = path.join(basePath, 'manifests', 'index.json');
  await createEmptyIndex(indexPath, verbose);

  // Create .gitkeep files for empty directories
  console.log('\nCreating .gitkeep files...');
  const gitkeepDirs = [
    path.join(basePath, 'assets', 'rive'),
    path.join(basePath, '.cache', 'manifests'),
    path.join(basePath, '.cache', 'assets'),
  ];

  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(dir, '.gitkeep');
    await fs.writeFile(gitkeepPath, '');
    if (verbose) {
      console.log(`✓ Created .gitkeep: ${gitkeepPath}`);
    }
  }

  console.log('\n✅ Storage initialization complete!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run validate-setup (to verify configuration)');
  console.log('  2. Start the MCP server: npm start\n');
}

// CLI execution
const args = process.argv.slice(2);
const options: InitOptions = {
  verbose: !args.includes('--quiet'),
};

// Parse --base-path argument
const basePathIndex = args.indexOf('--base-path');
if (basePathIndex !== -1 && args[basePathIndex + 1]) {
  options.basePath = args[basePathIndex + 1];
}

initStorage(options).catch((error) => {
  console.error('\n❌ Storage initialization failed:', error);
  process.exit(1);
});

export { initStorage };
