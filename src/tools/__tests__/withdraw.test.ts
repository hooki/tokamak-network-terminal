import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWithdrawTools } from '../withdraw.js';

// Mock MCP Server
const mockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  getAccount: vi.fn(),
  getBlockNumber: vi.fn(),
  readContract: vi.fn(),
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
  formatUnits: vi.fn((value, decimals) =>
    (Number(value) / 10 ** decimals).toString()
  ),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((network) => ({
    TON_ADDRESS: '0x1234567890123456789012345678901234567890',
    WTON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    SWAPPROXY: '0x9876543210987654321098765432109876543210',
    DEPOSIT_MANAGER: '0x1111111111111111111111111111111111111111',
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

vi.mock('../../utils/wallet.js', () => ({
  checkWalletConnection: vi.fn(),
}));

describe('withdraw.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWithdrawTools', () => {
    it('should register get-current-block-number tool', () => {
      registerWithdrawTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get-current-block-number',
        expect.objectContaining({
          title: 'Get current block number',
          description: expect.stringContaining('Get the current block number'),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 3 tools', () => {
      registerWithdrawTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
    it('should register pending-withdrawal-requests tool', () => {
      registerWithdrawTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'pending-withdrawal-requests',
        expect.objectContaining({
          title: 'Get pending withdrawal requests',
          description: expect.stringContaining(
            'Get pending withdrawal requests from a Layer2 network operator'
          ),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            layer2Identifier: expect.any(Object),
            walletAddress: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register withdraw-tokens tool', () => {
      registerWithdrawTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'withdraw-tokens',
        expect.objectContaining({
          title: 'Withdraw tokens',
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

    it('should register exactly 3 tools', () => {
      registerWithdrawTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
  });

  describe('get-current-block-number tool', () => {
    it('should get current block number successfully', async () => {
      const mockGetBlockNumber = vi.mocked(
        await import('@wagmi/core')
      ).getBlockNumber;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetBlockNumber.mockResolvedValue(BigInt('18456789'));
      mockCreateMCPResponse.mockReturnValue('success response');

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-current-block-number'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockGetBlockNumber).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        { chainId: 1 }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: expect.stringContaining(
          'Current block number on mainnet: 18456789'
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

    it('should handle sepolia network', async () => {
      const mockGetBlockNumber = vi.mocked(
        await import('@wagmi/core')
      ).getBlockNumber;

      mockGetBlockNumber.mockResolvedValue(BigInt('12345678'));

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-current-block-number'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        network: 'sepolia',
      });

      expect(mockGetBlockNumber).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        { chainId: 11155111 }
      );
    });

    it('should handle error', async () => {
      const mockGetBlockNumber = vi.mocked(
        await import('@wagmi/core')
      ).getBlockNumber;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetBlockNumber.mockRejectedValue(new Error('Network error'));
      mockCreateMCPResponse.mockReturnValue('error response');

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-current-block-number'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message:
          'Failed to get current block number on mainnet: Error: Network error',
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
  });

  describe('pending-withdrawal-requests tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockCreateMCPResponse.mockReturnValue('error response');

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'pending-withdrawal-requests'
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

    it('should return no withdrawal requests when none found', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
        { result: BigInt(0), status: 'success' }, // numRequests
      ] as any);
      mockCreateMCPResponse.mockReturnValue('no requests response');

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'pending-withdrawal-requests'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'No withdrawal request found on mainnet',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'no requests response',
          },
        ],
      });
    });

    it('should return pending withdrawal requests successfully', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts
        .mockResolvedValueOnce([
          { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
          { result: BigInt(2), status: 'success' }, // numRequests
        ] as any)
        .mockResolvedValueOnce([
          {
            result: [
              BigInt(1000),
              BigInt('100000000000000000000000000'),
              false,
            ],
            status: 'success',
          }, // pending request
        ] as any);
      mockFormatUnits.mockReturnValue('100.0');
      mockCreateMCPResponse.mockImplementation((response) =>
        JSON.stringify(response)
      );

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'pending-withdrawal-requests'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: expect.stringContaining('withdrawableBlockNumber'),
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('withdrawableBlockNumber'),
          },
        ],
      });
    });

    it('should handle sepolia network', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' },
        { result: BigInt(0), status: 'success' },
      ] as any);

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'pending-withdrawal-requests'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        layer2Identifier: 'hammer',
        network: 'sepolia',
        walletAddress: '0x1234567890123456789012345678901234567890',
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

  describe('withdraw-tokens tool', () => {
    it('should handle wallet not connected', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'withdraw-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'withdraw-tokens 0xhammermainnetaddress --network mainnet'
      );
      expect(result).toEqual({
        isConnected: false,
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should return error when no withdrawal requests found', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
        { result: BigInt(0), status: 'success' }, // numRequests
      ] as any);
      mockCreateMCPResponse.mockReturnValue('error response');

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'withdraw-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'No withdrawal request found on mainnet',
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

    it('should withdraw tokens successfully', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts
        .mockResolvedValueOnce([
          { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
          { result: BigInt(2), status: 'success' }, // numRequests
        ] as any)
        .mockResolvedValueOnce([
          {
            result: [
              BigInt(1000),
              BigInt('100000000000000000000000000'),
              false,
            ],
            status: 'success',
          }, // pending request
        ] as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockCreateMCPResponse.mockImplementation((response) =>
        JSON.stringify(response)
      );

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'withdraw-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: expect.arrayContaining([
            'function processRequest(address layer2, bool receiveTON)',
          ]),
          address: '0x1111111111111111111111111111111111111111',
          functionName: 'processRequest',
          args: ['0xhammermainnetaddress', true],
          chainId: 1,
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Withdraw tokens successfully on mainnet (tx: 0xtxhash)',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining(
              'Withdraw tokens successfully on mainnet'
            ),
          },
        ],
      });
    });

    it('should handle address as layer2Identifier', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' },
        { result: BigInt(1), status: 'success' },
      ] as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);

      registerWithdrawTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'withdraw-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        layer2Identifier: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', true],
        })
      );
    });
  });
});
