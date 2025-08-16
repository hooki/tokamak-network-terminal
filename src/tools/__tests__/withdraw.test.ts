import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetAccountReturnType } from '@wagmi/core';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWithdrawTools } from '../withdraw.js';

// Import global types
/// <reference path="../../../global.d.ts" />

// Define types to match the global types
interface WalletCheckResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  isConnected: boolean;
  [key: string]: unknown;
}

// Define proper mock types
interface MockServer {
  registerTool: MockedFunction<McpServer['registerTool']>;
}

const mockServer: MockServer = {
  registerTool: vi.fn(),
};

// Helper function to safely get tool function from mock calls
function getToolFunction(toolName: string) {
  const toolCall = mockServer.registerTool.mock.calls.find(
    (call: readonly unknown[]) => call[0] === toolName
  );
  expect(toolCall).toBeDefined();
  if (!toolCall) throw new Error('Tool call not found');
  return toolCall[2] as (...args: unknown[]) => Promise<unknown>;
}

// Helper to create mock account data
function createMockAccountData(
  overrides: Partial<GetAccountReturnType> = {}
): GetAccountReturnType {
  const base = {
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
  } as const;

  return { ...base, ...overrides } as GetAccountReturnType;
}

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
  getNetworkAddresses: vi.fn((_network) => ({
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
  createSuccessResponse: vi.fn((message: string | object) => ({
    content: [
      {
        type: 'text',
        text: typeof message === 'string' ? message : JSON.stringify(message),
      },
    ],
  })),
  createErrorResponse: vi.fn((message: string | object) => ({
    content: [
      {
        type: 'text',
        text: typeof message === 'string' ? message : JSON.stringify(message),
      },
    ],
  })),
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
      registerWithdrawTools(mockServer as unknown as McpServer);

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
      registerWithdrawTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
    it('should register pending-withdrawal-requests tool', () => {
      registerWithdrawTools(mockServer as unknown as McpServer);

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
      registerWithdrawTools(mockServer as unknown as McpServer);

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
      registerWithdrawTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    });
  });

  describe('get-current-block-number tool', () => {
    it('should get current block number successfully', async () => {
      const mockGetBlockNumber = vi.mocked(
        await import('@wagmi/core')
      ).getBlockNumber;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;

      mockGetBlockNumber.mockResolvedValue(BigInt('18456789'));
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success response' }],
      });

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('get-current-block-number');

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockGetBlockNumber).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        { chainId: 1 }
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('Current block number on mainnet: 18456789')
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
      const mockGetBlockNumber = vi.mocked(
        await import('@wagmi/core')
      ).getBlockNumber;

      mockGetBlockNumber.mockResolvedValue(BigInt('12345678'));

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('get-current-block-number');

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
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;

      mockGetBlockNumber.mockRejectedValue(new Error('Network error'));
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error response' }],
      });

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('get-current-block-number');

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to get current block number on mainnet: Error: Network error'
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
  });

  describe('pending-withdrawal-requests tool', () => {
    it('should return error when wallet address is not provided', async () => {
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;

      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error response' }],
      });

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('pending-withdrawal-requests');

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Wallet address is required'
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

    it('should return no withdrawal requests when none found', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
        { result: BigInt(0), status: 'success' }, // numRequests
      ]);
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'no requests response' }],
      });

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('pending-withdrawal-requests');

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        'No withdrawal request found on mainnet'
      );
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
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts
        .mockResolvedValueOnce([
          { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
          { result: BigInt(2), status: 'success' }, // numRequests
        ])
        .mockResolvedValueOnce([
          {
            result: [
              BigInt(1000),
              BigInt('100000000000000000000000000'),
              false,
            ],
            status: 'success',
          }, // pending request
        ]);
      mockFormatUnits.mockReturnValue('100.0');
      mockCreateSuccessResponse.mockImplementation(
        (message: string | object) => ({
          content: [
            {
              type: 'text',
              text:
                typeof message === 'string' ? message : JSON.stringify(message),
            },
          ],
        })
      );

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('pending-withdrawal-requests');

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
        walletAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('withdrawableBlockNumber')
      );
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
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' },
        { result: BigInt(0), status: 'success' },
      ]);

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('pending-withdrawal-requests');

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
      } as WalletCheckResult);

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('withdraw-tokens');

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
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
        { result: BigInt(0), status: 'success' }, // numRequests
      ]);
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error response' }],
      });

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('withdraw-tokens');

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'No withdrawal request found on mainnet'
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

    it('should withdraw tokens successfully', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts
        .mockResolvedValueOnce([
          { result: BigInt(0), status: 'success' }, // withdrawalRequestIndex
          { result: BigInt(2), status: 'success' }, // numRequests
        ])
        .mockResolvedValueOnce([
          {
            result: [
              BigInt(1000),
              BigInt('100000000000000000000000000'),
              false,
            ],
            status: 'success',
          }, // pending request
        ]);
      mockWriteContract.mockResolvedValue('0xtxhash');
      mockCreateSuccessResponse.mockImplementation(
        (message: string | object) => ({
          content: [
            {
              type: 'text',
              text:
                typeof message === 'string' ? message : JSON.stringify(message),
            },
          ],
        })
      );

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('withdraw-tokens');

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
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        'Withdraw tokens successfully on mainnet (tx: 0xtxhash)'
      );
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
      } as WalletCheckResult);
      mockGetAccount.mockReturnValue(
        createMockAccountData({
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          status: 'connected',
        })
      );
      mockReadContracts.mockResolvedValue([
        { result: BigInt(0), status: 'success' },
        { result: BigInt(1), status: 'success' },
      ]);
      mockWriteContract.mockResolvedValue('0xtxhash');

      registerWithdrawTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('withdraw-tokens');

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
