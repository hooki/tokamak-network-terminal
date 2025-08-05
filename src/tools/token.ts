import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getBalance, readContracts } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import type { Address } from 'viem';
import { formatEther, formatUnits, parseAbi } from 'viem';
import { z } from 'zod';
import { getNetworkTokens } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { getTokenBalance, getTokenDecimals } from '../utils/erc20.js';
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
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        address: z
          .string()
          .describe('The address to get the balance of')
          .transform((address) => address as Address),
      },
    },
    async ({ address, network = 'mainnet' }: { address: Address; network?: string }) => {
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      const balance = await getBalance(wagmiConfig, {
        address: address,
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `${address} balance is ${formatEther(balance.value)} on ${network}`,
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
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
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
      network = 'mainnet',
    }: {
      address: Address;
      tokenAddressOrName: Address | string;
      network?: string;
    }) => {
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      let tokenAddress: Address;
      const networkTokens = getNetworkTokens(network);

      if (tokenAddressOrName.startsWith('0x')) {
        tokenAddress = tokenAddressOrName as Address;
      } else {
        if (!(tokenAddressOrName in networkTokens)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: createMCPResponse({
                  status: 'error',
                  message: `Invalid token name on ${network}`,
                }),
              },
            ],
          };
        }

        tokenAddress = networkTokens[tokenAddressOrName as keyof typeof networkTokens];
      }

      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            address: tokenAddress,
            abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
            functionName: 'balanceOf',
            args: [address],
            chainId,
          },
          {
            address: tokenAddress,
            abi: parseAbi(['function decimals() view returns (uint8)']),
            functionName: 'decimals',
            chainId,
          },
        ],
      });

      const balance = results[0].result as bigint;
      const decimals = results[1].result as number;

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `${address} balance is ${formatUnits(balance, decimals)} on ${network}`,
            }),
          },
        ],
      };
    }
  );
}
