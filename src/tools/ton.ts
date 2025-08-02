import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core';
import { isAddress, isAddressEqual, parseAbi, parseUnits } from 'viem';
import { z } from 'zod';
import { TON_ADDRESS, WTON_ADDRESS } from '../constants.js';
import { checkApproval } from '../utils/approve.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { getTokenBalance, getTokenDecimals } from '../utils/erc20.js';
import { createMCPResponse } from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerTONCommands(server: McpServer) {
  server.registerTool(
    'wrap-ton',
    {
      title: 'Wrap TON tokens to WTON',
      description: new DescriptionBuilder(
        'Wrap(also known as Swap, Convert) a specified amount of TON tokens to WTON.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        tokenAmount: z.string().describe('The amount of tokens to wrap'),
        transferToAddress: z
          .string()
          .describe('The destination address to send the wrapped tokens to')
          .optional(),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ tokenAmount, transferToAddress, isCallback }) => {
      let callbackCommand = `wrap-ton ${tokenAmount}`;
      if (transferToAddress)
        callbackCommand += ` and transfer to ${transferToAddress}`;

      const account = getAccount(wagmiConfig)?.address;
      if (!account)
        return await checkWalletConnection(isCallback, callbackCommand);

      // Get the connected wallet address
      // check if the token amount is greater than the balance
      const [balance, decimals] = await Promise.all([
        getTokenBalance(TON_ADDRESS, account),
        getTokenDecimals(TON_ADDRESS),
      ]);
      if (balance < parseUnits(tokenAmount, decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'Insufficient balance',
              }),
            },
          ],
        };
      }

      const approvalCheck = await checkApproval(
        account,
        TON_ADDRESS,
        decimals,
        WTON_ADDRESS,
        parseUnits(tokenAmount, decimals),
        callbackCommand
      );
      if (approvalCheck) return approvalCheck;

      if (transferToAddress && isAddress(transferToAddress)) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapFromTONAndTransfer(address, uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapFromTONAndTransfer',
          args: [transferToAddress, parseUnits(tokenAmount, decimals)],
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
                message: `Wrap TON tokens to WTON and transfer to ${transferToAddress} successfully ${tx}`,
              }),
            },
          ],
        };
      } else {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapFromTON(uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapFromTON',
          args: [parseUnits(tokenAmount, decimals)],
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
                message: `Wrap TON tokens to WTON successfully ${tx}`,
              }),
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    'unwrap-wton',
    {
      title: 'Unwrap WTON tokens to TON',
      description: new DescriptionBuilder(
        'Unwrap(also known as Swap, Convert) a specified amount of WTON tokens to TON.'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        tokenAmount: z.string().describe('The amount of tokens to unwrap'),
        transferToAddress: z
          .string()
          .describe('The destination address to send the unwrapped tokens to')
          .optional(),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({ tokenAmount, transferToAddress, isCallback }) => {
      let callbackCommand = `unwrap-wton ${tokenAmount}`;
      if (transferToAddress)
        callbackCommand += ` and transfer to ${transferToAddress}`;

      const account = getAccount(wagmiConfig)?.address;
      if (!account)
        return await checkWalletConnection(isCallback, callbackCommand);

      const [balance, decimals] = await Promise.all([
        getTokenBalance(WTON_ADDRESS, account),
        getTokenDecimals(WTON_ADDRESS),
      ]);

      // check if the token amount is greater than the balance
      if (balance < parseUnits(tokenAmount, decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: 'Insufficient balance',
              }),
            },
          ],
        };
      }

      const approvalCheck = await checkApproval(
        account,
        WTON_ADDRESS,
        decimals,
        WTON_ADDRESS,
        parseUnits(tokenAmount, decimals),
        callbackCommand
      );
      if (approvalCheck) return approvalCheck;

      if (
        transferToAddress &&
        isAddress(transferToAddress) &&
        !isAddressEqual(transferToAddress, account)
      ) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapToTONAndTransfer(address, uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapToTONAndTransfer',
          args: [transferToAddress, parseUnits(tokenAmount, decimals)],
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
                message: `Unwrap WTON tokens to TON and transfer to ${transferToAddress} successfully: $tx`,
              }),
            },
          ],
        };
      } else {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapToTON(uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapToTON',
          args: [parseUnits(tokenAmount, decimals)],
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
                message: `Unwrap WTON tokens to TON successfully: $tx`,
              }),
            },
          ],
        };
      }
    }
  );
}
