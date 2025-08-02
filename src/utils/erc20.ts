import { getBalance, readContracts } from '@wagmi/core';
import { type Address, parseAbi } from 'viem';
import { wagmiConfig } from './wagmi-config.js';

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

export async function getTokenBalance(
  erc20Address: Address,
  walletAddress: Address
) {
  const balance = await getBalance(wagmiConfig, {
    address: walletAddress,
    token: erc20Address,
    unit: 'ether',
  });

  return balance.value;
}
