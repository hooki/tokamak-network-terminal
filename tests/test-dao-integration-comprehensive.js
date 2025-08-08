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

  console.log(`📤 Sending: ${method}`);
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
      Hammer: '0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2'
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

  // Category 5: Error Handling Tests
  console.log(`\n📋 ${TEST_CATEGORIES.ERROR_HANDLING}\n`);

  currentTest = 'Test invalid address format';
  sendRequest('tools/call', {
    name: 'check-dao-membership',
    arguments: {
      address: 'invalid-address-format',
      network: 'mainnet'
    }
  });
  await setTimeout(TEST_CONFIG.delay);

  currentTest = 'Test invalid candidate contract';
  sendRequest('tools/call', {
    name: 'dao-candidate-activity-reward',
    arguments: {
      network: 'mainnet',
      candidateContract: '0x0000000000000000000000000000000000000000',
      claim: false
    }
  });
  await setTimeout(TEST_CONFIG.delay);

  // Category 6: Performance Tests
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