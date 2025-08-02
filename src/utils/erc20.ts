import { readContract, readContracts } from '@wagmi/core';
import { type Address, erc20Abi, parseAbi } from 'viem';
import { wagmiConfig } from './wagmi-config.js';

export async function getTokenBalance(
  erc20Address: Address,
  walletAddress: Address
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress],
  });
}

export async function getTokenAllowance(
  erc20Address: Address,
  walletAddress: Address,
  spenderAddress: Address
) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletAddress, spenderAddress],
  });
}

export async function getTokenDecimals(erc20Address: Address) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'decimals',
  });
}

export async function getTokenName(erc20Address: Address) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'name',
  });
}

export async function getTokenSymbol(erc20Address: Address) {
  return readContract(wagmiConfig, {
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'symbol',
  });
}

export async function getTokenInfo(erc20Address: Address) {
  const result = await readContracts(wagmiConfig, {
    contracts: [
      {
        address: erc20Address,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name',
      },
      {
        address: erc20Address,
        abi: parseAbi(['function symbol() view returns (string)']),
        functionName: 'symbol',
      },
      {
        address: erc20Address,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
      },
      {
        address: erc20Address,
        abi: parseAbi(['function totalSupply() view returns (uint256)']),
        functionName: 'totalSupply',
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
