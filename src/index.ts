import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerApproveTools } from './tools/approve.js';
import { registerStakeTools } from './tools/stake.js';
import { registerSwapTools } from './tools/swap.js';
import { registerTokenTools } from './tools/token.js';
import { registerUnstakeTools } from './tools/unstake.js';
import { registerWalletTools } from './tools/wallet.js';
import { registerWithdrawTools } from './tools/withdraw.js';

const server = new McpServer({
  name: 'tokamak-network-mcp-server',
  version: '0.0.1',
});

registerWalletTools(server);
registerTokenTools(server);
registerApproveTools(server);
registerSwapTools(server);
registerStakeTools(server);
registerUnstakeTools(server);
registerWithdrawTools(server);

const transport = new StdioServerTransport();
server.connect(transport);
