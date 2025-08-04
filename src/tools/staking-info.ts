import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readContracts } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { formatUnits, parseAbi } from 'viem';
import { z } from 'zod';
import { getNetworkAddresses } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { resolveLayer2Address } from '../utils/layer2.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerStakingInfoTools(server: McpServer) {
  server.registerTool(
    'get-staked-amount-user',
    {
      title: 'Get staked amount for Layer2 operator',
      description: new DescriptionBuilder(
        "Get the amount of tokens staked to a specific Layer2 operator. You can specify the operator by name (e.g., 'hammer', 'tokamak1', 'level') or by address."
      )
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        layer2Identifier: z
          .string()
          .describe(
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address"
          ),
        walletAddress: z
          .string()
          .describe('The wallet address to check'),
      },
    },
    async ({ layer2Identifier, walletAddress, network = 'mainnet' }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      if (!walletAddress) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'Wallet address is required',
              }),
            },
          ],
        };
      }

      try {
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.SEIG_MANAGER,
              abi: parseAbi(['function stakeOf(address,address) view returns (uint256)']),
              functionName: 'stakeOf',
              args: [targetAddress, walletAddress as `0x${string}`],
              chainId,
            },
            {
              address: networkAddresses.SEIG_MANAGER,
              abi: parseAbi(['function stakeOf(address) view returns (uint256)']),
              functionName: 'stakeOf',
              args: [ walletAddress as `0x${string}`],
              chainId,
            },
          ],
        });

        const stakedAmountInTargetLayer = results[0].result as bigint;
        const stakedAmountTotal = results[1].result as bigint;

        // Check if results are valid
        if (stakedAmountInTargetLayer === undefined || stakedAmountTotal === undefined) {
          throw new Error('Failed to read contract data');
        }

        const formattedAmount = formatUnits(stakedAmountInTargetLayer, 27);
        const formattedAmountTotal = formatUnits(stakedAmountTotal, 27);

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `${formattedAmount} staked TON to ${layer2Identifier} on ${network} (address: ${walletAddress})
                \n (total staked TON: ${formattedAmountTotal})`,
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
                message: `Failed to get staked amount for ${layer2Identifier} on ${network}: ${error}`,
              }),
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    'get-total-staked-amount-user',
    {
      title: 'Get total staked amount for user across all Layer2 operators',
      description: new DescriptionBuilder(
        "Get the total amount of tokens staked by a specific user across all Layer2 operators."
      )
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        walletAddress: z
          .string()
          .describe('The wallet address to check'),
      },
    },
    async ({ walletAddress, network = 'mainnet' }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      if (!walletAddress) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'Wallet address is required',
              }),
            },
          ],
        };
      }

      try {
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.SEIG_MANAGER,
              abi: parseAbi(['function stakeOf(address) view returns (uint256)']),
              functionName: 'stakeOf',
              args: [walletAddress as `0x${string}`],
              chainId,
            },
          ],
        });

        const totalStaked = results[0].result as bigint;

        // Check if results are valid
        if (totalStaked === undefined) {
          throw new Error('Failed to read contract data');
        }

        const formattedAmount = formatUnits(totalStaked, 27);

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Total ${formattedAmount} TON staked by ${walletAddress} across all Layer2 operators on ${network}`,
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
                message: `Failed to get total staked amount for ${walletAddress} on ${network}: ${error}`,
              }),
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    'get-total-staked-layer',
    {
      title: 'Get total staked amount for Layer2 operator',
      description: new DescriptionBuilder(
        "Get the total amount of tokens staked to a specific Layer2 operator across all users."
      )
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        layer2Identifier: z
          .string()
          .describe(
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address"
          ),
      },
    },
    async ({ layer2Identifier, network = 'mainnet' }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: targetAddress,
              abi: parseAbi(['function totalStaked() view returns (uint256)']),
              functionName: 'totalStaked',
              chainId,
            },
            {
              address: targetAddress,
              abi: parseAbi(['function decimals() view returns (uint8)']),
              functionName: 'decimals',
              chainId,
            },
          ],
        });

        const totalStaked = results[0].result as bigint;
        const decimals = results[1].result as number;

        const formattedAmount = formatUnits(totalStaked, decimals);

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Total ${formattedAmount} tokens staked to ${layer2Identifier} on ${network}`,
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
                message: `Failed to get total staked amount for ${layer2Identifier} on ${network}: ${error}`,
              }),
            },
          ],
        };
      }
    }
  );
}