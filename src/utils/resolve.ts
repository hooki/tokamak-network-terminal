import type { Address } from 'viem';
import { getNetworkTokens, getNetworkAddresses } from '../constants.js';

const resolveTokenAddress = (
  tokenAddressOrName: Address | string,
  network: string = 'mainnet'
): Address | undefined => {
  if (tokenAddressOrName.startsWith('0x')) {
    return tokenAddressOrName as Address;
  } else {
    const networkTokens = getNetworkTokens(network);
    if (tokenAddressOrName in networkTokens)
      return networkTokens[tokenAddressOrName as keyof typeof networkTokens];
  }
};

const resolveAddress = (
  addressOrName: Address | string,
  network: string = 'mainnet'
): Address | undefined => {
  if (addressOrName.startsWith('0x')) {
    return addressOrName as Address;
  } else {
    const networkAddresses = getNetworkAddresses(network);
    if (addressOrName in networkAddresses) {
      return networkAddresses[addressOrName as keyof typeof networkAddresses];
    }
    return undefined;
  }
};

export { resolveAddress, resolveTokenAddress };
