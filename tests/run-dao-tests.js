#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { setTimeout } from 'timers/promises';

console.log('🚀 DAO Test Runner\n');

// Test configuration
const TEST_CONFIG = {
  timeout: 60000,
  delay: 2000,
  testFiles: [
    'test-dao-integration.js',
    'test-dao-integration-comprehensive.js',
  ],
  testOptions: {
    basic: true,
    comprehensive: true,
    network: 'mainnet', // 'mainnet', 'sepolia', 'both'
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  basic: args.includes('--basic') || args.includes('-b'),
  comprehensive: args.includes('--comprehensive') || args.includes('-c'),
  network:
    args.find((arg) => arg.startsWith('--network='))?.split('=')[1] ||
    'mainnet',
  help: args.includes('--help') || args.includes('-h'),
};

if (options.help) {
  console.log(`
DAO Test Runner

Usage: node run-dao-tests.js [options]

Options:
  --basic, -b           Run basic DAO tests
  --comprehensive, -c   Run comprehensive DAO tests
  --network=<network>   Specify network (mainnet, sepolia, both)
  --help, -h            Show this help message

Examples:
  node run-dao-tests.js --basic
  node run-dao-tests.js --comprehensive --network=mainnet
  node run-dao-tests.js --all
`);
  process.exit(0);
}

// Check if dist directory exists
if (!existsSync('dist')) {
  console.log(
    '❌ Error: dist directory not found. Please build the project first:'
  );
  console.log('   npm run build');
  process.exit(1);
}

// Test runner class
class DAOTestRunner {
  constructor() {
    this.results = [];
    this.currentTest = '';
    this.startTime = Date.now();
  }

  async runTest(testFile, testName) {
    console.log(`\n🧪 Running ${testName}...`);
    console.log('='.repeat(50));

    return new Promise((resolve) => {
      const testProcess = spawn('node', [testFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      testProcess.on('close', (code) => {
        const result = {
          testFile,
          testName,
          success: code === 0,
          exitCode: code,
          output,
          errorOutput,
          duration: Date.now() - this.startTime,
        };

        this.results.push(result);

        if (code === 0) {
          console.log(`✅ ${testName} completed successfully`);
        } else {
          console.log(`❌ ${testName} failed with exit code ${code}`);
        }

        resolve(result);
      });

      // Timeout handling
      setTimeout(() => {
        if (!testProcess.killed) {
          console.log(`⏰ ${testName} timed out`);
          testProcess.kill('SIGTERM');
        }
      }, TEST_CONFIG.timeout);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting DAO Test Suite\n');
    console.log(`Configuration:`);
    console.log(`  - Network: ${options.network}`);
    console.log(`  - Basic tests: ${options.basic}`);
    console.log(`  - Comprehensive tests: ${options.comprehensive}\n`);

    const testsToRun = [];

    // Determine which tests to run
    if (options.basic || args.includes('--all')) {
      testsToRun.push({
        file: 'tests/test-dao-integration.js',
        name: 'Basic DAO Integration Tests',
      });
    }

    if (options.comprehensive || args.includes('--all')) {
      testsToRun.push({
        file: 'tests/test-dao-integration-comprehensive.js',
        name: 'Comprehensive DAO Integration Tests',
      });
    }

    if (testsToRun.length === 0) {
      console.log('❌ No tests selected. Use --help for options.');
      process.exit(1);
    }

    // Run tests sequentially
    for (const test of testsToRun) {
      if (!existsSync(test.file)) {
        console.log(`⚠️  Test file not found: ${test.file}`);
        continue;
      }

      await this.runTest(test.file, test.name);
      await setTimeout(TEST_CONFIG.delay);
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.success).length;
    const failedTests = this.results.filter((r) => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(
      `Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`
    );
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter((r) => !r.success)
        .forEach((result) => {
          console.log(`  - ${result.testName}: Exit code ${result.exitCode}`);
          if (result.errorOutput) {
            console.log(
              `    Error: ${result.errorOutput.substring(0, 200)}...`
            );
          }
        });
    }

    // Performance analysis
    const avgDuration = totalDuration / totalTests;
    console.log(`\n📈 Performance:`);
    console.log(
      `  - Average test duration: ${(avgDuration / 1000).toFixed(2)}s`
    );
    console.log(
      `  - Fastest test: ${(Math.min(...this.results.map((r) => r.duration)) / 1000).toFixed(2)}s`
    );
    console.log(
      `  - Slowest test: ${(Math.max(...this.results.map((r) => r.duration)) / 1000).toFixed(2)}s`
    );

    console.log('\n✅ DAO test suite completed');
  }
}

// Main execution
async function main() {
  try {
    const runner = new DAOTestRunner();
    await runner.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run the test runner
main();
