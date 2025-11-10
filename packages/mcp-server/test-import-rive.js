#!/usr/bin/env node
/**
 * Simple test: Import a real .riv file and show the results
 * Run with: node test-import-rive.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REAL_RIV_FILE = resolve(__dirname, 'tests/integration/fixtures/vehicles.riv');

console.log('🎯 Testing import_rive_file with real .riv file');
console.log('📁 File:', REAL_RIV_FILE);
console.log();

// Start server
const serverPath = join(__dirname, 'dist', 'src', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, LOG_LEVEL: 'error' }
});

// Capture all output
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
});

server.stderr.on('data', (data) => {
  // Ignore stderr (warnings, etc)
});

// Send request after server starts
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'import_rive_file',
      arguments: {
        filePath: REAL_RIV_FILE,
        libraryId: 'vehicles-library',
        componentId: 'vehicles-component',
        componentName: 'Vehicles Animation'
      }
    }
  };

  console.log('📤 Sending request:');
  console.log(JSON.stringify(request, null, 2));
  console.log();

  server.stdin.write(JSON.stringify(request) + '\n');

  // Wait for response
  setTimeout(() => {
    console.log('📥 Raw response buffer:');
    console.log('─'.repeat(80));

    const lines = buffer.split('\n').filter(l => l.trim());
    lines.forEach((line, i) => {
      try {
        const parsed = JSON.parse(line);
        console.log(`Response ${i + 1}:`);
        console.log(JSON.stringify(parsed, null, 2));
        console.log();

        // If this is our import response, show parsed content
        if (parsed.id === 1 && parsed.result) {
          console.log('✅ Import Result:');
          console.log('─'.repeat(80));

          // Try to parse if it's a string
          let result = parsed.result;
          if (typeof result === 'string') {
            try {
              result = JSON.parse(result);
            } catch (e) {
              // Keep as string
            }
          }

          if (result.content && Array.isArray(result.content)) {
            const content = result.content[0];
            if (content.type === 'text') {
              try {
                const data = JSON.parse(content.text);
                console.log('Component ID:', data.componentId);
                console.log('Library ID:', data.libraryId);
                console.log('Artboards:', data.artboards?.length || 0);
                if (data.artboards) {
                  data.artboards.forEach(ab => {
                    console.log(`  - ${ab.name} (${ab.width}x${ab.height})`);
                  });
                }
                console.log('State Machines:', data.stateMachines?.length || 0);
                if (data.stateMachines) {
                  data.stateMachines.forEach(sm => {
                    console.log(`  - ${sm.name} (${sm.inputs?.length || 0} inputs)`);
                    sm.inputs?.forEach(input => {
                      console.log(`    • ${input.name} (${input.type})`);
                    });
                  });
                }
                console.log('Events:', data.events?.length || 0);
                console.log('Runtime Version:', data.metadata?.runtimeVersion || 'unknown');
                console.log();
              } catch (e) {
                console.log('Text content:', content.text);
              }
            }
          } else {
            console.log(JSON.stringify(result, null, 2));
          }
        }
      } catch (e) {
        console.log(`Line ${i + 1} (not JSON):`, line);
      }
    });

    console.log('─'.repeat(80));
    server.kill();
    setTimeout(() => process.exit(0), 500);
  }, 3000);
}, 1000);

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
