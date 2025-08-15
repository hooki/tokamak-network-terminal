import { spawn } from 'node:child_process';

console.log('Testing get-agendas tool with actual calls...\n');

// Start the MCP server
const serverProcess = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let requestId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params,
  };

  console.log(`Sending: ${method}`);
  serverProcess.stdin.write(`${JSON.stringify(request)}\n`);
}

function parseResponse(data) {
  try {
    const response = JSON.parse(data.toString());
    return response;
  } catch (_error) {
    console.log('Raw response:', data.toString());
    return null;
  }
}

serverProcess.stdout.on('data', (data) => {
  const response = parseResponse(data);
  if (response) {
    console.log(`✅ Response for ID ${response.id}:`);
    if (response.result) {
      if (response.result.content?.[0]) {
        console.log(`${response.result.content[0].text.substring(0, 300)}...`);
      } else {
        console.log('Result:', JSON.stringify(response.result, null, 2));
      }
    } else if (response.error) {
      console.log('❌ Error:', response.error);
    }
    console.log('');
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

// Wait for server to start
setTimeout(() => {
  console.log('🧪 Testing get-agendas tool...\n');

  // Test 1: Get latest agendas (no parameters)
  console.log('=== Test 1: Get latest agendas ===');
  sendRequest('tools/call', {
    name: 'get-agendas',
    arguments: {},
  });

  // Test 2: Get agendas with start parameter
  setTimeout(() => {
    console.log('\n=== Test 2: Get agendas from start=0 ===');
    sendRequest('tools/call', {
      name: 'get-agendas',
      arguments: { start: '0' },
    });
  }, 2000);

  // Test 3: Get agendas with range
  setTimeout(() => {
    console.log('\n=== Test 3: Get agendas with range start=0, end=5 ===');
    sendRequest('tools/call', {
      name: 'get-agendas',
      arguments: { start: '0', end: '5' },
    });
  }, 4000);

  // Test 4: Get agendas on sepolia
  setTimeout(() => {
    console.log('\n=== Test 4: Get agendas on sepolia network ===');
    sendRequest('tools/call', {
      name: 'get-agendas',
      arguments: { network: 'sepolia' },
    });
  }, 6000);

  // Test 5: Get agenda count from mainnet
  setTimeout(() => {
    console.log('\n=== Test 5: Get agenda count from mainnet ===');
    sendRequest('tools/call', {
      name: 'get-agenda-count',
      arguments: { network: 'mainnet' },
    });
  }, 8000);

  // Test 6: Get agenda count from sepolia
  setTimeout(() => {
    console.log('\n=== Test 6: Get agenda count from sepolia ===');
    sendRequest('tools/call', {
      name: 'get-agenda-count',
      arguments: { network: 'sepolia' },
    });
  }, 10000);

  // Clean up after all tests
  setTimeout(() => {
    console.log('\n✅ All tests completed');
    serverProcess.kill();
    process.exit(0);
  }, 12000);
}, 1000);
