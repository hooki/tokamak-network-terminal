import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  getBlockNumber,
  readContract,
  writeContract,
  readContracts,
} from '@wagmi/core';
import { formatUnits, parseAbi } from 'viem';
import { z } from 'zod';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { getNetworkAddresses } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { resolveLayer2Address } from '../utils/layer2.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerWithdrawTools(server: McpServer) {
  server.registerTool(
    'pending-withdrawal-requests',
    {
      title: 'Get pending withdrawal requests',
      description: new DescriptionBuilder(
        'Get pending withdrawal requests from a Layer2 network operator. You can specify the operator by name (e.g., "hammer", "arbitrum") or by address.'
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
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address"
          ),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, network = 'mainnet', isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const callbackCommand = `pending-withdrawal-requests ${targetAddress} --network ${network}`;
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck && !walletCheck.isConnected) return walletCheck;

      const account = getAccount(wagmiConfig);

      const abi = parseAbi([
        'function withdrawalRequestIndex(address layer2, address account) view returns (uint256 index)',
        'function numRequests(address layer2, address account) view returns (uint256)',
        'function withdrawalRequest(address layer2, address account, uint256 index) view returns (uint128 withdrawableBlockNumber, uint128 amount, bool processed)',
      ]);

      const [...contractResults] = await readContracts(wagmiConfig, {
          contracts: [
            {
              abi,
              address: networkAddresses.DEPOSIT_MANAGER,
              functionName: 'withdrawalRequestIndex',
              args: [targetAddress, account.address as `0x${string}`],
              chainId,
            },
            {
              abi,
              address: networkAddresses.DEPOSIT_MANAGER,
              functionName: 'numRequests',
              args: [targetAddress, account.address as `0x${string}`],
              chainId,
            },
          ],
        })

      const withdrawalRequestIndex = contractResults[0].result as bigint;
      const numRequests = contractResults[1].result as bigint;

      // 동적으로 생성되는 배열을 배치로 나누어 멀티콜 처리
      const requestCount = Number(numRequests - withdrawalRequestIndex);
      const batchSize = 10; // 한 번에 처리할 요청 수
      const pendingWithdrawalRequests: [bigint, bigint, boolean][] = []; // uint128 withdrawableBlockNumber, uint128 amount, bool processed

      for (let i = 0; i < requestCount; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, requestCount - i) },
          (_, j) => ({
            abi,
            address: networkAddresses.DEPOSIT_MANAGER,
            functionName: 'withdrawalRequest',
            args: [
              targetAddress,
              account.address as `0x${string}`,
              withdrawalRequestIndex + BigInt(i + j),
            ],
            chainId,
          })
        );

        const batchResults = await readContracts(wagmiConfig, {
          contracts: batch,
        });

        batchResults.forEach((result: any) => {
          if (result.status === 'success' && result.result) {
            const request = result.result as [bigint, bigint, boolean];
            if (request[1] !== 0n && !request[2]) {
              pendingWithdrawalRequests.push(request);
            }
          }
        });
      }

      if (pendingWithdrawalRequests.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `No withdrawal request found on ${network}`,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: JSON.stringify(
                pendingWithdrawalRequests.map((request) => ({
                  withdrawableBlockNumber: request[0].toString(), // BigInt → string
                  amount: formatUnits(request[1], 27),
                  processed: request[2],
                })),
                null,
                2
              ),
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    'withdraw-tokens',
    {
      title: 'Withdraw tokens',
      description: new DescriptionBuilder(
        "Withdraw tokens from a Layer2 network operator. You can specify the operator by name (e.g., 'hammer', 'tokamak1', 'level') or by address."
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
            "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address"
          ),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ layer2Identifier, network = 'mainnet', isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier, network);
      const networkAddresses = getNetworkAddresses(network);
      const callbackCommand = `withdraw-tokens ${targetAddress} --network ${network}`;
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck && !walletCheck.isConnected) return walletCheck;

      const account = getAccount(wagmiConfig);

      const abi = parseAbi([
        'function withdrawalRequestIndex(address layer2, address account) view returns (uint256 index)',
        'function numRequests(address layer2, address account) view returns (uint256)',
        'function withdrawalRequest(address layer2, address account, uint256 index) view returns (uint128 withdrawableBlockNumber, uint128 amount, bool processed)',
        'function processRequest(address layer2, bool receiveTON)',
      ]);

      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            abi,
            address: networkAddresses.DEPOSIT_MANAGER,
            functionName: 'withdrawalRequestIndex',
            args: [targetAddress, account.address as `0x${string}`],
            chainId,
          },
          {
            abi,
            address: networkAddresses.DEPOSIT_MANAGER,
            functionName: 'numRequests',
            args: [targetAddress, account.address as `0x${string}`],
            chainId,
          },
        ],
      });


      const withdrawalRequestIndex = results[0].result as bigint;
      const numRequests = results[1].result as bigint;

      // 동적으로 생성되는 배열을 배치로 나누어 멀티콜 처리
      const requestCount = Number(numRequests - withdrawalRequestIndex);
      const batchSize = 10; // 한 번에 처리할 요청 수
      const pendingWithdrawalRequests: [bigint, bigint, boolean][] = [];

      for (let i = 0; i < requestCount; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, requestCount - i) },
          (_, j) => ({
            abi,
            address: networkAddresses.DEPOSIT_MANAGER,
            functionName: 'withdrawalRequest',
            args: [
              targetAddress,
              account.address as `0x${string}`,
              withdrawalRequestIndex + BigInt(i + j),
            ],
            chainId,
          })
        );

        const batchResults = await readContracts(wagmiConfig, {
          contracts: batch,
        });

        batchResults.forEach((result: any) => {
          if (result.status === 'success' && result.result) {
            const request = result.result as [bigint, bigint, boolean];
            if (request[1] !== 0n && !request[2]) {
              pendingWithdrawalRequests.push(request);
            }
          }
        });
      }

      if (pendingWithdrawalRequests.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `No withdrawal request found on ${network}`,
              }),
            },
          ],
        };
      }

      const tx = await writeContract(wagmiConfig, {
        abi,
        address: networkAddresses.DEPOSIT_MANAGER,
        functionName: 'processRequest',
        args: [targetAddress, true],
        chainId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Withdraw tokens successfully on ${network} (tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
