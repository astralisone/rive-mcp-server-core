#!/usr/bin/env node
/**
 * Test script to manually invoke MCP server tools and watch logs
 * Run with: LOG_LEVEL=debug node test-server.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'src', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr (inherit stderr to see logs)
  env: {
    ...process.env,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  }
});

console.log('🚀 MCP Server started with PID:', server.pid);
console.log('📋 Log level:', process.env.LOG_LEVEL || 'info');
console.log('📡 Sending test requests...\n');

// Helper to send JSON-RPC requests
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };

  console.log('→ Sending:', method);
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Collect stdout responses
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();

  // Try to parse complete JSON objects
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('← Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('← Raw:', line);
      }
    }
  }
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('exit', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
  process.exit(code);
});

// Wait for server to start, then send test requests
setTimeout(() => {
  // 1. List tools
  sendRequest('tools/list');

  // 2. List libraries after a delay
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'list_libraries',
      arguments: {}
    });
  }, 1000);

  // 3. List components after another delay
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'list_components',
      arguments: {}
    });
  }, 2000);

  // Exit after tests
  setTimeout(() => {
    console.log('\n✅ Tests complete, shutting down...');
    server.kill();
  }, 4000);

}, 500);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.kill();
  process.exit(0);
});
