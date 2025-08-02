import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccount, writeContract } from '@wagmi/core';
import { parseAbi, parseUnits } from 'viem';
import { z } from 'zod';
import { TON_ADDRESS, WTON_ADDRESS } from '../constants.js';
import { checkApproval } from '../utils/approve.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerSwapTools(server: McpServer) {
  server.registerTool(
    'swap',
    {
      title: 'Wrap / Unwrap between TON and WTON',
      description: new DescriptionBuilder(
        'Wrap or unwrap(also known as swap, convert, wrap, unwrap) between TON and WTON.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        fromToken: z.enum(['TON', 'WTON']).describe('The token to swap from'),
        tokenAmount: z.string().describe('The amount of tokens to swap'),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ fromToken, tokenAmount, isCallback }) => {
      const account = getAccount(wagmiConfig);
      if (account.address === undefined)
        return checkWalletConnection(
          isCallback,
          `swap ${fromToken} ${tokenAmount}`
        );

      const tokenDecimals = fromToken === 'TON' ? 18 : 27;
      if (fromToken === 'TON') {
        const approvalCheck = await checkApproval(
          account.address,
          TON_ADDRESS,
          tokenDecimals,
          WTON_ADDRESS,
          parseUnits(tokenAmount, tokenDecimals),
          `swap ${fromToken} ${tokenAmount}`
        );
        if (approvalCheck) return approvalCheck;
      }

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi([
          'function swapToTON(uint256 wtonAmount) external returns (bool)',
          'function swapFromTON(uint256 tonAmount) external returns (bool)',
        ]),
        address: WTON_ADDRESS,
        functionName: fromToken === 'TON' ? 'swapFromTON' : 'swapToTON',
        args: [
          fromToken === 'TON'
            ? parseUnits(tokenAmount, 18)
            : parseUnits(tokenAmount, 27),
        ],
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Swap ${fromToken} to ${
                fromToken === 'TON' ? 'WTON' : 'TON'
              } successfully(tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
