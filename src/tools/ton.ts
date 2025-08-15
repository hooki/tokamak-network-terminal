import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  waitForTransactionReceipt,
  writeContract,
  readContracts,
} from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import {
  encodeAbiParameters,
  isAddress,
  isAddressEqual,
  parseAbi,
  parseEther,
  parseUnits,
} from 'viem';
import { z } from 'zod';
import { getNetworkAddresses } from '../constants.js';
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
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
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
    async ({
      tokenAmount,
      transferToAddress,
      network = 'mainnet',
      isCallback,
    }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      let callbackCommand = `wrap-ton ${tokenAmount} --network ${network}`;
      if (transferToAddress)
        callbackCommand += ` and transfer to ${transferToAddress}`;

      const account = getAccount(wagmiConfig)?.address;
      if (!account)
        return await checkWalletConnection(isCallback, callbackCommand);

      // Get the connected wallet address
      // check if the token amount is greater than the balance
      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            address: networkAddresses.TON_ADDRESS,
            abi: parseAbi([
              'function balanceOf(address) view returns (uint256)',
            ]),
            functionName: 'balanceOf',
            args: [account],
            chainId,
          },
          {
            address: networkAddresses.TON_ADDRESS,
            abi: parseAbi(['function decimals() view returns (uint8)']),
            functionName: 'decimals',
            chainId,
          },
        ],
      });

      const balance = results[0].result as bigint;
      const decimals = results[1].result as number;
      if (balance < parseUnits(tokenAmount, decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `Insufficient balance on ${network}`,
              }),
            },
          ],
        };
      }

      // SwapProxy를 이용한 Wrap TON to WTON
      const tx = await writeContract(wagmiConfig, {
        abi: parseAbi(['function approveAndCall(address, uint256, bytes)']),
        address: networkAddresses.TON_ADDRESS,
        functionName: 'approveAndCall',
        args: [
          networkAddresses.WTON_ADDRESS,
          parseEther(tokenAmount),
          encodeAbiParameters(
            [{ type: 'address' }, { type: 'address' }],
            [networkAddresses.SWAPPROXY, networkAddresses.SWAPPROXY]
          ),
        ],
        chainId,
      });

      await waitForTransactionReceipt(wagmiConfig, {
        hash: tx,
        chainId,
      });

      if (
        transferToAddress &&
        isAddress(transferToAddress) &&
        account !== transferToAddress
      ) {
        const tx1 = await writeContract(wagmiConfig, {
          abi: parseAbi(['function transfer(address, uint256)']),
          address: networkAddresses.WTON_ADDRESS,
          functionName: 'transfer',
          args: [transferToAddress, parseUnits(tokenAmount, decimals)],
          chainId,
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash: tx1,
          chainId,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Wrap TON tokens to WTON and transfer to ${account} successfully on ${network} (wrap tx: ${tx}) and (transfer tx: ${tx1})`,
              }),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Wrap TON tokens to WTON and transfer to ${account} successfully on ${network} (tx: ${tx})`,
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
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
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
    async ({
      tokenAmount,
      transferToAddress,
      network = 'mainnet',
      isCallback,
    }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      let callbackCommand = `unwrap-wton ${tokenAmount} --network ${network}`;
      if (transferToAddress)
        callbackCommand += ` and transfer to ${transferToAddress}`;

      const account = getAccount(wagmiConfig)?.address;
      if (!account)
        return await checkWalletConnection(isCallback, callbackCommand);

      // Get the connected wallet address
      // check if the token amount is greater than the balance
      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            address: networkAddresses.WTON_ADDRESS,
            abi: parseAbi([
              'function balanceOf(address) view returns (uint256)',
            ]),
            functionName: 'balanceOf',
            args: [account],
            chainId,
          },
          {
            address: networkAddresses.WTON_ADDRESS,
            abi: parseAbi(['function decimals() view returns (uint8)']),
            functionName: 'decimals',
            chainId,
          },
        ],
      });

      const balance = results[0].result as bigint;
      const decimals = results[1].result as number;
      if (balance < parseUnits(tokenAmount, decimals)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `Insufficient balance on ${network}`,
              }),
            },
          ],
        };
      }

      if (!transferToAddress || account === transferToAddress) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapToTON(uint256)']),
          address: networkAddresses.WTON_ADDRESS,
          functionName: 'swapToTON',
          args: [parseUnits(tokenAmount, decimals)],
          chainId,
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash: tx,
          chainId,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Unwrap WTON tokens to TON and transfer to ${transferToAddress} successfully on ${network} (tx: ${tx})`,
              }),
            },
          ],
        };
      } else if (
        transferToAddress &&
        isAddress(transferToAddress) &&
        account !== transferToAddress
      ) {
        const tx = await writeContract(wagmiConfig, {
          abi: parseAbi(['function swapToTONAndTransfer(address, uint256)']),
          address: networkAddresses.WTON_ADDRESS,
          functionName: 'swapToTONAndTransfer',
          args: [transferToAddress, parseUnits(tokenAmount, decimals)],
          chainId,
        });

        await waitForTransactionReceipt(wagmiConfig, {
          hash: tx,
          chainId,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'success',
                message: `Unwrap WTON tokens to TON and transfer to ${transferToAddress} successfully on ${network} (tx: ${tx})`,
              }),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: createMCPResponse({
                status: 'error',
                message: `Invalid transferToAddress on ${network}`,
              }),
            },
          ],
        };
      }
    }
  );
}
