import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkApproval } from '../approve.js';

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  readContracts: vi.fn(),
  createStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
  createConfig: vi.fn(() => ({})),
  http: vi.fn(() => ({})),
}));

// Mock wagmi chains
vi.mock('@wagmi/core/chains', () => ({
  mainnet: { id: 1 },
  sepolia: { id: 11155111 },
}));

// Mock response utility
vi.mock('../response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
}));

describe('approve.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkApproval', () => {
    it('should return undefined when allowance is sufficient', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(1000000000000000000n); // 1 ETH allowance

      const result = await checkApproval(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        18,
        '0x9876543210987654321098765432109876543210' as `0x${string}`,
        500000000000000000n, // 0.5 ETH required
        'test callback',
        'mainnet'
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          abi: expect.any(Array),
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          functionName: 'allowance',
          args: [
            '0x1234567890123456789012345678901234567890',
            '0x9876543210987654321098765432109876543210',
          ],
          chainId: 1,
        }
      );
      expect(result).toBeUndefined();
    });

    it('should return approval request when allowance is insufficient', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(100000000000000000n); // 0.1 ETH allowance

      const result = await checkApproval(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        18,
        '0x9876543210987654321098765432109876543210' as `0x${string}`,
        500000000000000000n, // 0.5 ETH required
        'test callback',
        'mainnet'
      );

      expect(result).toBeDefined();
      expect(result?.content).toBeDefined();
      expect(result?.content[0].type).toBe('text');
    });

    it('should handle errors gracefully', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockRejectedValue(new Error('Contract error'));

      const result = await checkApproval(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        18,
        '0x9876543210987654321098765432109876543210' as `0x${string}`,
        500000000000000000n,
        'test callback',
        'mainnet'
      );

      expect(result).toBeDefined();
      expect(result?.content).toBeDefined();
      expect(result?.content[0].type).toBe('text');
    });

    it('should use sepolia chainId when network is sepolia', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(1000000000000000000n);

      await checkApproval(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        18,
        '0x9876543210987654321098765432109876543210' as `0x${string}`,
        500000000000000000n,
        'test callback',
        'sepolia'
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        expect.objectContaining({
          chainId: 11155111, // sepolia chainId
        })
      );
    });
  });
});
