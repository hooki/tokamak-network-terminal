import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUnstakeTools } from '../unstake.js';

// Define proper mock types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

// Mock MCP Server
const mockServer: MockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  readContracts: vi.fn(),
  getAccount: vi.fn(),
  getBalance: vi.fn(),
  createStorage: vi.fn(
    (config: {
      storage: { getItem: unknown; setItem: unknown; removeItem: unknown };
    }) => ({
      getItem: config.storage.getItem,
      setItem: config.storage.setItem,
      removeItem: config.storage.removeItem,
    })
  ),
  createConfig: vi.fn((config: unknown) => ({
    ...(config as object),
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
  parseAbi: vi.fn((abi: string[]) => abi),
  parseUnits: vi.fn(
    (value: string, decimals: number) => BigInt(value) * BigInt(10 ** decimals)
  ),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((_network: string) => ({
    SEIG_MANAGER: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    DEPOSIT_MANAGER:
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    TON_ADDRESS: '0x9876543210987654321098765432109876543210' as `0x${string}`,
    WTON_ADDRESS: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  })),
}));

// Mock utils
vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str: string) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/layer2.js', () => ({
  resolveLayer2Address: vi.fn(),
}));

vi.mock('../../utils/response.js', () => ({
  createMCPResponse: vi.fn((response: unknown) => JSON.stringify(response)),
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

describe('unstake.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUnstakeTools', () => {
    it('should register unstake-tokens tool', () => {
      registerUnstakeTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'unstake-tokens',
        expect.objectContaining({
          title: 'Unstake tokens from Layer2 operator',
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

    it('should register exactly 1 tool', () => {
      registerUnstakeTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('unstake-tokens tool', () => {
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
      });

      registerUnstakeTools(mockServer as unknown as McpServer);

      const toolCall = (
        mockServer.registerTool as ReturnType<typeof vi.fn>
      ).mock.calls.find((call) => call[0] === 'unstake-tokens');
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool registration not found');
      const toolFunction = toolCall[2] as (
        params: Record<string, unknown>
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'unstake-tokens 0x1234567890123456789012345678901234567890 100 --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should return error for insufficient staked amount', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockGetAccount.mockReturnValue({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
      } as unknown as ReturnType<typeof mockGetAccount>);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' }, // 100 tokens (27 decimals)
      ] as Awaited<ReturnType<typeof mockReadContracts>>);
      mockParseUnits.mockReturnValue(BigInt('200000000000000000000000000')); // 200 tokens (27 decimals)
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error response' }],
      });
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as unknown as McpServer);

      const toolCall = (
        mockServer.registerTool as ReturnType<typeof vi.fn>
      ).mock.calls.find((call) => call[0] === 'unstake-tokens');
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool registration not found');
      const toolFunction = toolCall[2] as (
        params: Record<string, unknown>
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '200',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0x1234567890123456789012345678901234567890',
              abi: ['function stakeOf(address,address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: [
                '0x1234567890123456789012345678901234567890',
                '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              ],
              chainId: 1,
            },
          ],
        }
      );
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient staked amount')
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

    it('should unstake tokens successfully', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
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
      mockGetAccount.mockReturnValue({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
      } as unknown as ReturnType<typeof mockGetAccount>);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('500000000000000000000000000'), status: 'success' }, // 500 tokens (27 decimals)
      ] as Awaited<ReturnType<typeof mockReadContracts>>);
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000000000')); // 100 tokens (27 decimals)
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as unknown as McpServer);

      const toolCall = (
        mockServer.registerTool as ReturnType<typeof vi.fn>
      ).mock.calls.find((call) => call[0] === 'unstake-tokens');
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool registration not found');
      const toolFunction = toolCall[2] as (
        params: Record<string, unknown>
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockParseUnits).toHaveBeenCalledWith('100', 27);
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function requestWithdrawal(address, uint256)'],
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          functionName: 'requestWithdrawal',
          args: [
            '0x1234567890123456789012345678901234567890',
            BigInt('100000000000000000000000000'),
          ],
          chainId: 1,
        }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        'Unstake tokens successfully on mainnet (tx: 0xtxhash)'
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
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockGetAccount.mockReturnValue({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
        addresses: undefined,
        chain: undefined,
        chainId: undefined,
        connector: undefined,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected',
      } as unknown as ReturnType<typeof mockGetAccount>);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('500000000000000000000000000'), status: 'success' },
      ] as Awaited<ReturnType<typeof mockReadContracts>>);
      mockWriteContract.mockResolvedValue('0xtxhash' as `0x${string}`);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as unknown as McpServer);

      const toolCall = (
        mockServer.registerTool as ReturnType<typeof vi.fn>
      ).mock.calls.find((call) => call[0] === 'unstake-tokens');
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool registration not found');
      const toolFunction = toolCall[2] as (
        params: Record<string, unknown>
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
});
