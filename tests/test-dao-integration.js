import { spawn } from 'child_process';

console.log('Testing DAO utilities with actual blockchain calls...\n');

// Start the MCP server
const serverProcess = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };

  console.log(`Sending: ${method}`);
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

function parseResponse(data) {
  try {
    const response = JSON.parse(data.toString());
    return response;
  } catch (error) {
    console.log('Raw response:', data.toString());
    return null;
  }
}

serverProcess.stdout.on('data', (data) => {
  const response = parseResponse(data);
  if (response) {
    console.log(`✅ Response for ID ${response.id}:`);
    if (response.result) {
      if (response.result.content && response.result.content[0]) {
        console.log(response.result.content[0].text.substring(0, 300) + '...');
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
  console.log('🧪 Testing DAO utilities...\n');

  // Test 1: Get DAO member count on mainnet
  console.log('=== Test 1: Get DAO member count on mainnet ===');
  sendRequest('tools/call', {
    name: 'get-dao-member-count',
    arguments: { network: 'mainnet' }
  });

  // Test 2: Get DAO member candidate info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 2: Get DAO member candidate info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network: 'mainnet' }
    });
  }, 2000);

  // Test 3: Get DAO member operator manager info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 3: Get DAO member operator manager info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-operator-manager-info',
      arguments: { network: 'mainnet' }
    });
  }, 4000);

  // Test 4: Get DAO members staking info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 4: Get DAO members staking info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: { network: 'mainnet', includeOperatorManager: false }
    });
  }, 6000);

  // Test 5: Check DAO membership for a test address
  setTimeout(() => {
    console.log('\n=== Test 5: Check DAO membership for test address ===');
    sendRequest('tools/call', {
      name: 'check-dao-membership',
      arguments: {
        address: '0x1234567890123456789012345678901234567890',
        network: 'mainnet'
      }
    });
  }, 8000);

  // Test 6: Get DAO member count on sepolia
  setTimeout(() => {
    console.log('\n=== Test 6: Get DAO member count on sepolia ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network: 'sepolia' }
    });
  }, 10000);

  // Test 7: Get DAO member candidate info on sepolia
  setTimeout(() => {
    console.log('\n=== Test 7: Get DAO member candidate info on sepolia ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network: 'sepolia' }
    });
  }, 12000);

  // Test 8: Get DAO members staking info with operator manager on mainnet
  setTimeout(() => {
    console.log('\n=== Test 8: Get DAO members staking info with operator manager on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: { network: 'mainnet', includeOperatorManager: true }
    });
  }, 14000);

  // Test 9: Performance test - measure response time
  setTimeout(() => {
    console.log('\n=== Test 9: Performance test ===');
    const startTime = Date.now();
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network: 'mainnet' }
    });

    // Response time will be logged in the response handler
    setTimeout(() => {
      const endTime = Date.now();
      console.log(`⏱️ Response time: ${endTime - startTime}ms`);
    }, 2000);
  }, 16000);

  // Test 10: Error handling test
  setTimeout(() => {
    console.log('\n=== Test 10: Error handling test ===');
    sendRequest('tools/call', {
      name: 'check-dao-membership',
      arguments: {
        address: 'invalid-address',
        network: 'mainnet'
      }
    });
  }, 18000);

  // Test 11: Get DAO candidate activity reward on mainnet
  setTimeout(() => {
    console.log('\n=== Test 11: Get DAO candidate activity reward on mainnet ===');
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        network: 'mainnet',
        candidateContract: '0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF' // tokamak1
      }
    });
  }, 20000);

  // Test 12: Get DAO candidate activity reward on sepolia
  setTimeout(() => {
    console.log('\n=== Test 12: Get DAO candidate activity reward on sepolia ===');
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        network: 'sepolia',
        candidateContract: '0xF078AE62eA4740E19ddf6c0c5e17Ecdb820BbEe1' // Poseidon
      }
    });
  }, 22000);

  // Test 13: Get DAO candidate activity reward without network (should use default)
  setTimeout(() => {
    console.log('\n=== Test 13: Get DAO candidate activity reward without network ===');
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        candidateContract: '0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57' // DXM_Corp
      }
    });
  }, 24000);

  // Complete tests
  setTimeout(() => {
    console.log('\n✅ All DAO integration tests completed');
    serverProcess.kill();
  }, 26000);

}, 1000);