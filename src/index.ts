import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerStakeTools } from './tools/stake.js';
import { registerTokenTools } from './tools/token.js';
import { registerTONCommands } from './tools/ton.js';
import { registerUnstakeTools } from './tools/unstake.js';
import { registerWalletTools } from './tools/wallet.js';
import { registerWithdrawTools } from './tools/withdraw.js';

const server = new McpServer({
  name: 'tokamak-network-mcp-server',
  version: '0.0.1',
});

registerWalletTools(server);
registerTokenTools(server);
registerStakeTools(server);
registerUnstakeTools(server);
registerWithdrawTools(server);
registerTONCommands(server);

const transport = new StdioServerTransport();
server.connect(transport);
