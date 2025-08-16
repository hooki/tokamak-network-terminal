import { spawn } from 'node:child_process';

console.log('Testing get-agendas tool registration...\n');

// Start the MCP server
const serverProcess = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let _output = '';

serverProcess.stdout.on('data', (data) => {
  _output += data.toString();
  console.log('Server output:', data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Send a simple test message
setTimeout(() => {
  console.log('Sending test message...');
  serverProcess.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    })}\n`
  );
}, 1000);

// Clean up after 5 seconds
setTimeout(() => {
  serverProcess.kill();
  console.log('Test completed');
}, 5000);
