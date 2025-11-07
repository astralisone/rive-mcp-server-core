#!/usr/bin/env node

/**
 * Generate a component manifest from a Rive file
 * Can be run from any directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';

interface RiveFileInfo {
  path: string;
  fileName: string;
  fileSize: number;
  exists: boolean;
}

interface ComponentManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  asset: {
    rivePath: string;
    fileSize: number;
    artboards: Array<{ name: string; width: number; height: number }>;
  };
  stateMachines: Array<{
    name: string;
    inputs: Array<{
      name: string;
      type: 'bool' | 'number' | 'trigger';
      description: string;
      defaultValue?: any;
    }>;
    events: Array<{
      name: string;
      description: string;
    }>;
  }>;
  dataBindings?: Array<{
    name: string;
    type: 'text' | 'image' | 'array' | 'object';
    description: string;
  }>;
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    library?: string;
  };
}

// Get the monorepo root (where this script is located)
const MONOREPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_MANIFESTS_DIR = path.join(MONOREPO_ROOT, 'data/manifests/components');
const DEFAULT_ASSETS_DIR = path.join(MONOREPO_ROOT, 'data/assets/rive');

function getRiveFileInfo(filePath: string): RiveFileInfo {
  const resolvedPath = path.resolve(filePath);
  const fileName = path.basename(resolvedPath, '.riv');

  let fileSize = 0;
  let exists = false;

  if (fs.existsSync(resolvedPath)) {
    exists = true;
    const stats = fs.statSync(resolvedPath);
    fileSize = stats.size;
  }

  return {
    path: resolvedPath,
    fileName,
    fileSize,
    exists
  };
}

function generateComponentId(fileName: string, library?: string): string {
  const kebabCase = fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return library ? `${library}-${kebabCase}` : kebabCase;
}

function generateManifestTemplate(
  fileInfo: RiveFileInfo,
  options: {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    library?: string;
    author?: string;
  }
): ComponentManifest {
  const id = options.id || generateComponentId(fileInfo.fileName, options.library);
  const name = options.name || fileInfo.fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const now = new Date().toISOString();

  return {
    id,
    name,
    version: '1.0.0',
    description: options.description || `${name} Rive component`,
    category: options.category || 'uncategorized',
    tags: options.tags || [],
    asset: {
      rivePath: `rive/${fileInfo.fileName}.riv`,
      fileSize: fileInfo.fileSize,
      artboards: [
        {
          name: 'MainArtboard',
          width: 400,
          height: 400
        }
      ]
    },
    stateMachines: [
      {
        name: 'MainStateMachine',
        inputs: [
          {
            name: 'isActive',
            type: 'bool',
            description: 'Whether the component is active',
            defaultValue: false
          }
        ],
        events: [
          {
            name: 'AnimationComplete',
            description: 'Fired when animation completes'
          }
        ]
      }
    ],
    metadata: {
      author: options.author || 'Unknown',
      createdAt: now,
      updatedAt: now,
      ...(options.library && { library: options.library })
    }
  };
}

async function promptForDetails(): Promise<Partial<ComponentManifest>> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => readline.question(query, resolve));
  };

  console.log('\n📝 Let\'s add some details about your component:\n');

  const name = await question('Component name (e.g., "My Button"): ');
  const description = await question('Description: ');
  const category = await question('Category (e.g., "ui-elements", "game-elements"): ');
  const tagsInput = await question('Tags (comma-separated, e.g., "button,interactive,ui"): ');
  const author = await question('Author name: ');
  const library = await question('Library ID (optional, press enter to skip): ');

  readline.close();

  return {
    name: name || undefined,
    description: description || undefined,
    category: category || undefined,
    tags: tagsInput ? tagsInput.split(',').map(t => t.trim()) : undefined,
    metadata: {
      author: author || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      library: library || undefined
    }
  };
}

async function copyRiveFile(sourcePath: string, targetDir: string): Promise<string> {
  const fileName = path.basename(sourcePath);
  const targetPath = path.join(targetDir, fileName);

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy file
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`✅ Copied Rive file to: ${targetPath}`);

  return targetPath;
}

async function main() {
  program
    .name('generate-manifest')
    .description('Generate a component manifest from a Rive file')
    .requiredOption('-f, --file <path>', 'Path to the .riv file')
    .option('-i, --id <id>', 'Component ID (auto-generated if not provided)')
    .option('-n, --name <name>', 'Component name')
    .option('-d, --description <desc>', 'Component description')
    .option('-c, --category <category>', 'Component category')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-l, --library <library>', 'Library ID to add this component to')
    .option('-a, --author <author>', 'Author name')
    .option('-o, --output <path>', 'Output manifest file path')
    .option('--interactive', 'Interactive mode with prompts')
    .option('--copy', 'Copy Rive file to monorepo assets directory')
    .option('--no-copy', 'Do not copy file (just generate manifest)')
    .parse(process.argv);

  const options = program.opts();

  // Validate Rive file
  const fileInfo = getRiveFileInfo(options.file);

  if (!fileInfo.exists) {
    console.error(`❌ Error: Rive file not found: ${options.file}`);
    process.exit(1);
  }

  console.log(`\n🎨 Found Rive file: ${fileInfo.fileName}.riv`);
  console.log(`📦 File size: ${(fileInfo.fileSize / 1024).toFixed(2)} KB\n`);

  // Get details (interactive or from options)
  let manifestOptions = {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
    library: options.library,
    author: options.author
  };

  if (options.interactive) {
    const interactiveDetails = await promptForDetails();
    manifestOptions = {
      ...manifestOptions,
      ...interactiveDetails,
      ...(interactiveDetails.metadata && {
        author: interactiveDetails.metadata.author,
        library: interactiveDetails.metadata.library
      })
    };
  }

  // Generate manifest
  const manifest = generateManifestTemplate(fileInfo, manifestOptions);

  // Determine output path
  let outputPath = options.output;
  if (!outputPath) {
    if (!fs.existsSync(DEFAULT_MANIFESTS_DIR)) {
      fs.mkdirSync(DEFAULT_MANIFESTS_DIR, { recursive: true });
    }
    outputPath = path.join(DEFAULT_MANIFESTS_DIR, `${manifest.id}.json`);
  }

  // Write manifest
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Manifest created: ${outputPath}\n`);

  // Copy Rive file if requested
  if (options.copy !== false) {
    try {
      await copyRiveFile(fileInfo.path, DEFAULT_ASSETS_DIR);
    } catch (error) {
      console.error(`⚠️  Warning: Could not copy Rive file: ${error}`);
    }
  }

  // Print summary
  console.log('📋 Manifest Summary:');
  console.log(`   ID: ${manifest.id}`);
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Category: ${manifest.category}`);
  if (manifest.tags.length > 0) {
    console.log(`   Tags: ${manifest.tags.join(', ')}`);
  }
  if (manifest.metadata.library) {
    console.log(`   Library: ${manifest.metadata.library}`);
  }

  console.log('\n⚠️  Note: This is a template manifest. You should:');
  console.log('   1. Open the manifest file and add actual state machine details');
  console.log('   2. Define inputs, events, and data bindings from your Rive file');
  console.log('   3. Update artboard dimensions');
  console.log('   4. Run "npm run update-manifest-index" to register the component');
  console.log('   5. Run "npm run validate-manifests" to verify\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
