import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTokenAllowance,
  getTokenBalance,
  getTokenDecimals,
  getTokenInfo,
  getTokenName,
  getTokenSymbol,
} from '../erc20.js';

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

describe('erc20.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTokenBalance', () => {
    it('should call readContract with correct parameters', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(1000000000000000000n); // 1 ETH in wei

      const result = await getTokenBalance(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        1
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'balanceOf',
          args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
          chainId: 1,
        }
      );
      expect(result).toBe(1000000000000000000n);
    });
  });

  describe('getTokenDecimals', () => {
    it('should call readContract with correct parameters', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(18);

      const result = await getTokenDecimals(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        1
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'decimals',
          chainId: 1,
        }
      );
      expect(result).toBe(18);
    });
  });

  describe('getTokenName', () => {
    it('should call readContract with correct parameters', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue('Test Token');

      const result = await getTokenName(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        1
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'name',
          chainId: 1,
        }
      );
      expect(result).toBe('Test Token');
    });
  });

  describe('getTokenSymbol', () => {
    it('should call readContract with correct parameters', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue('TEST');

      const result = await getTokenSymbol(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        1
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'symbol',
          chainId: 1,
        }
      );
      expect(result).toBe('TEST');
    });
  });

  describe('getTokenAllowance', () => {
    it('should call readContract with correct parameters', async () => {
      const mockReadContract = vi.mocked(
        await import('@wagmi/core')
      ).readContract;
      mockReadContract.mockResolvedValue(1000000000000000000n);

      const result = await getTokenAllowance(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        '0x9876543210987654321098765432109876543210' as `0x${string}`,
        1
      );

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'allowance',
          args: [
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            '0x9876543210987654321098765432109876543210',
          ],
          chainId: 1,
        }
      );
      expect(result).toBe(1000000000000000000n);
    });
  });

  describe('getTokenInfo', () => {
    it('should call readContracts with correct parameters', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      mockReadContracts.mockResolvedValue([
        { result: 'Test Token', status: 'success' },
        { result: 'TEST', status: 'success' },
        { result: 18, status: 'success' },
        { result: 1000000000000000000000n, status: 'success' },
      ]);

      const result = await getTokenInfo(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        1
      );

      expect(mockReadContracts).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          contracts: [
            {
              address: '0x1234567890123456789012345678901234567890',
              abi: expect.any(Array),
              functionName: 'name',
              chainId: 1,
            },
            {
              address: '0x1234567890123456789012345678901234567890',
              abi: expect.any(Array),
              functionName: 'symbol',
              chainId: 1,
            },
            {
              address: '0x1234567890123456789012345678901234567890',
              abi: expect.any(Array),
              functionName: 'decimals',
              chainId: 1,
            },
            {
              address: '0x1234567890123456789012345678901234567890',
              abi: expect.any(Array),
              functionName: 'totalSupply',
              chainId: 1,
            },
          ],
        }
      );
      expect(result).toEqual({
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        totalSupply: 1000000000000000000000n,
      });
    });
  });
});
