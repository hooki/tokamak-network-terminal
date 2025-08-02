import { readContract } from '@wagmi/core';
import type { Address } from 'viem';
import { formatUnits, parseAbi } from 'viem';
import { createMCPResponse } from './response.js';
import { wagmiConfig } from './wagmi-config.js';

export async function checkApproval(
  account: Address,
  tokenAddress: Address,
  tokenDecimals: number,
  spender: Address,
  requiredAmount: bigint,
  callback: string
): Promise<WalletCheckResult> {
  try {
    const allowance = await readContract(wagmiConfig, {
      abi: parseAbi([
        'function allowance(address owner, address spender) view returns (uint256)',
      ]),
      address: tokenAddress,
      functionName: 'allowance',
      args: [account, spender],
    });

    if (allowance < requiredAmount) {
      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'continue',
              message: `insufficient allowance for ${spender}. Please approve the token first.`,
              nextStep: `approve ${tokenAddress}(${tokenDecimals} decimals) for ${spender} amount ${formatUnits(requiredAmount, tokenDecimals)}`,
              callback: callback,
            }),
          },
        ],
      };
    }
  } catch (error) {
    const response: MCPResponse = {
      status: 'error',
      message: `Failed to check token allowance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };

    return {
      content: [{ type: 'text' as const, text: createMCPResponse(response) }],
    };
  }

  return undefined;
}
