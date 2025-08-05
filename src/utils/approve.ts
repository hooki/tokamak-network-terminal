import { readContract } from '@wagmi/core';
import type { Address } from 'viem';
import { formatUnits, parseAbi } from 'viem';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { createMCPResponse } from './response.js';
import { wagmiConfig } from './wagmi-config.js';

export async function checkApproval(
  account: Address,
  tokenAddress: Address,
  tokenDecimals: number,
  spender: Address,
  requiredAmount: bigint,
  callback: string,
  network: string = 'mainnet'
): Promise<WalletCheckResult> {
  try {
    const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

    const allowance = await readContract(wagmiConfig, {
      abi: parseAbi([
        'function allowance(address owner, address spender) view returns (uint256)',
      ]),
      address: tokenAddress,
      functionName: 'allowance',
      args: [account, spender],
      chainId: chainId,
    });

    if (allowance < requiredAmount) {
      return {
        content: [
          {
            type: 'text' as const,
            text: createMCPResponse({
              status: 'continue',
              message: `insufficient allowance for ${spender} on ${network}. Please approve the token first.`,
              nextStep: `approve ${tokenAddress}(${tokenDecimals} decimals) for ${spender} amount ${formatUnits(requiredAmount, tokenDecimals)} --network ${network}`,
              callback: callback,
            }),
          },
        ],
      };
    }
  } catch (error) {
    const response: MCPResponse = {
      status: 'error',
      message: `Failed to check token allowance on ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };

    return {
      content: [{ type: 'text' as const, text: createMCPResponse(response) }],
    };
  }

  return undefined;
}
