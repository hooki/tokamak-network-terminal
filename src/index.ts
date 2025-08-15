import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAgendaTools } from './tools/agenda.js';
import { registerApproveTools } from './tools/approve.js';
import { registerStakeTools } from './tools/stake.js';
import { registerStakingInfoTools } from './tools/staking.js';
import { registerTokenTools } from './tools/token.js';
import { registerTONCommands } from './tools/ton.js';
import { registerUnstakeTools } from './tools/unstake.js';
import { registerWalletTools } from './tools/wallet.js';
import { registerWithdrawTools } from './tools/withdraw.js';
import { registerDAOTools } from './tools/dao.js';

const server = new McpServer({
  name: 'tokamak-network-mcp-server',
  version: '0.0.1',
});

registerAgendaTools(server);
registerWalletTools(server);
registerTokenTools(server);
registerApproveTools(server);
registerStakeTools(server);
registerStakingInfoTools(server);
registerUnstakeTools(server);
registerWithdrawTools(server);
registerTONCommands(server);
registerDAOTools(server);

const transport = new StdioServerTransport();
server.connect(transport);
