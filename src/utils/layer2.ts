import type { Address } from 'viem';

export const LAYER2_OPERATORS: Layer2Operators = {
  hammer: {
    name: 'hammer',
    address: '0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599',
    description: 'Tokamak Network Layer2 operator',
  },
};

export function resolveLayer2Address(identifier: string): Address {
  return identifier.startsWith('0x')
    ? (identifier as Address)
    : LAYER2_OPERATORS[identifier]?.address || (identifier as Address);
}
