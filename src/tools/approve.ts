import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core';
import { parseAbi, parseUnits } from 'viem';
import { z } from 'zod';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { resolveAddress, resolveTokenAddress } from '../utils/resolve.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerApproveTools(server: McpServer) {
  server.registerTool(
    'approve',
    {
      title: 'Approve token spending',
      description: new DescriptionBuilder(
        'Approve a spender address to spend a specified amount of tokens on your behalf. This is required before other contracts can transfer your tokens.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        token: z
          .string()
          .describe(
            'The token address or name to approve spending for (e.g., "TON", "WTON", or a contract address)'
          )
          .transform(resolveTokenAddress),
        spender: z
          .string()
          .describe(
            'The address or name of the spender(e.g., "TON", "WTON", or a contract address) that will be approved to spend the tokens'
          )
          .transform(resolveAddress),
        amount: z
          .string()
          .describe(
            'The amount of tokens to approve. Use "max" for maximum approval or specify a number'
          ),
        decimals: z
          .number()
          .optional()
          .describe(
            'The number of decimals of the token. If not provided, will read it from the token contract'
          ),
        callback: z
          .string()
          .optional()
          .describe('The callback to call after approving the token'),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ token, spender, amount, decimals, callback, isCallback }) => {
      if (token === undefined) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'UNKNOWN TOKEN',
              }),
            },
          ],
        };
      }

      if (spender === undefined) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'UNKNOWN SPENDER',
              }),
            },
          ],
        };
      }

      const account = getAccount(wagmiConfig);
      if (account.address === undefined)
        return checkWalletConnection(
          isCallback,
          `approve ${token} for ${spender} amount ${amount}`
        );

      let parsedAmount: bigint;
      if (amount.toLowerCase() === 'max') {
        parsedAmount = BigInt(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
      } else {
        try {
          parsedAmount = parseUnits(
            amount,
            decimals ??
              (await readContract(wagmiConfig, {
                abi: parseAbi(['function decimals() view returns (uint8)']),
                address: token,
                functionName: 'decimals',
              }))
          );
        } catch {
          return {
            content: [
              {
                type: 'text' as const,
                text: createMCPResponse({
                  status: 'error',
                  message: `Invalid amount format: ${amount}`,
                }),
              },
            ],
          };
        }
      }

      try {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi([
            'function approve(address spender, uint256 amount) external returns (bool)',
          ]),
          address: token,
          functionName: 'approve',
          args: [spender, parsedAmount],
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash: tx,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Successfully approved ${spender} to spend ${
                  amount === 'max' ? 'unlimited' : amount
                } ${token} tokens (tx: ${tx})`,
                nextStep: callback,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `Failed to approve token spending: ${error instanceof Error ? error.message : 'Unknown error'}`,
              }),
            },
          ],
        };
      }
    }
  );
}
