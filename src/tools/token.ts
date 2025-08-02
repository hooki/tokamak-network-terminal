import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getBalance, readContract } from '@wagmi/core';
import type { Address } from 'viem';
import { formatEther, parseAbi } from 'viem';
import { z } from 'zod';
import { TOKENS } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';

export function registerTokenTools(server: McpServer) {
  server.registerTool(
    'get-ethereum-balance',
    {
      title: 'Get Ethereum (Native) token balance',
      description: new DescriptionBuilder(
        'Get the Ethereum (Native) token balance of a specific address.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        address: z
          .string()
          .describe('The address to get the balance of')
          .transform((address) => address as Address),
      },
    },
    async ({ address }: { address: Address }) => {
      const balance = await getBalance(wagmiConfig, {
        address: address,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `${address} balance is ${formatEther(balance.value)}`,
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'get-token-balance',
    {
      title: 'Get token balance',
      description: new DescriptionBuilder(
        'Get the token balance of a specific address. You can specify the token by name (e.g., "TON", "WTON") or by address.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        address: z
          .string()
          .describe('The address to get the balance of')
          .transform((address) => address as Address),
        tokenAddressOrName: z
          .string()
          .optional()
          .describe(
            'The token address or name to get the balance of (e.g., "TON", "WTON")'
          )
          .transform((address) => address as Address | string),
      },
    },
    async ({
      address,
      tokenAddressOrName,
    }: {
      address: Address;
      tokenAddressOrName: Address | string;
    }) => {
      let tokenAddress: Address;
      if (tokenAddressOrName.startsWith('0x')) {
        tokenAddress = tokenAddressOrName as Address;
      } else {
        if (!(tokenAddressOrName in TOKENS)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: createMCPResponse({
                  status: 'error',
                  message: 'Invalid token name',
                }),
              },
            ],
          };
        }

        tokenAddress = TOKENS[tokenAddressOrName as keyof typeof TOKENS];
      }

      const balance = await readContract(wagmiConfig, {
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        address: tokenAddress,
        functionName: 'balanceOf',
        args: [address],
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `${address} balance is ${formatEther(balance)}`,
            }),
          },
        ],
      };
    }
  );
}
