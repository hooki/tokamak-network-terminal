import { describe, expect, it } from 'vitest';
import { getNetworkLayer2Operators, resolveLayer2Address } from '../layer2.js';

describe('layer2.ts', () => {
  describe('resolveLayer2Address', () => {
    it('should resolve layer2 identifier to address on mainnet', () => {
      const result = resolveLayer2Address('tokamak1', 'mainnet');
      expect(result).toBe('0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF');
    });

    it('should resolve layer2 identifier to address on sepolia', () => {
      const result = resolveLayer2Address('TokamakOperator_v2', 'sepolia');
      expect(result).toBe('0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599');
    });

    it('should return address directly if it starts with 0x', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = resolveLayer2Address(address, 'mainnet');
      expect(result).toBe(address);
    });

    it('should fallback to mainnet for unknown network', () => {
      const result = resolveLayer2Address('tokamak1', 'unknown');
      expect(result).toBe('0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF');
    });
  });

  describe('getNetworkLayer2Operators', () => {
    it('should return mainnet layer2 operators', () => {
      const operators = getNetworkLayer2Operators('mainnet');
      expect(operators.tokamak1).toBeDefined();
      expect(operators.tokamak1.address).toBe(
        '0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF'
      );
    });

    it('should return sepolia layer2 operators', () => {
      const operators = getNetworkLayer2Operators('sepolia');
      expect(operators.TokamakOperator_v2).toBeDefined();
      expect(operators.TokamakOperator_v2.address).toBe(
        '0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599'
      );
    });

    it('should fallback to mainnet for unknown network', () => {
      const operators = getNetworkLayer2Operators('unknown');
      expect(operators.tokamak1).toBeDefined();
    });
  });
});
