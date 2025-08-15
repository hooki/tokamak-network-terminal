import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Comprehensive DAO Integration Testing Suite\n');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  delay: 2000,
  networks: ['mainnet', 'sepolia'],
  testAddresses: {
    mainnet: '0x1234567890123456789012345678901234567890',
    sepolia: '0x0987654321098765432109876543210987654321'
  }
};

// Start the MCP server
const serverProcess = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;
let testResults = [];
let currentTest = '';

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };

  const toolName = params.name || 'unknown';
  console.log(`📤 Sending: ${method} (tool: ${toolName})`);
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

function parseResponse(data) {
  const dataStr = data.toString();

  // 여러 줄로 나뉜 데이터를 처리
  const lines = dataStr.split('\n').filter(line => line.trim());

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

  return null;
}

function logTestResult(testName, success, message = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  const result = {
    test: testName,
    status: success ? 'PASS' : 'FAIL',
    message: message,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);
  console.log(`${status} ${testName}${message ? ': ' + message : ''}`);
}

serverProcess.stdout.on('data', (data) => {
  const dataStr = data.toString();

  // 디버그 정보 필터링 (필요시 주석 해제)
  /*
  if (dataStr.includes('** network') || dataStr.includes('** members') || dataStr.includes('** stakingInfo') || dataStr.includes('** memberInfo') || dataStr.includes('** operatorManagerResults') || dataStr.includes('** managerResults') || dataStr.includes('** validOperatorManagerResults') || dataStr.includes('** memberInfoList') || dataStr.includes('createSuccessResponse') || dataStr.includes('createErrorResponse')) {
    console.log('📥 Server debug output:', dataStr.trim());
  }
  */

  const response = parseResponse(data);
  if (response) {
    if (response.result) {
      if (response.result.content && response.result.content[0]) {
        const content = response.result.content[0].text;
        try {
          const parsed = JSON.parse(content);
          if (parsed.status === 'success') {
            logTestResult(currentTest, true, parsed.message?.substring(0, 100));
          } else if (parsed.status === 'error') {
            logTestResult(currentTest, false, parsed.message?.substring(0, 100));
          }
        } catch (e) {
          logTestResult(currentTest, true, content.substring(0, 100));
        }
      } else {
        logTestResult(currentTest, true);
      }
    } else if (response.error) {
      logTestResult(currentTest, false, response.error.message);
    }
    console.log('');
  }
});

serverProcess.stderr.on('data', (data) => {
  console.log('🚨 Server error:', data.toString());
});

// Test categories
const TEST_CATEGORIES = {
  BASIC_INFO: 'Basic DAO Information',
  MEMBER_MANAGEMENT: 'DAO Member Management',
  STAKING_INFO: 'DAO Staking Information',
  ACTIVITY_REWARDS: 'DAO Activity Rewards',
  ERROR_HANDLING: 'Error Handling',
  PERFORMANCE: 'Performance Testing'
};

// Test suite
async function runDAOTestSuite() {
  console.log('🚀 Starting Comprehensive DAO Integration Test Suite\n');

  // Wait for server to start
  await setTimeout(1000);

  // Category 1: Basic DAO Information Tests
  console.log(`\n📋 ${TEST_CATEGORIES.BASIC_INFO}\n`);

  for (const network of TEST_CONFIG.networks) {
    currentTest = `Get DAO member count on ${network}`;
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network }
    });
    await setTimeout(TEST_CONFIG.delay);

    currentTest = `Get DAO member candidate info on ${network}`;
    sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network }
    });
    await setTimeout(TEST_CONFIG.delay);

    currentTest = `Get DAO member operator manager info on ${network}`;
    sendRequest('tools/call', {
      name: 'get-dao-member-operator-manager-info',
      arguments: { network }
    });
    await setTimeout(TEST_CONFIG.delay);
  }

  // Category 2: DAO Member Management Tests
  console.log(`\n📋 ${TEST_CATEGORIES.MEMBER_MANAGEMENT}\n`);

  for (const network of TEST_CONFIG.networks) {
    const testAddress = TEST_CONFIG.testAddresses[network];

    currentTest = `Check DAO membership for test address on ${network}`;
    sendRequest('tools/call', {
      name: 'check-dao-membership',
      arguments: {
        address: testAddress,
        network
      }
    });
    await setTimeout(TEST_CONFIG.delay);
  }

  // Category 3: DAO Staking Information Tests
  console.log(`\n📋 ${TEST_CATEGORIES.STAKING_INFO}\n`);

  for (const network of TEST_CONFIG.networks) {
    currentTest = `Get DAO members staking info (exclude operator manager) on ${network}`;
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: {
        network,
        includeOperatorManager: false
      }
    });
    await setTimeout(TEST_CONFIG.delay);

    currentTest = `Get DAO members staking info (include operator manager) on ${network}`;
    sendRequest('tools/call', {
      name: 'get-dao-members-staking-info',
      arguments: {
        network,
        includeOperatorManager: true
      }
    });
    await setTimeout(TEST_CONFIG.delay);
  }

  // Category 4: DAO Activity Rewards Tests
  console.log(`\n📋 ${TEST_CATEGORIES.ACTIVITY_REWARDS}\n`);

  // Test with known candidate contracts
  const candidateContracts = {
    mainnet: {
      tokamak1: '0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF',
      DXM_Corp: '0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57',
      Hammer: '0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2',
      level: '0x0F42D1C40b95DF7A1478639918fc358B4aF5298D'
    },
    sepolia: {
      Poseidon: '0xF078AE62eA4740E19ddf6c0c5e17Ecdb820BbEe1'
    }
  };

  for (const network of TEST_CONFIG.networks) {
    const contracts = candidateContracts[network];
    if (contracts) {
      for (const [name, contract] of Object.entries(contracts)) {
        currentTest = `Get DAO activity reward for ${name} on ${network}`;
        sendRequest('tools/call', {
          name: 'dao-candidate-activity-reward',
          arguments: {
            network,
            candidateContract: contract,
            claim: false
          }
        });
        await setTimeout(TEST_CONFIG.delay);
      }
    }
  }

  // Category 5: Challenge Member Tests
  console.log(`\n📋 Challenge Member Tests\n`);

  // Test with non-DAO member challenger candidates (실제 존재하는 주소들)
  const testChallengerCandidates = {
    mainnet: [
      '0x2b67d8d4e61b68744885e243efaf988f1fc66e2d', // DSRV
      '0x44e3605d0ed58fd125e9c47d1bf25a4406c13b57', // DXM Corp
      '0xbc602c1d9f3ae99db4e9fd3662ce3d02e593ec5d'  // decipher
    ],
    sepolia: [
      '0xAbD15C021942Ca54aBd944C91705Fe70FEA13f0d', // member_DAO
      '0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599', // TokamakOperator_v2
      '0xeA2c15fdf4cE802Ba188e7D4460D979E9df5fD51'  // Titan_Test1
    ]
  };

  for (const network of TEST_CONFIG.networks) {
    const candidates = testChallengerCandidates[network];
    if (candidates) {
      for (let i = 0; i < candidates.length; i++) {
        currentTest = `Get challenge member info for test challenger ${i + 1} on ${network}`;
        sendRequest('tools/call', {
          name: 'get-challenge-member-info',
          arguments: {
            memberIndex: 0,
            challengerCandidate: candidates[i],
            network
          }
        });
        await setTimeout(TEST_CONFIG.delay);
      }
    }
  }

  // Test with invalid challenger candidate (실제 존재하는 주소 사용)
  currentTest = 'Get challenge member info with invalid challenger';
  sendRequest('tools/call', {
    name: 'get-challenge-member-info',
    arguments: {
      memberIndex: 0,
      challengerCandidate: '0xeA2c15fdf4cE802Ba188e7D4460D979E9df5fD51', // TON 토큰 주소 (DAO 멤버가 아님)
      network: 'sepolia'
    }
  });
  await setTimeout(TEST_CONFIG.delay);

  // Category 6: Error Handling Tests
  console.log(`\n📋 ${TEST_CATEGORIES.ERROR_HANDLING}\n`);

  currentTest = 'Test invalid address format';
  sendRequest('tools/call', {
    name: 'check-dao-membership',
    arguments: {
      address: 'invalid-address-format',
      network: 'sepolia'
    }
  });
  await setTimeout(TEST_CONFIG.delay);

  currentTest = 'Test invalid candidate contract';
  sendRequest('tools/call', {
    name: 'dao-candidate-activity-reward',
    arguments: {
      network: 'sepolia',
      candidateContract: '0x1234567890123456789012345678901234567890', // 존재하지 않는 컨트랙트 주소
      claim: false
    }
  });
  await setTimeout(TEST_CONFIG.delay);

  // Category 7: Performance Tests
  console.log(`\n📋 ${TEST_CATEGORIES.PERFORMANCE}\n`);

  for (let i = 0; i < 3; i++) {
    currentTest = `Performance test ${i + 1} - DAO member count`;
    const startTime = Date.now();
    sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network: 'mainnet' }
    });
    await setTimeout(TEST_CONFIG.delay);
    const endTime = Date.now();
    console.log(`⏱️ Response time: ${endTime - startTime}ms`);
  }

  // Test completion
  await setTimeout(2000);
  console.log('\n📊 Test Results Summary:');
  console.log('========================');

  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const totalTests = testResults.length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  - ${result.test}: ${result.message}`);
    });
  }

  console.log('\n✅ Comprehensive DAO integration tests completed');
  serverProcess.kill();
}

// Run the test suite
runDAOTestSuite().catch(console.error);