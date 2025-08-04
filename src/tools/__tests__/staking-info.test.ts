import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerStakingInfoTools } from '../staking-info.js';

// Mock MCP Server
const mockServer = {
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
  formatUnits: vi.fn((value, decimals) => (Number(value) / Math.pow(10, decimals)).toString()),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((network) => ({
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
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

describe('staking-info.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerStakingInfoTools', () => {
    it('should register get-staked-amount-user tool', () => {
      registerStakingInfoTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-staked-amount-user',
        expect.objectContaining({
          title: 'Get staked amount for Layer2 operator',
          description: expect.stringContaining('Get the amount of tokens staked'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
            walletAddress: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register get-total-staked-layer tool', () => {
      registerStakingInfoTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-total-staked-layer',
        expect.objectContaining({
          title: 'Get total staked amount for Layer2 operator',
          description: expect.stringContaining('Get the total amount of tokens staked'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register get-total-staked-amount-user tool', () => {
      registerStakingInfoTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-total-staked-amount-user',
        expect.objectContaining({
          title: 'Get total staked amount for user across all Layer2 operators',
          description: expect.stringContaining('Get the total amount of tokens staked'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            walletAddress: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 3 tools', () => {
      registerStakingInfoTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
  });

  describe('get-staked-amount-user tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockCreateMCPResponse = vi.mocked(await import('../../utils/response.js')).createMCPResponse;

      mockCreateMCPResponse.mockReturnValue('error response');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(await import('../../utils/response.js')).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' }, // 100 tokens (27 decimals)
        { result: BigInt('500000000000000000000000000'), status: 'success' }, // 500 tokens (27 decimals)
      ] as any);
      mockFormatUnits
        .mockReturnValueOnce('100.0') // staked amount
        .mockReturnValueOnce('500.0'); // total staked amount
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
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
              args: ['0xhammermainnetaddress', '0x1234567890123456789012345678901234567890'],
              chainId: 1,
            },
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
        message: expect.stringContaining('100.0 staked TON to hammer on mainnet'),
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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' },
        { result: BigInt('500000000000000000000000000'), status: 'success' },
      ] as any);
      mockFormatUnits.mockReturnValue('100.0');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        layer2Identifier: 'hammer',
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

  describe('get-total-staked-amount-user tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const mockCreateMCPResponse = vi.mocked(await import('../../utils/response.js')).createMCPResponse;

      mockCreateMCPResponse.mockReturnValue('error response');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-total-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(await import('../../utils/response.js')).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' }, // 1000 tokens (27 decimals)
      ] as any);
      mockFormatUnits.mockReturnValue('1000.0');
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-total-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
        message: 'Total 1000.0 TON staked by 0x1234567890123456789012345678901234567890 across all Layer2 operators on mainnet',
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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' },
      ] as any);
      mockFormatUnits.mockReturnValue('1000.0');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-total-staked-amount-user'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(await import('../../utils/response.js')).createMCPResponse;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' }, // 1000 tokens (27 decimals)
        { result: 27, status: 'success' }, // 27 decimals
      ] as any);
      mockFormatUnits.mockReturnValue('1000.0');
      mockCreateMCPResponse.mockReturnValue('success response');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-total-staked-layer'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
        message: 'Total 1000.0 tokens staked to hammer on mainnet',
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
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockReadContracts.mockResolvedValue([
        { result: BigInt('1000000000000000000000000000'), status: 'success' },
        { result: 27, status: 'success' },
      ] as any);
      mockFormatUnits.mockReturnValue('1000.0');

      registerStakingInfoTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-total-staked-layer'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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