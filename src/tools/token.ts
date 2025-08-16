import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  getBalance,
  readContracts,
  writeContract,
} from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import type { Address } from 'viem';
import {
  formatEther,
  formatUnits,
  isAddress,
  parseAbi,
  parseUnits,
} from 'viem';
import { z } from 'zod';
import { getNetworkTokens } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';

import {
  createErrorResponse,
  createMCPResponse,
  createSuccessResponse,
} from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

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
    async ({
      address,
      network = 'mainnet',
    }: {
      address: Address;
      network?: string;
    }) => {
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
        if (!networkTokens || !(tokenAddressOrName in networkTokens)) {
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

        tokenAddress = networkTokens?.[
          tokenAddressOrName as keyof typeof networkTokens
        ] as Address;
      }

      const results = await readContracts(wagmiConfig, {
        contracts: [
          {
            address: tokenAddress,
            abi: parseAbi([
              'function balanceOf(address) view returns (uint256)',
            ]),
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

  server.registerTool(
    'send-token',
    {
      title: 'Send ERC20 tokens',
      description: new DescriptionBuilder(
        'Send ERC20 tokens to a specified address. You can specify the token by symbol (e.g., "TON", "WTON") or by contract address. Format: "send [amount] [token] to [address]"'
      )
        .withWalletConnect()
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        tokenAddressOrSymbol: z
          .string()
          .describe(
            'The token symbol (e.g., "TON", "WTON") or contract address'
          ),
        amount: z.string().describe('The amount of tokens to send'),
        toAddress: z
          .string()
          .describe('The recipient address')
          .transform((address) => address as Address),
        isCallback: z
          .boolean()
          .optional()
          .describe('If true, indicates this is a callback execution'),
      },
    },
    async ({
      tokenAddressOrSymbol,
      amount,
      toAddress,
      network = 'mainnet',
      isCallback,
    }: {
      tokenAddressOrSymbol: string;
      amount: string;
      toAddress: Address;
      network?: string;
      isCallback?: boolean | undefined;
    }) => {
      try {
        // Input validation
        if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
          return createErrorResponse(
            'Invalid amount. Must be a positive number.'
          );
        }

        if (!isAddress(toAddress)) {
          return createErrorResponse('Invalid recipient address format.');
        }

        const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
        const callbackCommand = `send-token ${tokenAddressOrSymbol} ${amount} ${toAddress} --network ${network}`;

        // Check wallet connection
        const walletCheck = await checkWalletConnection(
          isCallback,
          callbackCommand
        );
        if (walletCheck && !walletCheck.isConnected) return walletCheck;

        // Get connected account
        const connectedAccount = getAccount(wagmiConfig);
        if (!connectedAccount?.address) {
          return createErrorResponse('No wallet connected');
        }

        // Resolve token address
        let tokenAddress: Address;
        let tokenSymbol: string;
        const networkTokens = getNetworkTokens(network);

        if (tokenAddressOrSymbol.startsWith('0x')) {
          // It's an address
          if (!isAddress(tokenAddressOrSymbol)) {
            return createErrorResponse(
              'Invalid token contract address format.'
            );
          }
          tokenAddress = tokenAddressOrSymbol as Address;
          tokenSymbol = tokenAddressOrSymbol; // Use address as symbol for display
        } else {
          // It's a symbol
          const upperSymbol = tokenAddressOrSymbol.toUpperCase();
          if (!networkTokens || !(upperSymbol in networkTokens)) {
            const supportedTokens = networkTokens
              ? Object.keys(networkTokens).join(', ')
              : 'none';
            return createErrorResponse(
              `Unknown token symbol "${tokenAddressOrSymbol}" on ${network}. Supported tokens: ${supportedTokens}`
            );
          }
          tokenAddress = networkTokens?.[
            upperSymbol as keyof typeof networkTokens
          ] as Address;
          tokenSymbol = upperSymbol;
        }

        // Get token decimals and user balance
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: tokenAddress,
              abi: parseAbi(['function decimals() view returns (uint8)']),
              functionName: 'decimals',
              chainId,
            },
            {
              address: tokenAddress,
              abi: parseAbi([
                'function balanceOf(address) view returns (uint256)',
              ]),
              functionName: 'balanceOf',
              args: [connectedAccount.address],
              chainId,
            },
            {
              address: tokenAddress,
              abi: parseAbi(['function symbol() view returns (string)']),
              functionName: 'symbol',
              chainId,
            },
          ],
        });

        if (results.some((r) => r.error)) {
          return createErrorResponse(
            'Failed to read token information. Please verify the token address.'
          );
        }

        const decimals = results[0].result as number;
        const userBalance = results[1].result as bigint;
        const actualSymbol = results[2].result as string;

        // Use actual symbol from contract if available
        if (actualSymbol && tokenAddressOrSymbol.startsWith('0x')) {
          tokenSymbol = actualSymbol;
        }

        // Parse amount with correct decimals
        const amountInWei = parseUnits(amount, decimals);

        // Check if user has sufficient balance
        if (userBalance < amountInWei) {
          const formattedBalance = formatUnits(userBalance, decimals);
          return createErrorResponse(
            `Insufficient balance. You have ${formattedBalance} ${tokenSymbol}, but trying to send ${amount} ${tokenSymbol}.`
          );
        }

        // Execute the transfer
        const txHash = await writeContract(wagmiConfig, {
          address: tokenAddress,
          abi: parseAbi([
            'function transfer(address to, uint256 amount) returns (bool)',
          ]),
          functionName: 'transfer',
          args: [toAddress, amountInWei],
          chainId,
        });

        const formattedBalance = formatUnits(userBalance, decimals);
        const remainingBalance = formatUnits(
          userBalance - amountInWei,
          decimals
        );

        return createSuccessResponse(
          `✅ **Token Transfer Successful on ${network}**\n\n` +
            `**From:** ${connectedAccount.address}\n` +
            `**To:** ${toAddress}\n` +
            `**Token:** ${tokenSymbol} (${tokenAddress})\n` +
            `**Amount:** ${amount} ${tokenSymbol}\n` +
            `**Previous Balance:** ${formattedBalance} ${tokenSymbol}\n` +
            `**Remaining Balance:** ${remainingBalance} ${tokenSymbol}\n` +
            `**Transaction Hash:** ${txHash}\n\n` +
            `🎉 **Success:** Your tokens have been sent successfully!`
        );
      } catch (error: unknown) {
        // Handle specific error cases
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('insufficient funds')) {
          return createErrorResponse(
            'Insufficient ETH balance to pay for gas fees.'
          );
        }

        if (errorMessage.includes('user rejected')) {
          return createErrorResponse('Transaction was rejected by user.');
        }

        if (errorMessage.includes('execution reverted')) {
          return createErrorResponse(
            'Transaction failed: Contract execution reverted. This could be due to insufficient token balance or other contract-specific restrictions.'
          );
        }

        return createErrorResponse(`Failed to send tokens: ${errorMessage}`);
      }
    }
  );
}
