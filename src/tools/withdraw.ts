import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  getBlockNumber,
  readContract,
  writeContract,
} from '@wagmi/core';
import { formatUnits, parseAbi } from 'viem';
import { z } from 'zod';
import { DEPOSIT_MANAGER } from '../constants.js';
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
    async ({ layer2Identifier, isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier);
      const callbackCommand = `pending-withdrawal-requests ${targetAddress}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck) return walletCheck;

      const account = getAccount(wagmiConfig);

      const abi = parseAbi([
        'function withdrawalRequestIndex(address layer2, address account) view returns (uint256 index)',
        'function numRequests(address layer2, address account) view returns (uint256)',
        'function withdrawalRequest(address layer2, address account, uint256 index) view returns (uint128 withdrawableBlockNumber, uint128 amount, bool processed)',
      ]);

      const [blockNumber, withdrawalRequestIndex, numRequests] =
        await Promise.all([
          getBlockNumber(wagmiConfig),
          readContract(wagmiConfig, {
            abi,
            address: DEPOSIT_MANAGER,
            functionName: 'withdrawalRequestIndex',
            args: [targetAddress, account.address as `0x${string}`],
          }),
          readContract(wagmiConfig, {
            abi,
            address: DEPOSIT_MANAGER,
            functionName: 'numRequests',
            args: [targetAddress, account.address as `0x${string}`],
          }),
        ]);

      const pendingWithdrawalRequests = (
        await Promise.all(
          Array.from(
            { length: Number(numRequests - withdrawalRequestIndex) },
            async (_, i) => {
              return readContract(wagmiConfig, {
                abi,
                address: DEPOSIT_MANAGER,
                functionName: 'withdrawalRequest',
                args: [
                  targetAddress,
                  account.address as `0x${string}`,
                  withdrawalRequestIndex + BigInt(i),
                ],
              });
            }
          )
        )
      ).filter((request) => request[1] !== 0n && !request[2]);

      if (pendingWithdrawalRequests.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `No withdrawal request found`,
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
                pendingWithdrawalRequests.map((r) => ({
                  amount: formatUnits(r[1], 27),
                  withdrawalDelayBlock: Number(r[0] - blockNumber),
                }))
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
      title: 'Withdraw tokens from Layer2 operator',
      description: new DescriptionBuilder(
        'Withdraw a specified amount of tokens from a Layer2 network operator. You can specify the operator by name (e.g., "hammer", "arbitrum") or by address.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
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
    async ({ layer2Identifier, isCallback }) => {
      const targetAddress = resolveLayer2Address(layer2Identifier);
      const callbackCommand = `withdraw-tokens ${targetAddress}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck) return walletCheck;

      const account = getAccount(wagmiConfig);
      const withdrawalIndex = await readContract(wagmiConfig, {
        abi: parseAbi([
          'function withdrawalRequestIndex(address layer2, address account) view returns (uint256 index)',
        ]),
        address: DEPOSIT_MANAGER,
        functionName: 'withdrawalRequestIndex',
        args: [targetAddress, account.address as `0x${string}`],
      });

      const blockNumber = await getBlockNumber(wagmiConfig);

      const withdrawalRequest = await readContract(wagmiConfig, {
        abi: parseAbi([
          'function withdrawalRequest(address layer2, address account, uint256 index) view returns (uint128 withdrawableBlockNumber, uint128 amount, bool processed)',
        ]),
        address: DEPOSIT_MANAGER,
        functionName: 'withdrawalRequest',
        args: [
          targetAddress,
          account.address as `0x${string}`,
          withdrawalIndex,
        ],
      });

      if (withdrawalRequest[1] === 0n || withdrawalRequest[2]) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `No withdrawal request found`,
              }),
            },
          ],
        };
      }

      if (withdrawalRequest[0] > blockNumber) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Withdrawal request not yet processed, please wait for ${withdrawalRequest[0] - blockNumber} blocks`,
              }),
            },
          ],
        };
      }

      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function processRequest(address, address)']),
        address: DEPOSIT_MANAGER,
        functionName: 'processRequest',
        args: [targetAddress, account.address as `0x${string}`],
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'success',
              message: `Withdraw tokens successfully(tx: ${tx})`,
            }),
          },
        ],
      };
    }
  );
}
