#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RIV_FILE = resolve(__dirname, 'tests/integration/fixtures/vehicles.riv');
const serverPath = join(__dirname, 'dist/index.js');

console.log('Starting MCP server with debug logging...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'], // Show stderr
  env: { ...process.env, LOG_LEVEL: 'debug' }
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.on('exit', (code, signal) => {
  console.log(`Server exited: code=${code}, signal=${signal}`);
  process.exit(code || 0);
});

setTimeout(() => {
  console.log('\nSending import request...\n');
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'import_rive_file',
      arguments: {
        filePath: RIV_FILE,
        libraryId: 'test-lib',
        componentId: 'test-component'
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

setTimeout(() => {
  console.log('\nTimeout - killing server');
  server.kill();
}, 10000);

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
