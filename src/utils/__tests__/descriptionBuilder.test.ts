import { describe, it, expect } from 'vitest';
import { DescriptionBuilder } from '../descriptionBuilder.js';

describe('descriptionBuilder.ts', () => {
  describe('DescriptionBuilder', () => {
    it('should create instance with initial string', () => {
      const builder = new DescriptionBuilder('Test description');
      expect(builder.toString()).toBe('Test description');
    });

    it('should add wallet connect instructions with withWalletConnect', () => {
      const builder = new DescriptionBuilder('Test description');
      const result = builder.withWalletConnect();

      expect(result).toBe(builder); // Should return the same instance
      expect(builder.toString()).toContain('Test description');
      expect(builder.toString()).toContain(
        'If a tool response includes { status: "continue" }'
      );
      expect(builder.toString()).toContain('always invoke the "nextStep" tool');
      expect(builder.toString()).toContain(
        'If the response includes { executeNextStepAfter: <seconds> }'
      );
      expect(builder.toString()).toContain(
        'wait that time before invoking "nextStep"'
      );
      expect(builder.toString()).toContain(
        'If the response includes { callback }'
      );
      expect(builder.toString()).toContain(
        'pass it as a parameter when invoking "nextStep"'
      );
    });

    it('should chain withWalletConnect multiple times', () => {
      const builder = new DescriptionBuilder('Initial');
      builder.withWalletConnect().withWalletConnect();

      const result = builder.toString();
      // Should contain the wallet connect instructions only once
      const walletConnectCount = (
        result.match(/If a tool response includes \{ status: "continue" \}/g) ||
        []
      ).length;
      expect(walletConnectCount).toBe(2); // Multiple calls should add the instructions multiple times
    });

    it('should handle empty string', () => {
      const builder = new DescriptionBuilder('');
      builder.withWalletConnect();

      expect(builder.toString()).toContain(
        'If a tool response includes { status: "continue" }'
      );
      expect(builder.toString()).toContain('always invoke the "nextStep" tool');
    });

    it('should preserve original string when chaining', () => {
      const originalString =
        'Original description with special chars: !@#$%^&*()';
      const builder = new DescriptionBuilder(originalString);
      builder.withWalletConnect();

      expect(builder.toString()).toContain(originalString);
    });
  });
});
