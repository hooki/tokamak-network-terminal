// Mock MCP Server with proper typing
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadContractsReturnType } from '@wagmi/core';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStakingInfoTools } from '../staking.js';

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
  readContracts: vi.fn(),
  getAccount: vi.fn(),
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
  formatUnits: vi.fn((value, decimals) =>
    (Number(value) / 10 ** decimals).toString()
  ),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((_network) => ({
    TON_ADDRESS: '0x1234567890123456789012345678901234567890',
    WTON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    SWAPPROXY: '0x9876543210987654321098765432109876543210',
    DEPOSIT_MANAGER: '0x1111111111111111111111111111111111111111',
    SEIG_MANAGER: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
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
  resolveLayer2Address: vi.fn((identifier, network) => {
    if (identifier.startsWith('0x')) return identifier;
    return `0x${identifier}${network}address`;
  }),
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

describe('staking.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerStakingInfoTools', () => {
    it('should register get-staked-balance tool', () => {
      registerStakingInfoTools(mockServer as unknown as McpServer);

      // Check if get-staked-balance was registered
      const calls = mockServer.registerTool.mock.calls;
      const stakedBalanceCall = calls.find(
        (call: readonly unknown[]) => call[0] === 'get-staked-balance'
      );

      expect(stakedBalanceCall).toBeDefined();
      expect(stakedBalanceCall?.[1]).toEqual(
        expect.objectContaining({
          title: 'Get staked balance for Layer2 operator(s)',
          description: expect.stringContaining(
            "Get the amount of staked WTON to one or multiple Layer2 operators. You can specify operators by name (e.g., 'hammer', 'tokamak1', 'level') or by address."
          ),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifiers: expect.any(Object),
            walletAddress: expect.any(Object),
          }),
        })
      );
    });

    it('should register get-total-staked tool', () => {
      registerStakingInfoTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-total-staked',
        expect.objectContaining({
          title: 'Get total staked amount for user across all Layer2 operators',
          description: expect.stringContaining(
            'Get the total amount of tokens staked'
          ),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            walletAddress: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register get-total-staked-layer tool', () => {
      registerStakingInfoTools(mockServer as unknown as McpServer);

      // Check if get-total-staked-layer was registered (it should be the 3rd call)
      const calls = mockServer.registerTool.mock.calls;
      const totalStakedLayerCall = calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked-layer'
      );

      expect(totalStakedLayerCall).toBeDefined();
      expect(totalStakedLayerCall?.[1]).toEqual(
        expect.objectContaining({
          title: 'Get total staked amount for Layer2 operator',
          description: expect.stringContaining(
            'Get the total amount of staked WTON'
          ),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
          }),
        })
      );
    });

    it('should register exactly 3 tools', () => {
      registerStakingInfoTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
  });

  describe('get-staked-balance tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const _mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockCreateMCPResponse.mockReturnValue('error response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-staked-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Wallet address is required',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'error response',
          },
        ],
      });
    });

    it('should get staked amount successfully', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' }, // 100 tokens (27 decimals)
        { result: BigInt('500000000000000000000000000'), status: 'success' }, // 500 tokens (27 decimals)
      ] as ReadContractsReturnType);
      mockFormatUnits
        .mockReturnValueOnce('100.0') // staked amount
        .mockReturnValueOnce('500.0'); // total staked amount
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-staked-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifiers: 'hammer',
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
              abi: ['function stakeOf(address,address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: [
                '0xhammermainnetaddress',
                '0x1234567890123456789012345678901234567890',
              ],
              chainId: 1,
            },
          ],
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message:
          '100.0 staked WTON to hammer on mainnet (address: 0x1234567890123456789012345678901234567890)',
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

    it('should handle sepolia network', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' },
      ] as ReadContractsReturnType);
      mockFormatUnits.mockReturnValue('100.0');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-staked-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        layer2Identifiers: 'hammer',
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'sepolia',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          contracts: expect.arrayContaining([
            expect.objectContaining({
              chainId: 11155111,
            }),
          ]),
        })
      );
    });

    it('should handle multiple layer2 identifiers', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' }, // hammer
        { result: BigInt('50000000000000000000000000'), status: 'success' }, // level
        { result: BigInt('75000000000000000000000000'), status: 'success' }, // tokamak1
      ] as ReadContractsReturnType);
      mockFormatUnits
        .mockReturnValueOnce('100.0') // hammer
        .mockReturnValueOnce('50.0') // level
        .mockReturnValueOnce('75.0'); // tokamak1
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-staked-balance'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        layer2Identifiers: ['hammer', 'level', 'tokamak1'],
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
              abi: ['function stakeOf(address,address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: [
                '0xhammermainnetaddress',
                '0x1234567890123456789012345678901234567890',
              ],
              chainId: 1,
            },
            {
              address: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
              abi: ['function stakeOf(address,address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: [
                '0xlevelmainnetaddress',
                '0x1234567890123456789012345678901234567890',
              ],
              chainId: 1,
            },
            {
              address: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
              abi: ['function stakeOf(address,address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: [
                '0xtokamak1mainnetaddress',
                '0x1234567890123456789012345678901234567890',
              ],
              chainId: 1,
            },
          ],
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: expect.stringContaining(
          'Staked amounts for 0x1234567890123456789012345678901234567890 on mainnet'
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
  });

  describe('get-total-staked tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockCreateMCPResponse.mockReturnValue('error response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        network: 'mainnet',
        walletAddress: '',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Wallet address is required',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'error response',
          },
        ],
      });
    });

    it('should get total staked amount successfully', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' }, // 1000 tokens (27 decimals)
      ] as ReadContractsReturnType);
      mockFormatUnits.mockReturnValue('1000.0');
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      const result = await toolFunction({
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
              abi: ['function stakeOf(address) view returns (uint256)'],
              functionName: 'stakeOf',
              args: ['0x1234567890123456789012345678901234567890'],
              chainId: 1,
            },
          ],
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message:
          'Total 1000.0 WTON staked by 0x1234567890123456789012345678901234567890 across all Layer2 operators on mainnet',
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

    it('should handle sepolia network', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' },
      ] as ReadContractsReturnType);
      mockFormatUnits.mockReturnValue('1000.0');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'sepolia',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          contracts: expect.arrayContaining([
            expect.objectContaining({
              chainId: 11155111,
            }),
          ]),
        })
      );
    });
  });

  describe('get-total-staked-layer tool', () => {
    it('should get total staked amount successfully', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' }, // 1000 tokens (27 decimals)
        { result: 27, status: 'success' }, // 27 decimals
      ] as ReadContractsReturnType);
      mockFormatUnits.mockReturnValue('1000.0');
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked-layer'
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

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          contracts: [
            {
              address: '0xhammermainnetaddress',
              abi: ['function totalStaked() view returns (uint256)'],
              functionName: 'totalStaked',
              chainId: 1,
            },
            {
              address: '0xhammermainnetaddress',
              abi: ['function decimals() view returns (uint8)'],
              functionName: 'decimals',
              chainId: 1,
            },
          ],
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Total 1000.0 WTON staked to hammer on mainnet',
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

    it('should handle address as layer2Identifier', async () => {
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' },
        { result: 27, status: 'success' },
      ] as ReadContractsReturnType);
      mockFormatUnits.mockReturnValue('1000.0');

      registerStakingInfoTools(mockServer as unknown as McpServer);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: readonly unknown[]) => call[0] === 'get-total-staked-layer'
      );
      expect(toolCall).toBeDefined();
      if (!toolCall) throw new Error('Tool call not found');
      const toolFunction = toolCall[2] as (
        ...args: unknown[]
      ) => Promise<unknown>;

      await toolFunction({
        layer2Identifier: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockReadContracts).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          contracts: expect.arrayContaining([
            expect.objectContaining({
              address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            }),
          ]),
        })
      );
    });
  });
});
