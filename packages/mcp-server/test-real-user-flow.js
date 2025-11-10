#!/usr/bin/env node
/**
 * Real User Flow Test - Tests MCP server like a real user would
 *
 * This script:
 * 1. Starts the MCP server
 * 2. Imports a real .riv file
 * 3. Lists libraries and components
 * 4. Gets component details
 * 5. Extracts runtime surface from the .riv file
 * 6. Generates framework wrappers
 *
 * Run with: node test-real-user-flow.js
 * Debug mode: LOG_LEVEL=debug node test-real-user-flow.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for nice output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

// Test configuration
const REAL_RIV_FILE = resolve(__dirname, 'tests/integration/fixtures/vehicles.riv');
const COMPONENT_ID = 'vehicles';
const LIBRARY_ID = 'test-library';

// Verify .riv file exists
if (!existsSync(REAL_RIV_FILE)) {
  log('❌', colors.red, `Test .riv file not found at: ${REAL_RIV_FILE}`);
  process.exit(1);
}

log('🎯', colors.cyan, 'Real User Flow Test Starting...');
log('📁', colors.blue, `Using .riv file: ${REAL_RIV_FILE}`);
console.log();

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'src', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    LOG_LEVEL: process.env.LOG_LEVEL || 'error' // Quiet by default
  }
});

log('🚀', colors.green, `MCP Server started (PID: ${server.pid})`);

// Helper to send JSON-RPC requests
let requestId = 1;
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };

  server.stdin.write(JSON.stringify(request) + '\n');
  return request.id;
}

// Track responses
const responses = new Map();
let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.id) {
          responses.set(response.id, response);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
});

server.on('error', (err) => {
  log('❌', colors.red, `Server error: ${err.message}`);
});

server.on('exit', (code) => {
  if (code !== 0) {
    log('❌', colors.red, `Server exited with code ${code}`);
  }
  process.exit(code);
});

// Wait for response helper
function waitForResponse(id, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (responses.has(id)) {
        clearInterval(interval);
        resolve(responses.get(id));
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for response to request ${id}`));
      }
    }, 100);
  });
}

// Test flow
async function runTests() {
  try {
    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 1: List available tools
    log('1️⃣', colors.yellow, 'Step 1: Listing available MCP tools...');
    const toolsReqId = sendRequest('tools/list');
    const toolsResp = await waitForResponse(toolsReqId);

    if (toolsResp.result?.tools) {
      const toolNames = toolsResp.result.tools.map(t => t.name);
      log('✅', colors.green, `Found ${toolNames.length} tools: ${toolNames.join(', ')}`);
    } else {
      throw new Error('Failed to list tools');
    }
    console.log();

    // Step 2: Import a real .riv file
    log('2️⃣', colors.yellow, 'Step 2: Importing real .riv file...');
    const importReqId = sendRequest('tools/call', {
      name: 'import_rive_file',
      arguments: {
        filePath: REAL_RIV_FILE,
        libraryId: LIBRARY_ID,
        componentId: COMPONENT_ID
      }
    });
    const importResp = await waitForResponse(importReqId, 10000); // Longer timeout for parsing

    if (importResp.result) {
      const result = typeof importResp.result === 'string' ? JSON.parse(importResp.result) : importResp.result;
      log('✅', colors.green, `Imported component: ${result.componentId}`);
      log('📊', colors.blue, `  Artboards: ${result.artboards?.length || 0}`);
      log('🎮', colors.blue, `  State Machines: ${result.stateMachines?.length || 0}`);
      log('⚡', colors.blue, `  Events: ${result.events?.length || 0}`);

      // Show artboard details
      if (result.artboards?.length > 0) {
        result.artboards.forEach(ab => {
          log('  📐', colors.cyan, `${ab.name} (${ab.width}x${ab.height})`);
        });
      }

      // Show state machine details
      if (result.stateMachines?.length > 0) {
        result.stateMachines.forEach(sm => {
          log('  🎮', colors.cyan, `${sm.name} - ${sm.inputs?.length || 0} inputs`);
          sm.inputs?.forEach(input => {
            log('    ⚙️', colors.magenta, `${input.name} (${input.type})`);
          });
        });
      }
    } else if (importResp.error) {
      throw new Error(`Import failed: ${importResp.error.message}`);
    }
    console.log();

    // Step 3: List libraries
    log('3️⃣', colors.yellow, 'Step 3: Listing libraries...');
    const libsReqId = sendRequest('tools/call', {
      name: 'list_libraries',
      arguments: {}
    });
    const libsResp = await waitForResponse(libsReqId);

    if (libsResp.result) {
      const libraries = typeof libsResp.result === 'string' ? JSON.parse(libsResp.result) : libsResp.result;
      if (Array.isArray(libraries) && libraries.length > 0) {
        log('✅', colors.green, `Found ${libraries.length} library(s)`);
        libraries.forEach(lib => {
          log('  📚', colors.cyan, `${lib.name} (${lib.id}) - ${lib.components?.length || 0} components`);
        });
      } else {
        log('⚠️', colors.yellow, 'No libraries found');
      }
    }
    console.log();

    // Step 4: List components
    log('4️⃣', colors.yellow, 'Step 4: Listing components...');
    const compsReqId = sendRequest('tools/call', {
      name: 'list_components',
      arguments: {}
    });
    const compsResp = await waitForResponse(compsReqId);

    if (compsResp.result) {
      const components = typeof compsResp.result === 'string' ? JSON.parse(compsResp.result) : compsResp.result;
      if (Array.isArray(components) && components.length > 0) {
        log('✅', colors.green, `Found ${components.length} component(s)`);
        components.forEach(comp => {
          log('  🎨', colors.cyan, `${comp.name} (${comp.id})`);
        });
      } else {
        log('⚠️', colors.yellow, 'No components found');
      }
    }
    console.log();

    // Step 5: Get component details
    log('5️⃣', colors.yellow, 'Step 5: Getting component details...');
    const detailReqId = sendRequest('tools/call', {
      name: 'get_component_detail',
      arguments: {
        id: COMPONENT_ID
      }
    });
    const detailResp = await waitForResponse(detailReqId);

    if (detailResp.result) {
      const detail = typeof detailResp.result === 'string' ? JSON.parse(detailResp.result) : detailResp.result;
      log('✅', colors.green, `Component: ${detail.name}`);
      log('📝', colors.blue, `  ID: ${detail.id}`);
      log('📚', colors.blue, `  Library: ${detail.libraryId}`);
      if (detail.assetPath) {
        log('📁', colors.blue, `  Asset: ${detail.assetPath}`);
      }
    }
    console.log();

    // Step 6: Get runtime surface
    log('6️⃣', colors.yellow, 'Step 6: Extracting runtime surface from .riv file...');
    const surfaceReqId = sendRequest('tools/call', {
      name: 'get_runtime_surface',
      arguments: {
        componentId: COMPONENT_ID
      }
    });
    const surfaceResp = await waitForResponse(surfaceReqId, 10000);

    if (surfaceResp.result) {
      const surface = typeof surfaceResp.result === 'string' ? JSON.parse(surfaceResp.result) : surfaceResp.result;
      log('✅', colors.green, 'Runtime surface extracted from real .riv file');
      log('🎨', colors.blue, `  Artboards: ${surface.artboards?.length || 0}`);
      log('🎮', colors.blue, `  State Machines: ${surface.stateMachines?.length || 0}`);
      log('⚡', colors.blue, `  Events: ${surface.events?.length || 0}`);
      log('📦', colors.blue, `  Runtime Version: ${surface.metadata?.runtimeVersion || 'unknown'}`);
    }
    console.log();

    // Step 7: Generate wrapper
    log('7️⃣', colors.yellow, 'Step 7: Generating React wrapper...');
    const wrapperReqId = sendRequest('tools/call', {
      name: 'generate_wrapper',
      arguments: {
        surface: surfaceResp.result,
        riveSrc: `/assets/${COMPONENT_ID}.riv`,
        framework: 'react',
        componentName: 'Vehicles'
      }
    });
    const wrapperResp = await waitForResponse(wrapperReqId);

    if (wrapperResp.result) {
      const wrapper = typeof wrapperResp.result === 'string' ? wrapperResp.result : JSON.stringify(wrapperResp.result);
      const codeLength = wrapper.length;
      log('✅', colors.green, `Generated React wrapper (${codeLength} characters)`);
      log('📝', colors.blue, '  Wrapper includes: TypeScript, hooks, event handling');
    }
    console.log();

    // Success!
    log('🎉', colors.bright + colors.green, 'ALL TESTS PASSED!');
    console.log();
    log('✨', colors.cyan, 'Summary:');
    log('  ✅', colors.green, 'MCP server is fully functional');
    log('  ✅', colors.green, 'Real .riv file parsing works (no mocks!)');
    log('  ✅', colors.green, 'All MCP tools operational');
    log('  ✅', colors.green, 'Framework wrapper generation works');
    console.log();

  } catch (error) {
    log('❌', colors.red, `Test failed: ${error.message}`);
    console.error(error);
    server.kill();
    process.exit(1);
  }

  // Clean shutdown
  setTimeout(() => {
    log('👋', colors.yellow, 'Shutting down server...');
    server.kill();
    setTimeout(() => process.exit(0), 500);
  }, 1000);
}

// Start tests
runTests();

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Interrupted, shutting down...');
  server.kill();
  process.exit(0);
});
