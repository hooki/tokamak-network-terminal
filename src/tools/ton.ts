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
import { getTokenBalance, getTokenInfo } from '../utils/erc20.js';
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
      const callbackCommand = `wrap-ton ${tokenAmount} and transfer to ${transferToAddress}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck) return walletCheck;

      const tokenInfo = await getTokenInfo(TON_ADDRESS);

      // Get the connected wallet address
      const account = getAccount(wagmiConfig);
      const connectedAddress = account.address as `0x${string}`;

      // check if the token amount is greater than the balance
      const balance = await getTokenBalance(TON_ADDRESS, connectedAddress);
      if (balance < parseUnits(tokenAmount, tokenInfo.decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'failure',
                message: 'Insufficient balance',
              }),
            },
          ],
        };
      }

      const approvalCheck = await checkApproval(
        connectedAddress,
        TON_ADDRESS,
        tokenInfo.decimals,
        WTON_ADDRESS,
        parseUnits(tokenAmount, tokenInfo.decimals),
        callbackCommand
      );
      if (approvalCheck) return approvalCheck;

      if (transferToAddress && isAddress(transferToAddress)) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapFromTONAndTransfer(address, uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapFromTONAndTransfer',
          args: [
            transferToAddress,
            parseUnits(tokenAmount, tokenInfo.decimals),
          ],
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
          args: [parseUnits(tokenAmount, tokenInfo.decimals)],
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
      const callbackCommand = `unwrap-wton ${tokenAmount} and transfer to ${transferToAddress}`;

      const walletCheck = await checkWalletConnection(
        isCallback,
        callbackCommand
      );
      if (walletCheck) return walletCheck;

      const tokenInfo = await getTokenInfo(WTON_ADDRESS);

      // Get the connected wallet address
      const account = getAccount(wagmiConfig);
      const connectedAddress = account.address as `0x${string}`;

      // check if the token amount is greater than the balance
      const balance = await getTokenBalance(WTON_ADDRESS, connectedAddress);
      if (balance < parseUnits(tokenAmount, tokenInfo.decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'failure',
                message: 'Insufficient balance',
              }),
            },
          ],
        };
      }

      const approvalCheck = await checkApproval(
        connectedAddress,
        WTON_ADDRESS,
        tokenInfo.decimals,
        WTON_ADDRESS,
        parseUnits(tokenAmount, tokenInfo.decimals),
        callbackCommand
      );
      if (approvalCheck) return approvalCheck;

      if (
        transferToAddress &&
        isAddress(transferToAddress) &&
        !isAddressEqual(transferToAddress, connectedAddress)
      ) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapToTONAndTransfer(address, uint256)']),
          address: WTON_ADDRESS,
          functionName: 'swapToTONAndTransfer',
          args: [
            transferToAddress,
            parseUnits(tokenAmount, tokenInfo.decimals),
          ],
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
          args: [parseUnits(tokenAmount, tokenInfo.decimals)],
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
