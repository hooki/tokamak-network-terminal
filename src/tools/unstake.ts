import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { writeContract } from '@wagmi/core';
import { parseAbi, parseUnits } from 'viem';
import { z } from 'zod';
import { DEPOSIT_MANAGER } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { resolveLayer2Address } from '../utils/layer2.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerUnstakeTools(server: McpServer) {
  server.registerTool(
    'unstake-tokens',
    {
      title: 'Unstake tokens from Layer2 operator',
      description: new DescriptionBuilder(
        'Unstake a specified amount of tokens from a Layer2 network operator. You can specify the operator by name (e.g., "hammer", "arbitrum") or by address.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        layer2Identifier: z
          .string()
          .describe(
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address"
          ),
        tokenAmount: z.string().describe('The amount of tokens to unstake'),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, tokenAmount, isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier);
      const callbackCommand = `unstake-tokens ${targetAddress} ${tokenAmount}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck) return walletCheck;

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function requestWithdrawal(address, uint256)']),
        address: DEPOSIT_MANAGER,
        functionName: 'requestWithdrawal',
        args: [targetAddress, parseUnits(tokenAmount, 27)],
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Unstake tokens successfully(tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
