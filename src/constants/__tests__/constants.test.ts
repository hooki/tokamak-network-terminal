import { describe, expect, it } from 'vitest';
import { getNetworkAddresses, getNetworkTokens } from '../../constants.js';

describe('constants.ts', () => {
  describe('getNetworkAddresses', () => {
    it('should return mainnet addresses', () => {
      const addresses = getNetworkAddresses('mainnet');
      expect(addresses.TON_ADDRESS).toBe(
        '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5'
      );
      expect(addresses.WTON_ADDRESS).toBe(
        '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2'
      );
      expect(addresses.DEPOSIT_MANAGER).toBe(
        '0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e'
      );
    });

    it('should return sepolia addresses', () => {
      const addresses = getNetworkAddresses('sepolia');
      expect(addresses.TON_ADDRESS).toBe(
        '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044'
      );
      expect(addresses.WTON_ADDRESS).toBe(
        '0x79e0d92670106c85e9067b56b8f674340dca0bbd'
      );
      expect(addresses.DEPOSIT_MANAGER).toBe(
        '0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F'
      );
    });

    it('should fallback to mainnet for unknown network', () => {
      const addresses = getNetworkAddresses('unknown');
      expect(addresses.TON_ADDRESS).toBe(
        '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5'
      );
    });
  });

  describe('getNetworkTokens', () => {
    it('should return mainnet tokens', () => {
      const tokens = getNetworkTokens('mainnet');
      expect(tokens?.TON).toBe('0x2be5e8c109e2197D077D13A82dAead6a9b3433C5');
      expect(tokens?.WTON).toBe('0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2');
    });

    it('should return sepolia tokens', () => {
      const tokens = getNetworkTokens('sepolia');
      expect(tokens?.TON).toBe('0xa30fe40285b8f5c0457dbc3b7c8a280373c40044');
      expect(tokens?.WTON).toBe('0x79e0d92670106c85e9067b56b8f674340dca0bbd');
    });

    it('should fallback to mainnet for unknown network', () => {
      const tokens = getNetworkTokens('unknown');
      expect(tokens?.TON).toBe('0x2be5e8c109e2197D077D13A82dAead6a9b3433C5');
    });
  });
});
