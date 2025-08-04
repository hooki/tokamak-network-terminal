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
    'get-staked-balance',
    {
      title: 'Get staked balance for Layer2 operator(s)',
      description: new DescriptionBuilder(
        "Get the amount of staked WTON to one or multiple Layer2 operators. You can specify operators by name (e.g., 'hammer', 'tokamak1', 'level') or by address."
      )
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        layer2Identifiers: z
          .union([
            z.string().describe("Single Layer2 operator identifier"),
            z.array(z.string()).describe("Multiple Layer2 operator identifiers")
          ])
          .describe(
            "The Layer2 operator identifier(s) - can be a single name/address or array of names/addresses (e.g., 'hammer', ['hammer', 'level', 'tokamak1'])"
          ),
        walletAddress: z
          .string()
          .describe('The wallet address to check'),
      },
    },
    async ({ layer2Identifiers, walletAddress, network = 'mainnet' }) => {
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

      // Convert single identifier to array for consistent processing
      const identifiers = Array.isArray(layer2Identifiers) ? layer2Identifiers : [layer2Identifiers];

      try {
        // Prepare contracts for all identifiers
        const contracts = [];
        for (const identifier of identifiers) {
          const targetAddress = resolveLayer2Address(identifier, network);
          contracts.push({
            address: networkAddresses.SEIG_MANAGER,
            abi: parseAbi(['function stakeOf(address,address) view returns (uint256)']),
            functionName: 'stakeOf',
            args: [targetAddress, walletAddress as `0x${string}`],
            chainId,
          });
        }

        const results = await readContracts(wagmiConfig, { contracts });

        // Process results for each identifier
        const stakingResults = [];
        for (let i = 0; i < identifiers.length; i++) {
          const stakedAmount = results[i].result as bigint;

          if (stakedAmount === undefined) {
            throw new Error(`Failed to read contract data for ${identifiers[i]}`);
          }

          const formattedAmount = formatUnits(stakedAmount, 27);
          stakingResults.push({
            identifier: identifiers[i],
            amount: formattedAmount,
          });
        }

        // Create response message
        let message = '';
        if (identifiers.length === 1) {
          message = `${stakingResults[0].amount} staked WTON to ${identifiers[0]} on ${network} (address: ${walletAddress})`;
        } else {
          message = `Staked amounts for ${walletAddress} on ${network}:\n`;
          stakingResults.forEach(result => {
            message += `• ${result.identifier}: ${result.amount} WTON\n`;
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message,
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
                message: `Failed to get staked amounts for ${identifiers.join(', ')} on ${network}: ${error}`,
              }),
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    'get-total-staked',
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
                message: `Total ${formattedAmount} WTON staked by ${walletAddress} across all Layer2 operators on ${network}`,
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
        "Get the total amount of staked WTON to a specific Layer2 operator across all users."
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
                message: `Total ${formattedAmount} WTON staked to ${layer2Identifier} on ${network}`,
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