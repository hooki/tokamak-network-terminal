import { spawn } from 'child_process';

console.log('Testing DAO utilities with actual blockchain calls...\n');

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

  const toolName = params.name || 'unknown';
  console.log(`Sending: ${method} (tool: ${toolName})`);
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

function parseResponse(data) {
  const dataStr = data.toString();

  // 여러 줄로 나뉜 데이터를 처리
  const lines = dataStr.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    try {
      const response = JSON.parse(line.trim());
      // JSON-RPC 응답인지 확인
      if (response.jsonrpc === '2.0' && (response.result || response.error)) {
        return response;
      }
    } catch (error) {
      // 이 줄은 JSON이 아님, 다음 줄 시도
      continue;
    }
  }

  // // JSON-RPC 응답을 찾지 못한 경우
  // console.log('Raw response (no valid JSON-RPC found):', dataStr);
  return null;
}

serverProcess.stdout.on('data', (data) => {
  const dataStr = data.toString();

  // // 디버그 정보 출력
  // if (dataStr.includes('** network') || dataStr.includes('** members') || dataStr.includes('** stakingInfo') || dataStr.includes('** memberInfo') || dataStr.includes('** operatorManagerResults') || dataStr.includes('** managerResults') || dataStr.includes('** validOperatorManagerResults') || dataStr.includes('** memberInfoList') || dataStr.includes('createSuccessResponse') || dataStr.includes('createErrorResponse')) {
  //   console.log('📥 Server debug output:', dataStr.trim());
  // }

  const response = parseResponse(data);
  if (response) {
    // console.log(`✅ JSON-RPC Response for ID ${response.id}:`);

    if (response.result) {
      console.log('🎯 Result found:');
      // console.log('** response.result', response.result);
      if (response.result.content && response.result.content[0]) {
        const contentText = response.result.content[0].text;

        // Try to parse the content text as JSON
        try {
          const parsedContent = JSON.parse(contentText);
          console.log(
            '📄 Parsed content:',
            JSON.stringify(parsedContent, null, 2)
          );
        } catch (parseError) {
          console.log('📄 Content text:', contentText);
        }
      } else {
        // console.log('📊 Direct result:', JSON.stringify(response.result, null, 2));
      }
    } else if (response.error) {
      console.log(
        '❌ Error response:',
        JSON.stringify(response.error, null, 2)
      );
    }
    // console.log('─'.repeat(80));
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log('🚨 Server stderr:', data.toString());
});

// Wait for server to start
setTimeout(() => {
  console.log('🧪 Testing DAO utilities...\n');

  // Test 1: Get DAO member count on mainnet
  console.log('=== Test 1: Get DAO member count on mainnet ===');
  sendRequest('tools/call', {
    name: 'get-dao-member-count',
    arguments: { network: 'mainnet' },
  });

  // Test 2: Get DAO member candidate info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 2: Get DAO member candidate info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network: 'mainnet' },
    });
  }, 2000);

  // Test 3: Get DAO member operator manager info on mainnet
  setTimeout(() => {
    console.log(
      '\n=== Test 3: Get DAO member operator manager info on mainnet ==='
    );
    sendRequest('tools/call', {
      name: 'get-dao-member-operator-manager-info',
      arguments: { network: 'sepolia' },
    });
  }, 4000);

  // Test 4: Get DAO members staking info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 4: Get DAO members staking info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: { network: 'sepolia', includeOperatorManager: false },
    });
  }, 6000);

  // Test 5: Check DAO membership for a test address
  setTimeout(() => {
    console.log('\n=== Test 5: Check DAO membership for test address ===');
    sendRequest('tools/call', {
      name: 'check-dao-membership',
      arguments: {
        address: '0xc1eba383D94c6021160042491A5dfaF1d82694E6',
        network: 'sepolia',
      },
    });
  }, 8000);

  // Test 6: Get DAO member count on sepolia
  setTimeout(() => {
    console.log('\n=== Test 6: Get DAO member count on sepolia ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network: 'sepolia' },
    });
  }, 10000);

  // Test 7: Get DAO member candidate info on sepolia
  setTimeout(() => {
    console.log('\n=== Test 7: Get DAO member candidate info on sepolia ===');
    sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network: 'sepolia' },
    });
  }, 12000);

  // Test 8: Get DAO members staking info with operator manager on mainnet
  setTimeout(() => {
    console.log(
      '\n=== Test 8: Get DAO members staking info with operator manager on mainnet ==='
    );
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: { network: 'mainnet', includeOperatorManager: true },
    });
  }, 14000);

  // Test 9: Performance test - measure response time
  setTimeout(() => {
    console.log('\n=== Test 9: Performance test ===');
    const startTime = Date.now();
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network: 'mainnet' },
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
        network: 'mainnet',
      },
    });
  }, 18000);

  // Test 11: Get DAO candidate activity reward on mainnet
  setTimeout(() => {
    console.log(
      '\n=== Test 11: Get DAO candidate activity reward on mainnet ==='
    );
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        network: 'mainnet',
        candidateContract: '0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF', // tokamak1
      },
    });
  }, 20000);

  // Test 12: Get DAO candidate activity reward on sepolia
  setTimeout(() => {
    console.log(
      '\n=== Test 12: Get DAO candidate activity reward on sepolia ==='
    );
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        network: 'sepolia',
        candidateContract: '0xF078AE62eA4740E19ddf6c0c5e17Ecdb820BbEe1', // Poseidon
      },
    });
  }, 22000);

  // Test 13: Get DAO candidate activity reward without network (should use default)
  setTimeout(() => {
    console.log(
      '\n=== Test 13: Get DAO candidate activity reward without network ==='
    );
    sendRequest('tools/call', {
      name: 'dao-candidate-activity-reward',
      arguments: {
        candidateContract: '0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57', // DXM_Corp
      },
    });
  }, 24000);

  // Test 14: Get challenge member info on mainnet
  setTimeout(() => {
    console.log('\n=== Test 14: Get challenge member info on mainnet ===');
    sendRequest('tools/call', {
      name: 'get-challenge-member-info',
      arguments: {
        memberIndex: 0,
        challengerCandidate: '0x1234567890123456789012345678901234567890', // Test challenger
        network: 'mainnet',
      },
    });
  }, 26000);

  // Test 15: Get challenge member info on sepolia
  setTimeout(() => {
    console.log('\n=== Test 15: Get challenge member info on sepolia ===');
    sendRequest('tools/call', {
      name: 'get-challenge-member-info',
      arguments: {
        memberIndex: 0,
        challengerCandidate: '0x2345678901234567890123456789012345678901', // Test challenger
        network: 'sepolia',
      },
    });
  }, 28000);

  // Test 16: Get challenge member info with different member index
  setTimeout(() => {
    console.log(
      '\n=== Test 16: Get challenge member info with different member index ==='
    );
    sendRequest('tools/call', {
      name: 'get-challenge-member-info',
      arguments: {
        memberIndex: 1,
        challengerCandidate: '0x3456789012345678901234567890123456789012', // Test challenger
        network: 'mainnet',
      },
    });
  }, 30000);

  // Complete tests
  setTimeout(() => {
    console.log('\n✅ All DAO integration tests completed');
    serverProcess.kill();
  }, 32000);
}, 1000);
