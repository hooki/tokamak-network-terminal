import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createMCPResponse } from '../utils/response.js';
import { connectWallet, generateQRCode } from '../utils/wallet.js';

export function registerWalletTools(server: McpServer) {
  server.registerTool(
    'connect-wallet',
    {
      title: 'Connect Wallet',
      description: 'Connect to a wallet',
      inputSchema: {
        callback: z
          .string()
          .optional()
          .describe('The callback to call after connecting the wallet'),
      },
    },
    async ({ callback }) => {
      const uri = await connectWallet();

      let qrCodeText = '';
      try {
        qrCodeText = await generateQRCode(uri);
      } catch {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'QR Code generation failed',
              }),
            },
          ],
        };
      }

      const response: MCPResponse = {
        status: 'success',
        message: 'Wallet Connect QR Code',
        nextStep: callback,
        executeNextStepAfter: '10s',
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse(response),
          },
          {
            type: 'text' as const,
            text: qrCodeText,
          },
        ],
      };
    }
  );
}
