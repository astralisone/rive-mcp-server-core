#!/usr/bin/env node

/**
 * Batch import multiple Rive files from a directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import { execSync } from 'child_process';

const MONOREPO_ROOT = path.resolve(__dirname, '../..');

interface ImportResult {
  file: string;
  manifestPath: string;
  componentId: string;
  success: boolean;
  error?: string;
}

function findRiveFiles(dir: string, recursive: boolean = false): string[] {
  const riveFiles: string[] = [];

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory() && recursive) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.riv')) {
        riveFiles.push(fullPath);
      }
    }
  }

  scan(dir);
  return riveFiles;
}

async function importSingleFile(
  filePath: string,
  options: {
    library?: string;
    category?: string;
    author?: string;
    tags?: string;
    copy: boolean;
  }
): Promise<ImportResult> {
  const fileName = path.basename(filePath, '.riv');

  try {
    // Build generate-manifest command
    const generateScript = path.join(__dirname, 'generate-manifest.ts');
    let cmd = `ts-node "${generateScript}" --file "${filePath}"`;

    if (options.library) {
      cmd += ` --library "${options.library}"`;
    }

    if (options.category) {
      cmd += ` --category "${options.category}"`;
    }

    if (options.author) {
      cmd += ` --author "${options.author}"`;
    }

    if (options.tags) {
      cmd += ` --tags "${options.tags}"`;
    }

    if (options.copy) {
      cmd += ` --copy`;
    } else {
      cmd += ` --no-copy`;
    }

    // Execute
    const output = execSync(cmd, {
      cwd: MONOREPO_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    // Parse output to get component ID
    const idMatch = output.match(/ID:\s+(\S+)/);
    const componentId = idMatch ? idMatch[1] : fileName;

    const manifestPath = path.join(MONOREPO_ROOT, 'data/manifests/components', `${componentId}.json`);

    return {
      file: filePath,
      manifestPath,
      componentId,
      success: true
    };
  } catch (error: any) {
    return {
      file: filePath,
      manifestPath: '',
      componentId: '',
      success: false,
      error: error.message
    };
  }
}

async function createLibraryManifest(
  libraryId: string,
  componentIds: string[],
  options: {
    name?: string;
    description?: string;
    author?: string;
  }
) {
  const librariesDir = path.join(MONOREPO_ROOT, 'data/manifests/libraries');

  if (!fs.existsSync(librariesDir)) {
    fs.mkdirSync(librariesDir, { recursive: true });
  }

  const libraryPath = path.join(librariesDir, `${libraryId}.json`);
  const now = new Date().toISOString();

  const libraryManifest = {
    id: libraryId,
    name: options.name || libraryId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    version: '1.0.0',
    description: options.description || `Collection of ${componentIds.length} components`,
    tags: ['batch-import'],
    components: componentIds,
    metadata: {
      author: options.author || 'Unknown',
      createdAt: now,
      updatedAt: now
    }
  };

  fs.writeFileSync(libraryPath, JSON.stringify(libraryManifest, null, 2));
  console.log(`\n✅ Library manifest created: ${libraryPath}`);
}

async function main() {
  program
    .name('batch-import')
    .description('Batch import multiple Rive files from a directory')
    .requiredOption('-d, --dir <path>', 'Directory containing .riv files')
    .option('-r, --recursive', 'Scan subdirectories recursively')
    .option('-l, --library <id>', 'Library ID to group all imported components')
    .option('-c, --category <category>', 'Category for all components')
    .option('-t, --tags <tags>', 'Comma-separated tags for all components')
    .option('-a, --author <author>', 'Author name for all components')
    .option('--copy', 'Copy Rive files to monorepo assets directory (default: true)', true)
    .option('--no-copy', 'Do not copy files, just generate manifests')
    .option('--library-name <name>', 'Custom library name (if using --library)')
    .option('--library-description <desc>', 'Custom library description (if using --library)')
    .parse(process.argv);

  const options = program.opts();

  // Validate directory
  if (!fs.existsSync(options.dir)) {
    console.error(`❌ Error: Directory not found: ${options.dir}`);
    process.exit(1);
  }

  // Find all Rive files
  console.log(`\n🔍 Scanning for Rive files in: ${options.dir}`);
  if (options.recursive) {
    console.log('   (including subdirectories)');
  }

  const riveFiles = findRiveFiles(options.dir, options.recursive);

  if (riveFiles.length === 0) {
    console.log('\n❌ No .riv files found in directory');
    process.exit(1);
  }

  console.log(`\n✅ Found ${riveFiles.length} Rive file(s):\n`);
  riveFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${path.basename(file)}`);
  });

  // Confirm
  console.log(`\n📦 Starting batch import...\n`);

  // Import all files
  const results: ImportResult[] = [];

  for (const file of riveFiles) {
    console.log(`Processing: ${path.basename(file)}...`);

    const result = await importSingleFile(file, {
      library: options.library,
      category: options.category,
      author: options.author,
      tags: options.tags,
      copy: options.copy
    });

    results.push(result);

    if (result.success) {
      console.log(`   ✅ Success: ${result.componentId}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Create library manifest if requested
  const successfulImports = results.filter(r => r.success);

  if (options.library && successfulImports.length > 0) {
    await createLibraryManifest(
      options.library,
      successfulImports.map(r => r.componentId),
      {
        name: options.libraryName,
        description: options.libraryDescription,
        author: options.author
      }
    );
  }

  // Update manifest index
  console.log('\n🔄 Updating manifest index...');
  try {
    execSync('npm run update-manifest-index', {
      cwd: MONOREPO_ROOT,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('⚠️  Warning: Could not update manifest index');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Batch Import Summary:\n');
  console.log(`   Total files: ${riveFiles.length}`);
  console.log(`   Successful: ${successfulImports.length}`);
  console.log(`   Failed: ${results.length - successfulImports.length}`);

  if (options.library) {
    console.log(`   Library: ${options.library}`);
  }

  console.log('\n✅ Batch import complete!\n');

  if (successfulImports.length > 0) {
    console.log('⚠️  Next steps:');
    console.log('   1. Review and update the generated manifests');
    console.log('   2. Add actual state machine details from your Rive files');
    console.log('   3. Run "npm run validate-manifests" to verify');
    console.log('   4. Test components with MCP tools\n');
  }

  if (results.length > successfulImports.length) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
