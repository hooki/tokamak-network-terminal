import type { Address } from 'viem';
import { KNOWN_ADDRESSES, TOKENS } from '../constants.js';

const resolveTokenAddress = (
  tokenAddressOrName: Address | string
): Address | undefined => {
  if (tokenAddressOrName.startsWith('0x')) {
    return tokenAddressOrName as Address;
  } else {
    if (tokenAddressOrName in TOKENS)
      return TOKENS[tokenAddressOrName as keyof typeof TOKENS];
    //   return {
    //     content: [
    //       {
    //         type: 'text' as const,
    //         text: createMCPResponse({
    //           status: 'error',
    //           message: `Invalid token name: ${tokenAddressOrName}. Available tokens: ${Object.keys(
    //             TOKENS
    //           ).join(', ')}`,
    //         }),
    //       },
    //     ],
    //   };
  }
};

const resolveAddress = (
  addressOrName: Address | string
): Address | undefined => {
  if (addressOrName.startsWith('0x')) {
    return addressOrName as Address;
  } else {
    if (addressOrName in KNOWN_ADDRESSES) {
      return KNOWN_ADDRESSES[addressOrName as keyof typeof KNOWN_ADDRESSES];
    }
    return addressOrName as Address;
  }
};

export { resolveAddress, resolveTokenAddress };
