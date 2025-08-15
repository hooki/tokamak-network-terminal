import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccount, readContract, writeContract } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import type { Address } from 'viem';
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
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        token: z
          .string()
          .describe(
            'The token address or name to approve spending for (e.g., "TON", "WTON", or a contract address)'
          ),
        spender: z
          .string()
          .describe(
            'The address or name of the spender(e.g., "TON", "WTON", or a contract address) that will be approved to spend the tokens'
          ),
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
    async ({
      token,
      spender,
      amount,
      network = 'mainnet',
      decimals,
      callback,
      isCallback,
    }) => {
      const resolvedToken = resolveTokenAddress(token, network);
      const resolvedSpender = resolveAddress(spender, network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      if (resolvedToken === undefined) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `UNKNOWN TOKEN on ${network}`,
              }),
            },
          ],
        };
      }

      if (resolvedSpender === undefined) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `UNKNOWN SPENDER on ${network}`,
              }),
            },
          ],
        };
      }

      const account = getAccount(wagmiConfig);
      if (account.address === undefined)
        return checkWalletConnection(
          isCallback,
          `approve ${token} for ${spender} amount ${amount} --network ${network}`
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
                address: resolvedToken,
                functionName: 'decimals',
                chainId,
              }))
          );
        } catch {
          return {
            content: [
              {
                type: 'text' as const,
                text: createMCPResponse({
                  status: 'error',
                  message: `Invalid amount format on ${network}`,
                }),
              },
            ],
          };
        }
      }

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function approve(address, uint256)']),
        address: resolvedToken,
        functionName: 'approve',
        args: [resolvedSpender, parsedAmount],
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Approve ${amount} tokens from ${token} to ${spender} successfully on ${network} (tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
