import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { writeContract } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { encodeAbiParameters, parseAbi, parseEther } from 'viem';
import { z } from 'zod';
import { DEPOSIT_MANAGER, TON_ADDRESS, WTON_ADDRESS, getNetworkAddresses } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { resolveLayer2Address } from '../utils/layer2.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerStakeTools(server: McpServer) {
  server.registerTool(
    'stake-tokens',
    {
      title: 'Stake tokens to Layer2 operator',
      description: new DescriptionBuilder(
        "Deposit and stake a specified amount of tokens to a Layer2 network operator. You can specify the operator by name (e.g., 'hammer', 'level123') or by address."
      )
        .withWalletConnect()
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
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1, 'level') or a full address"
          ),
        tokenAmount: z.string().describe('The amount of tokens to stake'),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, tokenAmount, network = 'mainnet', isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      const callbackCommand = `stake-tokens ${targetAddress} ${tokenAmount} --network ${network}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck && !walletCheck.isConnected) return walletCheck;

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function approveAndCall(address, uint256, bytes)']),
        address: networkAddresses.TON_ADDRESS,
        functionName: 'approveAndCall',
        args: [
          networkAddresses.WTON_ADDRESS,
          parseEther(tokenAmount),
          encodeAbiParameters(
            [{ type: 'address' }, { type: 'address' }],
            [networkAddresses.DEPOSIT_MANAGER, targetAddress]
          ),
        ],
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Stake tokens successfully on ${network} (tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'update-seigniorage',
    {
      title: 'Update seigniorage',
      description: new DescriptionBuilder(
        'Update the seigniorage of the token for a Layer2 operator'
      )
        .withWalletConnect()
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
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address"
          ),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, network = 'mainnet', isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      const callbackCommand = `update-seigniorage ${targetAddress} --network ${network}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck && !walletCheck.isConnected) return walletCheck;

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function updateSeigniorage()']),
        address: targetAddress,
        functionName: 'updateSeigniorage',
        args: [],
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Update seigniorage successfully on ${network} (tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
