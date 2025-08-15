const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server output:', output);

  if (output.includes('MCP Server started')) {
    serverReady = true;
    console.log('✅ Server is ready');
  }
});

server.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    server.stdin.write(JSON.stringify(request) + '\n');

    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);

    server.stdout.once('data', (data) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(data.toString().trim());
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function testCreateAgenda() {
  console.log('\n=== Testing create-agenda tool ===\n');

  try {
    // Test 1: Basic agenda creation
    console.log('=== Test 1: Basic agenda creation ===');
    const result1 = await sendRequest('tools/call', {
      name: 'create-agenda',
      arguments: {
        actions: [
          {
            target: '0x1234567890123456789012345678901234567890',
            functionName: 'approve(address,uint256)',
            args: [
              '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              '1000000000000000000',
            ],
          },
        ],
        network: 'mainnet',
      },
    });
    console.log(
      '✅ Response:',
      result1.result?.content?.[0]?.text || 'No response'
    );

    // Test 2: Multiple actions with agenda URL
    console.log('\n=== Test 2: Multiple actions with agenda URL ===');
    const result2 = await sendRequest('tools/call', {
      name: 'create-agenda',
      arguments: {
        actions: [
          {
            target: '0x1234567890123456789012345678901234567890',
            functionName: 'approve(address,uint256)',
            args: [
              '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              '500000000000000000',
            ],
          },
          {
            target: '0x9876543210987654321098765432109876543210',
            functionName: 'setValue(uint256,string)',
            args: ['42', 'test value'],
          },
        ],
        agendaUrl: 'https://forum.tokamak.network/agenda/123',
        network: 'sepolia',
      },
    });
    console.log(
      '✅ Response:',
      result2.result?.content?.[0]?.text || 'No response'
    );

    // Test 3: Error handling - empty actions
    console.log('\n=== Test 3: Error handling - empty actions ===');
    const result3 = await sendRequest('tools/call', {
      name: 'create-agenda',
      arguments: {
        actions: [],
        network: 'mainnet',
      },
    });
    console.log(
      '✅ Response:',
      result3.result?.content?.[0]?.text || 'No response'
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    server.kill();
    console.log('\n✅ Tests completed');
  }
}

// Wait for server to be ready, then run tests
const checkServer = setInterval(() => {
  if (serverReady) {
    clearInterval(checkServer);
    setTimeout(testCreateAgenda, 1000); // Give server a moment to fully initialize
  }
}, 100);

// Handle process exit
process.on('SIGINT', () => {
  server.kill();
  process.exit();
});
