import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type GetAccountReturnType, getAccount } from '@wagmi/core';
import { z } from 'zod';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { connectWallet, generateQRCode } from '../utils/wallet.js';

export function registerWalletTools(server: McpServer) {
  server.registerTool(
    'wait-wallet-connect',
    {
      title: 'Waiting for wallet connection',
      description: new DescriptionBuilder(
        'Waiting for wallet connection'
      ).toString(),
      inputSchema: {
        callback: z
          .string()
          .optional()
          .describe('The callback to call after connecting the wallet'),
        timeout: z
          .number()
          .optional()
          .default(60000)
          .describe('Timeout in milliseconds (default: 60000ms = 60 seconds)'),
      },
    },
    async ({ callback, timeout }) => {
      const startTime = Date.now();
      let account: GetAccountReturnType<typeof wagmiConfig> | undefined;
      while (Date.now() - startTime < timeout) {
        account = getAccount(wagmiConfig);
        if (account.isConnected) break;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Timeout
      if (!account?.isConnected) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'Wallet connection timed out',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'continue',
              message: `Wallet connected: ${account.address}`,
              nextStep: callback,
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'connect-wallet',
    {
      title: 'Connect Wallet',
      description: new DescriptionBuilder('Connect to a wallet').toString(),
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

      return {
        content: [
          {
            type: 'text' as const,
            text: `${createMCPResponse({
              status: 'continue',
              nextStep: 'wait-wallet-connect',
              callback: callback,
            })}\n\n`,
          },
          {
            type: 'text' as const,
            text: 'Please scan the QR code with your wallet to connect\n\n',
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
