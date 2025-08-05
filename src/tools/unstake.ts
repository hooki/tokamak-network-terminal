import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { writeContract, readContracts, getAccount } from '@wagmi/core';
import { parseAbi, parseUnits } from 'viem';
import { z } from 'zod';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { getNetworkAddresses } from '../constants.js';
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
        tokenAmount: z.string().describe('The amount of tokens to unstake'),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, tokenAmount, network = 'mainnet', isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const callbackCommand = `unstake-tokens ${targetAddress} ${tokenAmount} --network ${network}`;
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck && !walletCheck.isConnected) return walletCheck;
      const account = getAccount(wagmiConfig)?.address;

      // 스테이킹된 금액이 충분한지 확인한다.
      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            address: networkAddresses.SEIG_MANAGER,
            abi: parseAbi(['function stakeOf(address,address) view returns (uint256)']),
            functionName: 'stakeOf',
            args: [targetAddress, account as `0x${string}`],
            chainId,
          },
        ],
      });

      const stakedAmount = results[0].result as bigint;
      if (stakedAmount < parseUnits(tokenAmount, 27)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `Insufficient staked amount of ${layer2Identifier} on ${network} (staked amount: ${stakedAmount}, token amount: ${tokenAmount})`,
              }),
            },
          ],
        };
      }

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function requestWithdrawal(address, uint256)']),
        address: networkAddresses.DEPOSIT_MANAGER,
        functionName: 'requestWithdrawal',
        args: [targetAddress, parseUnits(tokenAmount, 27)],
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Unstake tokens successfully on ${network} (tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
