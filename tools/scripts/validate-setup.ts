#!/usr/bin/env node
/**
 * Validate Setup Script
 * Verifies that the Rive MCP environment is correctly configured
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string;
}

interface ValidateOptions {
  basePath?: string;
  configPath?: string;
  verbose?: boolean;
}

async function checkFileExists(filePath: string, description: string): Promise<ValidationResult> {
  try {
    await fs.access(filePath);
    return {
      success: true,
      message: `✓ ${description} exists`,
      details: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ ${description} not found`,
      details: filePath,
    };
  }
}

async function checkDirectoryExists(dirPath: string, description: string): Promise<ValidationResult> {
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      return {
        success: true,
        message: `✓ ${description} exists`,
        details: dirPath,
      };
    }
    return {
      success: false,
      message: `✗ ${description} is not a directory`,
      details: dirPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ ${description} not found`,
      details: dirPath,
    };
  }
}

async function checkJsonFile(filePath: string, description: string): Promise<ValidationResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    JSON.parse(content);
    return {
      success: true,
      message: `✓ ${description} is valid JSON`,
      details: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ ${description} is invalid or not found`,
      details: `${filePath}: ${error}`,
    };
  }
}

async function validateSetup(options: ValidateOptions = {}): Promise<void> {
  const basePath = options.basePath || path.join(process.cwd(), 'data');
  const configPath = options.configPath || path.join(process.cwd(), 'config.example.json');
  const verbose = options.verbose ?? true;

  console.log('🔍 Validating Rive MCP Setup...\n');

  const results: ValidationResult[] = [];

  // Check configuration files
  console.log('Checking configuration files...');
  results.push(await checkFileExists(path.join(process.cwd(), '.env.example'), '.env.example'));
  results.push(await checkJsonFile(configPath, 'config.example.json'));
  results.push(await checkJsonFile(path.join(process.cwd(), 'config.s3.example.json'), 'config.s3.example.json'));
  results.push(await checkJsonFile(path.join(process.cwd(), 'config.remote.example.json'), 'config.remote.example.json'));

  // Check directory structure
  console.log('\nChecking directory structure...');
  results.push(await checkDirectoryExists(basePath, 'Data directory'));
  results.push(await checkDirectoryExists(path.join(basePath, 'manifests'), 'Manifests directory'));
  results.push(await checkDirectoryExists(path.join(basePath, 'manifests', 'components'), 'Components directory'));
  results.push(await checkDirectoryExists(path.join(basePath, 'manifests', 'libraries'), 'Libraries directory'));
  results.push(await checkDirectoryExists(path.join(basePath, 'assets'), 'Assets directory'));
  results.push(await checkDirectoryExists(path.join(basePath, '.cache'), 'Cache directory'));

  // Check manifest index
  console.log('\nChecking manifest index...');
  const indexPath = path.join(basePath, 'manifests', 'index.json');
  results.push(await checkJsonFile(indexPath, 'Manifest index'));

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    if (verbose || !result.success) {
      console.log(result.message);
      if (verbose && result.details) {
        console.log(`  ${result.details}`);
      }
    }
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} checks`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log('='.repeat(60) + '\n');

  if (failureCount === 0) {
    console.log('✅ All validation checks passed!\n');
    console.log('Your Rive MCP environment is ready to use.');
    console.log('Start the server with: npm start\n');
  } else {
    console.log('❌ Some validation checks failed.\n');
    console.log('Recommendations:');
    console.log('  1. Run: npm run init-storage (to create missing directories)');
    console.log('  2. Check configuration files in the root directory\n');
    process.exit(1);
  }
}

// CLI execution
const args = process.argv.slice(2);
const options: ValidateOptions = {
  verbose: !args.includes('--quiet'),
};

// Parse arguments
const basePathIndex = args.indexOf('--base-path');
if (basePathIndex !== -1 && args[basePathIndex + 1]) {
  options.basePath = args[basePathIndex + 1];
}

const configPathIndex = args.indexOf('--config');
if (configPathIndex !== -1 && args[configPathIndex + 1]) {
  options.configPath = args[configPathIndex + 1];
}

validateSetup(options).catch((error) => {
  console.error('\n❌ Validation failed with error:', error);
  process.exit(1);
});

export { validateSetup };
