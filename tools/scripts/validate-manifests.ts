#!/usr/bin/env node

/**
 * Validate all component and library manifests
 */

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';

const MONOREPO_ROOT = path.resolve(__dirname, '../..');
const MANIFESTS_DIR = path.join(MONOREPO_ROOT, 'data/manifests');
const COMPONENTS_DIR = path.join(MANIFESTS_DIR, 'components');
const LIBRARIES_DIR = path.join(MANIFESTS_DIR, 'libraries');
const ASSETS_DIR = path.join(MONOREPO_ROOT, 'data/assets');

interface ValidationError {
  file: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

const errors: ValidationError[] = [];
const componentIds = new Set<string>();

function addError(file: string, field: string, message: string, severity: 'error' | 'warning' = 'error') {
  errors.push({ file, field, message, severity });
}

function validateComponentManifest(filePath: string, verbose: boolean) {
  const fileName = path.basename(filePath);

  if (verbose) {
    console.log(`\n📄 Validating: ${fileName}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const manifest = JSON.parse(content);

    // Required fields
    if (!manifest.id) {
      addError(fileName, 'id', 'Missing required field: id');
    } else {
      if (componentIds.has(manifest.id)) {
        addError(fileName, 'id', `Duplicate component ID: ${manifest.id}`);
      }
      componentIds.add(manifest.id);
    }

    if (!manifest.name) {
      addError(fileName, 'name', 'Missing required field: name');
    }

    if (!manifest.version) {
      addError(fileName, 'version', 'Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      addError(fileName, 'version', 'Invalid version format (should be X.Y.Z)', 'warning');
    }

    if (!manifest.description) {
      addError(fileName, 'description', 'Missing required field: description', 'warning');
    }

    if (!manifest.category) {
      addError(fileName, 'category', 'Missing required field: category', 'warning');
    }

    // Validate asset
    if (!manifest.asset) {
      addError(fileName, 'asset', 'Missing required field: asset');
    } else {
      if (!manifest.asset.rivePath) {
        addError(fileName, 'asset.rivePath', 'Missing required field: asset.rivePath');
      } else {
        // Check if file exists
        const assetPath = path.join(ASSETS_DIR, manifest.asset.rivePath);
        if (!fs.existsSync(assetPath)) {
          addError(fileName, 'asset.rivePath', `Asset file not found: ${manifest.asset.rivePath}`, 'warning');
        }
      }

      if (typeof manifest.asset.fileSize !== 'number') {
        addError(fileName, 'asset.fileSize', 'Invalid or missing fileSize', 'warning');
      }

      if (!Array.isArray(manifest.asset.artboards)) {
        addError(fileName, 'asset.artboards', 'artboards should be an array', 'warning');
      }
    }

    // Validate state machines
    if (!Array.isArray(manifest.stateMachines)) {
      addError(fileName, 'stateMachines', 'stateMachines should be an array');
    } else if (manifest.stateMachines.length === 0) {
      addError(fileName, 'stateMachines', 'At least one state machine is required', 'warning');
    } else {
      manifest.stateMachines.forEach((sm: any, index: number) => {
        if (!sm.name) {
          addError(fileName, `stateMachines[${index}].name`, 'Missing state machine name');
        }

        if (!Array.isArray(sm.inputs)) {
          addError(fileName, `stateMachines[${index}].inputs`, 'inputs should be an array');
        } else {
          sm.inputs.forEach((input: any, inputIndex: number) => {
            if (!input.name) {
              addError(fileName, `stateMachines[${index}].inputs[${inputIndex}].name`, 'Missing input name');
            }

            if (!input.type) {
              addError(fileName, `stateMachines[${index}].inputs[${inputIndex}].type`, 'Missing input type');
            } else if (!['bool', 'number', 'trigger'].includes(input.type)) {
              addError(
                fileName,
                `stateMachines[${index}].inputs[${inputIndex}].type`,
                `Invalid input type: ${input.type} (must be: bool, number, or trigger)`
              );
            }
          });
        }

        if (!Array.isArray(sm.events)) {
          addError(fileName, `stateMachines[${index}].events`, 'events should be an array', 'warning');
        }
      });
    }

    // Validate data bindings (optional)
    if (manifest.dataBindings && !Array.isArray(manifest.dataBindings)) {
      addError(fileName, 'dataBindings', 'dataBindings should be an array');
    }

    // Validate metadata (optional but recommended)
    if (!manifest.metadata) {
      addError(fileName, 'metadata', 'Missing metadata field', 'warning');
    }

    if (verbose && errors.filter(e => e.file === fileName).length === 0) {
      console.log('   ✅ Valid');
    }
  } catch (error: any) {
    addError(fileName, 'json', `Invalid JSON: ${error.message}`);
  }
}

function validateLibraryManifest(filePath: string, verbose: boolean) {
  const fileName = path.basename(filePath);

  if (verbose) {
    console.log(`\n📚 Validating library: ${fileName}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const manifest = JSON.parse(content);

    // Required fields
    if (!manifest.id) {
      addError(fileName, 'id', 'Missing required field: id');
    }

    if (!manifest.name) {
      addError(fileName, 'name', 'Missing required field: name');
    }

    if (!manifest.version) {
      addError(fileName, 'version', 'Missing required field: version');
    }

    if (!Array.isArray(manifest.components)) {
      addError(fileName, 'components', 'components should be an array');
    } else {
      // Check if referenced components exist
      manifest.components.forEach((componentId: string, index: number) => {
        if (!componentIds.has(componentId)) {
          addError(
            fileName,
            `components[${index}]`,
            `Referenced component not found: ${componentId}`,
            'warning'
          );
        }
      });
    }

    if (verbose && errors.filter(e => e.file === fileName).length === 0) {
      console.log('   ✅ Valid');
    }
  } catch (error: any) {
    addError(fileName, 'json', `Invalid JSON: ${error.message}`);
  }
}

function validateManifestIndex(verbose: boolean) {
  const indexPath = path.join(MANIFESTS_DIR, 'index.json');

  if (!fs.existsSync(indexPath)) {
    addError('index.json', 'file', 'Manifest index not found. Run "npm run update-manifest-index"', 'warning');
    return;
  }

  if (verbose) {
    console.log('\n📑 Validating manifest index...');
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(content);

    if (!Array.isArray(index.components)) {
      addError('index.json', 'components', 'components should be an array');
    }

    if (!Array.isArray(index.libraries)) {
      addError('index.json', 'libraries', 'libraries should be an array');
    }

    if (verbose) {
      console.log(`   Components: ${index.components.length}`);
      console.log(`   Libraries: ${index.libraries.length}`);
    }
  } catch (error: any) {
    addError('index.json', 'json', `Invalid JSON: ${error.message}`);
  }
}

function main() {
  program
    .name('validate-manifests')
    .description('Validate all component and library manifests')
    .option('-v, --verbose', 'Verbose output')
    .parse(process.argv);

  const options = program.opts();

  console.log('\n🔍 Validating manifests...\n');

  // Validate components
  if (fs.existsSync(COMPONENTS_DIR)) {
    const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${componentFiles.length} component manifest(s)`);

    componentFiles.forEach(file => {
      validateComponentManifest(path.join(COMPONENTS_DIR, file), options.verbose);
    });
  } else {
    console.log('⚠️  Components directory not found');
  }

  // Validate libraries
  if (fs.existsSync(LIBRARIES_DIR)) {
    const libraryFiles = fs.readdirSync(LIBRARIES_DIR).filter(f => f.endsWith('.json'));
    console.log(`\nFound ${libraryFiles.length} library manifest(s)`);

    libraryFiles.forEach(file => {
      validateLibraryManifest(path.join(LIBRARIES_DIR, file), options.verbose);
    });
  }

  // Validate index
  validateManifestIndex(options.verbose);

  // Report results
  console.log('\n' + '='.repeat(60));

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  if (errors.length === 0) {
    console.log('\n✅ All manifests are valid!\n');
    process.exit(0);
  } else {
    console.log('\n📋 Validation Results:\n');

    const errorsByFile = errors.reduce((acc, error) => {
      if (!acc[error.file]) {
        acc[error.file] = [];
      }
      acc[error.file].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    Object.keys(errorsByFile).forEach(file => {
      console.log(`\n${file}:`);
      errorsByFile[file].forEach(error => {
        const icon = error.severity === 'error' ? '❌' : '⚠️ ';
        console.log(`   ${icon} ${error.field}: ${error.message}`);
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`\n${errorCount} error(s), ${warningCount} warning(s)\n`);

    if (errorCount > 0) {
      process.exit(1);
    }
  }
}

main();
