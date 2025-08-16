// Mock MCP Server with proper typing
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTokenTools } from '../token.js';

// Define proper mock types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

const mockServer: MockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
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
  formatEther: vi.fn((value) => `formatted_${value}`),
  formatUnits: vi.fn((value, decimals) => `formatted_${value}_${decimals}`),
  parseAbi: vi.fn((abi) => abi),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkTokens: vi.fn((_network) => ({
    TON: '0x1234567890123456789012345678901234567890',
    WTON: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  })),
}));

// Mock utils
vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
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

describe('token.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerTokenTools', () => {
    it('should register get-ethereum-balance tool', () => {
      registerTokenTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-ethereum-balance',
        expect.objectContaining({
          title: 'Get Ethereum (Native) token balance',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            address: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register get-token-balance tool', () => {
      registerTokenTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-token-balance',
        expect.objectContaining({
          title: 'Get token balance',
          description: expect.stringContaining('with_wallet_connect'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            address: expect.any(Object),
            tokenAddressOrName: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 3 tools', () => {
      registerTokenTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
  });

  describe('get-ethereum-balance tool', () => {
    it('should call getBalance with correct parameters for mainnet', async () => {
      const mockGetBalance = vi.mocked(await import('@wagmi/core')).getBalance;
      const mockFormatEther = vi.mocked(await import('viem')).formatEther;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetBalance.mockResolvedValue({
        value: 1000000000000000000n,
        decimals: 18,
        formatted: '1.0',
        symbol: 'ETH',
      });
      mockFormatEther.mockReturnValue('1.0');

      registerTokenTools(mockServer as unknown as McpServer);

      // Get the registered function
      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-ethereum-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockGetBalance).toHaveBeenCalledWith(
        expect.any(Object), // wagmiConfig
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: 1,
        }
      );
      expect(mockFormatEther).toHaveBeenCalledWith(1000000000000000000n);
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: expect.stringContaining('1.0'),
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

    it('should call getBalance with correct parameters for sepolia', async () => {
      const mockGetBalance = vi.mocked(await import('@wagmi/core')).getBalance;
      mockGetBalance.mockResolvedValue({
        value: 500000000000000000n,
        decimals: 18,
        formatted: '0.5',
        symbol: 'ETH',
      });

      registerTokenTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-ethereum-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        network: 'sepolia',
      });

      expect(mockGetBalance).toHaveBeenCalledWith(expect.any(Object), {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 11155111,
      });
    });
  });

  describe('get-token-balance tool', () => {
    it('should handle token address input', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockParseAbi = vi.mocked(await import('viem')).parseAbi;

      mockReadContracts.mockResolvedValue([
        { result: 1000000000000000000n, status: 'success' as const },
        { result: 18, status: 'success' as const },
      ]);
      mockFormatUnits.mockReturnValue('1.0');
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any for generic abi parameter
      (mockParseAbi as any).mockImplementation((abi: unknown) => abi);

      registerTokenTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-token-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        tokenAddressOrName: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              abi: ['function balanceOf(address) view returns (uint256)'],
              functionName: 'balanceOf',
              args: ['0x1234567890123456789012345678901234567890'],
              chainId: 1,
            },
            {
              address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              abi: ['function decimals() view returns (uint8)'],
              functionName: 'decimals',
              chainId: 1,
            },
          ],
        }
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should handle token name input', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockGetNetworkTokens = vi.mocked(
        await import('../../constants.js')
      ).getNetworkTokens;

      mockReadContracts.mockResolvedValue([
        { result: 2000000000000000000n, status: 'success' as const },
        { result: 18, status: 'success' as const },
      ]);

      registerTokenTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-token-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        tokenAddressOrName: 'TON',
        network: 'mainnet',
      });

      expect(mockGetNetworkTokens).toHaveBeenCalledWith('mainnet');
      expect(mockReadContracts).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          contracts: expect.arrayContaining([
            expect.objectContaining({
              address: '0x1234567890123456789012345678901234567890',
            }),
          ]),
        })
      );
    });

    it('should return error for invalid token name', async () => {
      const mockGetNetworkTokens = vi.mocked(
        await import('../../constants.js')
      ).getNetworkTokens;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetNetworkTokens.mockReturnValue({
        TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
        WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
      });

      registerTokenTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-token-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        tokenAddressOrName: 'INVALID_TOKEN',
        network: 'mainnet',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token name on mainnet',
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: expect.any(String) }],
      });
    });
  });
});
