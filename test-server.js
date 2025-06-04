import { spawn } from 'child_process';

async function testServer() {
  // Start the server process
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Buffer to collect server output
  let serverOutput = '';

  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('Server output:', output);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Test list_tools
  console.log('\nTesting list_tools...');
  serverProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'list_tools',
    params: {},
    id: 1
  }) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

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

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

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

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

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

  // Wait for final response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Print collected output
  console.log('\nCollected server output:');
  console.log(serverOutput);

  // Clean up
  serverProcess.kill();
}

testServer().catch(console.error); 