import { spawn } from 'child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testGetAgendas() {
  console.log('Starting MCP client test...\n');

  // Start the MCP server process
  const serverProcess = spawn('node', ['dist/src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Create MCP client transport
  const transport = new StdioClientTransport(
    serverProcess.stdin,
    serverProcess.stdout
  );

  // Create MCP client
  const client = new McpClient(transport);

  try {
    // Connect to the server
    await client.connect();
    console.log('✅ Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log('\n📋 Available tools:');
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test get-agendas tool
    console.log('\n🧪 Testing get-agendas tool...\n');

    // Test 1: Get latest agendas (no parameters)
    console.log('Test 1: Get latest agendas');
    try {
      const result1 = await client.callTool('get-agendas', {});
      console.log(
        '✅ Success:',
        result1.content[0].text.substring(0, 200) + '...'
      );
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 2: Get agendas with start parameter
    console.log('\nTest 2: Get agendas from start=0');
    try {
      const result2 = await client.callTool('get-agendas', { start: '0' });
      console.log(
        '✅ Success:',
        result2.content[0].text.substring(0, 200) + '...'
      );
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 3: Get agendas with range
    console.log('\nTest 3: Get agendas with range start=0, end=5');
    try {
      const result3 = await client.callTool('get-agendas', {
        start: '0',
        end: '5',
      });
      console.log(
        '✅ Success:',
        result3.content[0].text.substring(0, 200) + '...'
      );
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 4: Get agendas on sepolia
    console.log('\nTest 4: Get agendas on sepolia network');
    try {
      const result4 = await client.callTool('get-agendas', {
        network: 'sepolia',
      });
      console.log(
        '✅ Success:',
        result4.content[0].text.substring(0, 200) + '...'
      );
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  } catch (error) {
    console.error('❌ Client error:', error);
  } finally {
    // Clean up
    serverProcess.kill();
    await client.disconnect();
    console.log('\n✅ Test completed');
  }
}

testGetAgendas().catch(console.error);
