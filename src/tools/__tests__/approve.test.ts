import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerApproveTools } from '../approve.js';

// Mock MCP Server
const mockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  getAccount: vi.fn(),
  readContract: vi.fn(),
  writeContract: vi.fn(),
  getBalance: vi.fn(),
  readContracts: vi.fn(),
  createStorage: vi.fn((config) => ({
    getItem: config.storage.getItem,
    setItem: config.storage.setItem,
    removeItem: config.storage.removeItem,
  })),
  createConfig: vi.fn((config) => ({
    ...config,
    _internal: {
      connectors: {
        setup: vi.fn(),
      },
    },
  })),
  http: vi.fn(() => ({})),
}));

// Mock wagmi chains
vi.mock('@wagmi/core/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
}));

// Mock viem functions
vi.mock('viem', () => ({
  parseAbi: vi.fn((abi) => abi),
  parseUnits: vi.fn(
    (value, decimals) => BigInt(value) * BigInt(10 ** decimals)
  ),
}));

// Mock utils
vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/resolve.js', () => ({
  resolveAddress: vi.fn(),
  resolveTokenAddress: vi.fn(),
}));

vi.mock('../../utils/response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

vi.mock('../../utils/wallet.js', () => ({
  checkWalletConnection: vi.fn(),
}));

describe('approve.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerApproveTools', () => {
    it('should register approve tool', () => {
      registerApproveTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'approve',
        expect.objectContaining({
          title: 'Approve token spending',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            token: expect.any(Object),
            spender: expect.any(Object),
            amount: expect.any(Object),
            decimals: expect.any(Object),
            callback: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 1 tool', () => {
      registerApproveTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('approve tool', () => {
    it('should return error for unknown token', async () => {
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockResolveTokenAddress.mockReturnValue(undefined);

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        token: 'UNKNOWN_TOKEN',
        spender: '0x1234567890123456789012345678901234567890',
        amount: '100',
        network: 'mainnet',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'UNKNOWN TOKEN on mainnet',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should return error for unknown spender', async () => {
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(undefined);

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        token: 'TON',
        spender: 'UNKNOWN_SPENDER',
        amount: '100',
        network: 'mainnet',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'UNKNOWN SPENDER on mainnet',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should handle wallet not connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;

      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );
      mockGetAccount.mockReturnValue({ address: undefined } as any);
      mockCheckWalletConnection.mockResolvedValue({
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        token: 'TON',
        spender: 'WTON',
        amount: '100',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'approve TON for WTON amount 100 --network mainnet'
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should handle max amount approval', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockCreateMCPResponse.mockReturnValue('success response');

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        token: 'TON',
        spender: 'WTON',
        amount: 'max',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function approve(address, uint256)'],
          address: '0x1234567890123456789012345678901234567890',
          functionName: 'approve',
          args: [
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            BigInt(
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
            ),
          ],
          chainId: 1,
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: expect.stringContaining(
          'Approve max tokens from TON to WTON successfully'
        ),
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'success response',
          },
        ],
      });
    });

    it('should handle specific amount approval with provided decimals', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens with 18 decimals
      mockCreateMCPResponse.mockReturnValue('success response');

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        token: 'TON',
        spender: 'WTON',
        amount: '100',
        network: 'mainnet',
        decimals: 18,
      });

      expect(mockParseUnits).toHaveBeenCalledWith('100', 18);
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function approve(address, uint256)'],
          address: '0x1234567890123456789012345678901234567890',
          functionName: 'approve',
          args: [
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            BigInt('100000000000000000000'),
          ],
          chainId: 1,
        }
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'success response',
          },
        ],
      });
    });

    it('should handle sepolia network', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;

      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);

      registerApproveTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'approve'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        token: 'TON',
        spender: 'WTON',
        amount: 'max',
        network: 'sepolia',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          chainId: 11155111,
        })
      );
    });
  });
});
