import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetAccountReturnType } from '@wagmi/core';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTONCommands } from '../ton.js';

// Define proper mock server interface
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

// Mock MCP Server
const mockServer: MockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  getAccount: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
  readContracts: vi.fn(),
  getBalance: vi.fn(),
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
  parseUnits: vi.fn(
    (value, decimals) => BigInt(value) * BigInt(10 ** decimals)
  ),
  encodeAbiParameters: vi.fn(
    (_types, values) =>
      `0x${(values as string[]).map((v: string) => v.slice(2)).join('')}` as `0x${string}`
  ),
  isAddress: vi.fn(
    (address) => address.startsWith('0x') && address.length === 42
  ),
  isAddressEqual: vi.fn((a, b) => a.toLowerCase() === b.toLowerCase()),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((_network) => ({
    TON_ADDRESS: '0x1234567890123456789012345678901234567890',
    WTON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    SWAPPROXY: '0x9876543210987654321098765432109876543210',
    DEPOSIT_MANAGER: '0x1111111111111111111111111111111111111111',
  })),
}));

// Mock utils
vi.mock('../../utils/approve.js', () => ({
  checkApproval: vi.fn(),
}));

vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/erc20.js', () => ({
  getTokenBalance: vi.fn(),
  getTokenDecimals: vi.fn(),
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

describe('ton.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerTONCommands', () => {
    it('should register wrap-ton tool', () => {
      registerTONCommands(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'wrap-ton',
        expect.objectContaining({
          title: 'Wrap TON tokens to WTON',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            tokenAmount: expect.any(Object),
            transferToAddress: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register unwrap-wton tool', () => {
      registerTONCommands(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'unwrap-wton',
        expect.objectContaining({
          title: 'Unwrap WTON tokens to TON',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            tokenAmount: expect.any(Object),
            transferToAddress: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 2 tools', () => {
      registerTONCommands(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('wrap-ton tool', () => {
    it('should handle wallet not connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockGetAccount.mockReturnValue({
        address: undefined,
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
      } as unknown as GetAccountReturnType);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'wrap-ton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.WalletCheckResult>;

      const result = await toolFunction({
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'wrap-ton 100 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should return error for insufficient balance', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;

      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        addresses: [
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        ],
        chain: { id: 1, name: 'Ethereum' },
        chainId: 1,
        connector: {} as unknown,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false,
        status: 'connected',
      } as unknown as GetAccountReturnType);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('50000000000000000000'), status: 'success' }, // 50 tokens
        { result: 18, status: 'success' }, // 18 decimals
      ]);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error response' }],
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'wrap-ton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.CallToolResult>;

      const result = await toolFunction({
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Insufficient balance on mainnet'
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'error response',
          },
        ],
      });
    });

    it('should wrap TON to WTON successfully', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockWaitForTransactionReceipt = vi.mocked(
        await import('@wagmi/core')
      ).waitForTransactionReceipt;
      const mockParseEther = vi.mocked(await import('viem')).parseEther;
      const mockEncodeAbiParameters = vi.mocked(
        await import('viem')
      ).encodeAbiParameters;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;

      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        addresses: [
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        ],
        chain: { id: 1, name: 'Ethereum' },
        chainId: 1,
        connector: {} as unknown,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false,
        status: 'connected',
      } as unknown as GetAccountReturnType);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000'), status: 'success' }, // 1000 tokens
        { result: 18, status: 'success' }, // 18 decimals
      ]);
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockWaitForTransactionReceipt.mockResolvedValue({
        blockHash: '0x123' as `0x${string}`,
        blockNumber: BigInt(1),
        contractAddress: null,
        cumulativeGasUsed: BigInt(21000),
        effectiveGasPrice: BigInt(20000000000),
        from: '0x123' as `0x${string}`,
        gasUsed: BigInt(21000),
        logs: [],
        logsBloom: '0x' as `0x${string}`,
        status: 'success' as const,
        to: '0x123' as `0x${string}`,
        transactionHash: '0x123' as `0x${string}`,
        transactionIndex: 0,
        type: 'legacy' as const,
        chainId: 1,
      });
      mockParseEther.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens
      mockEncodeAbiParameters.mockReturnValue(
        '0xencoded_params' as `0x${string}`
      );
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'wrap-ton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.CallToolResult>;

      const result = await toolFunction({
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function approveAndCall(address, uint256, bytes)'],
          address: '0x1234567890123456789012345678901234567890',
          functionName: 'approveAndCall',
          args: [
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            BigInt('100000000000000000000'),
            '0xencoded_params',
          ],
          chainId: 1,
        }
      );
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          hash: '0xtxhash',
          chainId: 1,
        }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('Wrap TON tokens to WTON')
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
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockWaitForTransactionReceipt = vi.mocked(
        await import('@wagmi/core')
      ).waitForTransactionReceipt;

      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        addresses: [
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        ],
        chain: { id: 1, name: 'Ethereum' },
        chainId: 1,
        connector: {} as unknown,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false,
        status: 'connected',
      } as unknown as GetAccountReturnType);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000'), status: 'success' },
        { result: 18, status: 'success' },
      ]);
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockWaitForTransactionReceipt.mockResolvedValue({
        blockHash: '0x123' as `0x${string}`,
        blockNumber: BigInt(1),
        contractAddress: null,
        cumulativeGasUsed: BigInt(21000),
        effectiveGasPrice: BigInt(20000000000),
        from: '0x123' as `0x${string}`,
        gasUsed: BigInt(21000),
        logs: [],
        logsBloom: '0x' as `0x${string}`,
        status: 'success' as const,
        to: '0x123' as `0x${string}`,
        transactionHash: '0x123' as `0x${string}`,
        transactionIndex: 0,
        type: 'legacy' as const,
        chainId: 1,
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'wrap-ton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.CallToolResult>;

      await toolFunction({
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

  describe('unwrap-wton tool', () => {
    it('should handle wallet not connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockGetAccount.mockReturnValue({
        address: undefined,
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
      } as unknown as GetAccountReturnType);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'unwrap-wton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.WalletCheckResult>;

      const result = await toolFunction({
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'unwrap-wton 100 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should unwrap WTON to TON successfully', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockWaitForTransactionReceipt = vi.mocked(
        await import('@wagmi/core')
      ).waitForTransactionReceipt;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;

      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        addresses: [
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        ],
        chain: { id: 1, name: 'Ethereum' },
        chainId: 1,
        connector: {} as unknown,
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false,
        status: 'connected',
      } as unknown as GetAccountReturnType);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' }, // 10000 tokens (27 decimals)
        { result: 27, status: 'success' }, // 27 decimals
      ]);
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockWaitForTransactionReceipt.mockResolvedValue({
        blockHash: '0x123' as `0x${string}`,
        blockNumber: BigInt(1),
        contractAddress: null,
        cumulativeGasUsed: BigInt(21000),
        effectiveGasPrice: BigInt(20000000000),
        from: '0x123' as `0x${string}`,
        gasUsed: BigInt(21000),
        logs: [],
        logsBloom: '0x' as `0x${string}`,
        status: 'success' as const,
        to: '0x123' as `0x${string}`,
        transactionHash: '0x123' as `0x${string}`,
        transactionIndex: 0,
        type: 'legacy' as const,
        chainId: 1,
      });
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000000000')); // 100 tokens (27 decimals)
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });

      registerTONCommands(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'unwrap-wton'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall?.[2] as (
        params: unknown
      ) => Promise<globalThis.CallToolResult>;

      const result = await toolFunction({
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function swapToTON(uint256)'],
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          functionName: 'swapToTON',
          args: [BigInt('100000000000000000000000000')],
          chainId: 1,
        }
      );
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          hash: '0xtxhash',
          chainId: 1,
        }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('Unwrap WTON tokens to TON')
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
  });
});
