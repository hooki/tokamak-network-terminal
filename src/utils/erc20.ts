import { readContract, readContracts } from '@wagmi/core';
import { type Address, erc20Abi, parseAbi } from 'viem';
import { wagmiConfig } from './wagmi-config.js';

export async function getTokenBalance(
  erc20Address: Address,
  walletAddress: Address,
  chainId?: 1 | 11155111
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress],
    chainId,
  });
}

export async function getTokenAllowance(
  erc20Address: Address,
  walletAddress: Address,
  spenderAddress: Address,
  chainId?: 1 | 11155111
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletAddress, spenderAddress],
    chainId,
  });
}

export async function getTokenDecimals(
  erc20Address: Address,
  chainId?: 1 | 11155111
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId,
  });
}

export async function getTokenName(
  erc20Address: Address,
  chainId?: 1 | 11155111
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'name',
    chainId,
  });
}

export async function getTokenSymbol(
  erc20Address: Address,
  chainId?: 1 | 11155111
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId,
  });
}

export async function getTokenInfo(
  erc20Address: Address,
  chainId?: 1 | 11155111
) {
  const result = await readContracts(wagmiConfig, {
    contracts: [
      {
        address: erc20Address,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name',
        chainId,
      },
      {
        address: erc20Address,
        abi: parseAbi(['function symbol() view returns (string)']),
        functionName: 'symbol',
        chainId,
      },
      {
        address: erc20Address,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
        chainId,
      },
      {
        address: erc20Address,
        abi: parseAbi(['function totalSupply() view returns (uint256)']),
        functionName: 'totalSupply',
        chainId,
      },
    ],
  });

  if (result.some((r) => r.error)) {
    throw new Error('Failed to get token info');
  }

  if (result.length !== 4) {
    throw new Error('Failed to get token info');
  }

  return {
    name: result[0].result as string,
    symbol: result[1].result as string,
    decimals: result[2].result as number,
    totalSupply: result[3].result as bigint,
  };
}
