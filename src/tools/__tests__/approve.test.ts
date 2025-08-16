import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetAccountReturnType } from '@wagmi/core';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApproveTools } from '../approve.js';

// Define proper mock types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

// Mock MCP Server with proper typing
const mockServer: MockServer = {
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

// Helper function to safely get tool function from mock calls
function getToolFunction(toolName: string) {
  const toolCall = mockServer.registerTool.mock.calls.find(
    (call) => call[0] === toolName
  );
  expect(toolCall).toBeDefined();
  return toolCall?.[2];
}

// Helper to create mock account data
function createMockAccountData(overrides: Partial<GetAccountReturnType> = {}) {
  return {
    address: undefined,
    addresses: undefined,
    chain: undefined,
    chainId: undefined,
    connector: undefined,
    isConnected: false,
    isReconnecting: false,
    isConnecting: false,
    isDisconnected: true,
    status: 'disconnected' as const,
    ...overrides,
  };
}

// Helper to create mock request handler extra
function createMockRequestExtra() {
  return {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };
}

describe('approve.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerApproveTools', () => {
    it('should register approve tool', () => {
      registerApproveTools(mockServer as unknown as McpServer);

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
      registerApproveTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('approve tool', () => {
    it('should return error for unknown token', async () => {
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const _mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockResolveTokenAddress.mockReturnValue(undefined);

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          token: 'UNKNOWN_TOKEN',
          spender: '0x1234567890123456789012345678901234567890',
          amount: '100',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'UNKNOWN TOKEN on mainnet'
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'UNKNOWN TOKEN on mainnet' }],
      });
    });

    it('should return error for unknown spender', async () => {
      const mockResolveTokenAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveTokenAddress;
      const mockResolveAddress = vi.mocked(
        await import('../../utils/resolve.js')
      ).resolveAddress;
      mockResolveTokenAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockResolveAddress.mockReturnValue(undefined);

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          token: 'TON',
          spender: 'UNKNOWN_SPENDER',
          amount: '100',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'UNKNOWN SPENDER on mainnet'
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'UNKNOWN SPENDER on mainnet' }],
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
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: undefined,
          isConnected: false,
          isConnecting: false,
          isDisconnected: true,
          isReconnecting: false,
          status: 'disconnected',
        }) as GetAccountReturnType
      );
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          token: 'TON',
          spender: 'WTON',
          amount: '100',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'approve TON for WTON amount 100 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
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
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          addresses: [
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          ],
          chainId: 1,
          isConnected: true,
          isConnecting: false,
          isDisconnected: false,
          isReconnecting: false,
          status: 'connected',
        }) as GetAccountReturnType
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockCreateMCPResponse.mockReturnValue('success response');

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          token: 'TON',
          spender: 'WTON',
          amount: 'max',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

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
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining(
          'Approve max tokens from TON to WTON successfully'
        )
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Approve max tokens from TON to WTON successfully'
            ),
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
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          addresses: [
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          ],
          chainId: 1,
          isConnected: true,
          isConnecting: false,
          isDisconnected: false,
          isReconnecting: false,
          status: 'connected',
        }) as GetAccountReturnType
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens with 18 decimals
      mockCreateMCPResponse.mockReturnValue('success response');

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          token: 'TON',
          spender: 'WTON',
          amount: '100',
          network: 'mainnet',
          decimals: 18,
        },
        createMockRequestExtra()
      );

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
            text: expect.stringContaining(
              'Approve 100 tokens from TON to WTON successfully'
            ),
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
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          addresses: [
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          ],
          chainId: 11155111,
          isConnected: true,
          isConnecting: false,
          isDisconnected: false,
          isReconnecting: false,
          status: 'connected',
        }) as GetAccountReturnType
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);

      registerApproveTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('approve');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      await toolFunction(
        {
          token: 'TON',
          spender: 'WTON',
          amount: 'max',
          network: 'sepolia',
        },
        createMockRequestExtra()
      );

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          chainId: 11155111,
        })
      );
    });
  });
});
