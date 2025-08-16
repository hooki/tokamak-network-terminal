// Mock MCP Server with proper typing
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStakeTools } from '../stake.js';

// Import global types
/// <reference path="../../../global.d.ts" />

// Define proper mock types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

const mockServer: MockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  getAccount: vi.fn(),
  readContract: vi.fn(),
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
  parseEther: vi.fn((value) => BigInt(value) * BigInt(10 ** 18)),
  encodeAbiParameters: vi.fn((_types, values) => `encoded_${values.join('_')}`),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  DEPOSIT_MANAGER: '0x1234567890123456789012345678901234567890',
  TON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  WTON_ADDRESS: '0x9876543210987654321098765432109876543210',
  getNetworkAddresses: vi.fn((_network) => ({
    DEPOSIT_MANAGER: '0x1234567890123456789012345678901234567890',
    TON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    WTON_ADDRESS: '0x9876543210987654321098765432109876543210',
  })),
}));

// Mock utils
vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/layer2.js', () => ({
  resolveLayer2Address: vi.fn(),
}));

vi.mock('../../utils/response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
  createSuccessResponse: vi.fn((message) => ({
    content: [{ type: 'text', text: message }],
  })),
  createErrorResponse: vi.fn((message) => ({
    content: [{ type: 'text', text: message }],
  })),
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

vi.mock('../../utils/wallet.js', () => ({
  checkWalletConnection: vi.fn(),
}));

describe('stake.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerStakeTools', () => {
    it('should register stake-tokens tool', () => {
      registerStakeTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'stake-tokens',
        expect.objectContaining({
          title: 'Stake tokens to Layer2 operator',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
            tokenAmount: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register update-seigniorage tool', () => {
      registerStakeTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'update-seigniorage',
        expect.objectContaining({
          title: 'Update seigniorage',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 2 tools', () => {
      registerStakeTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('stake-tokens tool', () => {
    it('should handle wallet not connected', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'stake-tokens'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'stake-tokens 0x1234567890123456789012345678901234567890 100 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should stake tokens successfully', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockParseEther = vi.mocked(await import('viem')).parseEther;
      const mockEncodeAbiParameters = vi.mocked(
        await import('viem')
      ).encodeAbiParameters;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockGetNetworkAddresses = vi.mocked(
        await import('../../constants.js')
      ).getNetworkAddresses;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockParseEther.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens
      mockEncodeAbiParameters.mockReturnValue(
        '0x1234567890123456789012345678901234567890123456789012345678901234567890' as `0x${string}`
      );
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'stake-tokens'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockResolveLayer2Address).toHaveBeenCalledWith(
        'hammer',
        'mainnet'
      );
      expect(mockGetNetworkAddresses).toHaveBeenCalledWith('mainnet');
      expect(mockParseEther).toHaveBeenCalledWith('100');
      expect(mockEncodeAbiParameters).toHaveBeenCalledWith(
        [{ type: 'address' }, { type: 'address' }],
        [
          '0x1234567890123456789012345678901234567890',
          '0x1234567890123456789012345678901234567890',
        ]
      );
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function approveAndCall(address, uint256, bytes)'],
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          functionName: 'approveAndCall',
          args: [
            '0x9876543210987654321098765432109876543210',
            BigInt('100000000000000000000'),
            '0x1234567890123456789012345678901234567890123456789012345678901234567890',
          ],
          chainId: 1,
        }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        'Stake tokens successfully on mainnet (tx: 0xtxhash)'
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
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'stake-tokens'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
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

  describe('update-seigniorage tool', () => {
    it('should handle wallet not connected', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'update-seigniorage 0x1234567890123456789012345678901234567890 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should update seigniorage successfully', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockResolveLayer2Address).toHaveBeenCalledWith(
        'hammer',
        'mainnet'
      );
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function updateSeigniorage()'],
          address: '0x1234567890123456789012345678901234567890',
          functionName: 'updateSeigniorage',
          args: [],
          chainId: 1,
        }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        'Update seigniorage successfully on mainnet (tx: 0xtxhash)'
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

    it('should handle sepolia network for update-seigniorage', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);

      registerStakeTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        layer2Identifier: 'hammer',
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
