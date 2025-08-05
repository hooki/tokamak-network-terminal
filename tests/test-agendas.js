// Test script for get-agendas tool
const { spawn } = require('child_process');

// Test cases for get-agendas
const testCases = [
  {
    name: 'Get latest agendas (no parameters)',
    params: {}
  },
  {
    name: 'Get agendas from start',
    params: { start: '0' }
  },
  {
    name: 'Get agendas with range',
    params: { start: '0', end: '10' }
  },
  {
    name: 'Get agendas on sepolia',
    params: { network: 'sepolia' }
  }
];

console.log('Testing get-agendas tool...\n');

// Note: This is a placeholder for testing
// In a real scenario, you would connect to the MCP server and call the tool
console.log('Test cases prepared:');
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Parameters: ${JSON.stringify(testCase.params)}`);
  console.log('');
});

console.log('To test the actual tool, you need to:');
console.log('1. Connect to the MCP server running on port 3000');
console.log('2. Call the get-agendas tool with the parameters above');
console.log('3. Verify the responses contain agenda data');