import { describe, expect, it } from 'vitest';
import { getNetworkAddresses, getNetworkTokens } from '../../constants.js';
import { resolveAddress, resolveTokenAddress } from '../resolve.js';

describe('resolve.ts', () => {
  describe('resolveTokenAddress', () => {
    it('should resolve token name to address on mainnet', () => {
      const result = resolveTokenAddress('TON', 'mainnet');
      expect(result).toBe('0x2be5e8c109e2197D077D13A82dAead6a9b3433C5');
    });

    it('should resolve token name to address on sepolia', () => {
      const result = resolveTokenAddress('TON', 'sepolia');
      expect(result).toBe('0xa30fe40285b8f5c0457dbc3b7c8a280373c40044');
    });

    it('should return address directly if it starts with 0x', () => {
      const address = '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2';
      const result = resolveTokenAddress(address, 'mainnet');
      expect(result).toBe(address);
    });

    it('should return address directly for valid address format', () => {
      const result = resolveTokenAddress(
        '0x1234567890123456789012345678901234567890',
        'mainnet'
      );
      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return undefined for unknown token', () => {
      const result = resolveTokenAddress('SWAPPROXY', 'mainnet');
      expect(result).toBeUndefined();
    });
  });

  describe('resolveAddress', () => {
    it('should resolve address name to address on mainnet', () => {
      const result = resolveAddress('DEPOSIT_MANAGER', 'mainnet');
      expect(result).toBe('0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e');
    });

    it('should resolve address name to address on sepolia', () => {
      const result = resolveAddress('DEPOSIT_MANAGER', 'sepolia');
      expect(result).toBe('0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F');
    });

    it('should return address directly if it starts with 0x', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = resolveAddress(address, 'mainnet');
      expect(result).toBe(address);
    });

    it('should return address directly for valid address format', () => {
      const result = resolveAddress(
        '0x1234567890123456789012345678901234567890',
        'mainnet'
      );
      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return undefined for unknown address', () => {
      const result = resolveAddress('UNKNOWN_ADDRESS', 'mainnet');
      expect(result).toBeUndefined();
    });
  });
});
