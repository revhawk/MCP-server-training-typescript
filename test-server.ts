import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'child_process';

async function testServer() {
  // Start the server process
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test list_tools
  console.log('Testing list_tools...');
  serverProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'list_tools',
    params: {},
    id: 1
  }) + '\n');

  // Test get_employees
  console.log('\nTesting get_employees...');
  serverProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'call_tool',
    params: {
      name: 'get_employees',
      arguments: {}
    },
    id: 2
  }) + '\n');

  // Test web_search
  console.log('\nTesting web_search...');
  serverProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'call_tool',
    params: {
      name: 'web_search',
      arguments: {
        query: 'TypeScript'
      }
    },
    id: 3
  }) + '\n');

  // Test search_employees
  console.log('\nTesting search_employees...');
  serverProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'call_tool',
    params: {
      name: 'search_employees',
      arguments: {
        department: 'Engineering'
      }
    },
    id: 4
  }) + '\n');

  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    console.log('Server output:', data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Wait for responses
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Clean up
  serverProcess.kill();
}

testServer().catch(console.error); 