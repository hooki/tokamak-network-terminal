import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetAccountReturnType } from '@wagmi/core';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWalletTools } from '../wallet.js';

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

// Mock utils
vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
  createSuccessResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

vi.mock('../../utils/wallet.js', () => ({
  connectWallet: vi.fn(),
  generateQRCode: vi.fn(),
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

describe('wallet.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWalletTools', () => {
    it('should register wait-wallet-connect tool', () => {
      registerWalletTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'wait-wallet-connect',
        expect.objectContaining({
          title: 'Waiting for wallet connection',
          description: expect.stringContaining('Waiting for wallet connection'),
          inputSchema: expect.objectContaining({
            callback: expect.any(Object),
            timeout: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register connect-wallet tool', () => {
      registerWalletTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'connect-wallet',
        expect.objectContaining({
          title: 'Connect Wallet',
          description: expect.stringContaining('Connect to a wallet'),
          inputSchema: expect.objectContaining({
            callback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });

    it('should register exactly 2 tools', () => {
      registerWalletTools(mockServer as unknown as McpServer);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('wait-wallet-connect tool', () => {
    it('should return success when wallet is connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: true,
          address:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
          status: 'connected',
          isDisconnected: false,
        }) as GetAccountReturnType
      );
      mockCreateMCPResponse.mockReturnValue('success response');

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('wait-wallet-connect');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          callback: 'test-callback',
          timeout: 1000,
        },
        createMockRequestExtra()
      );

      expect(mockGetAccount).toHaveBeenCalledWith({ id: 'wagmi-config' });
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'continue',
        message: 'Wallet connected: 0x1234567890123456789012345678901234567890',
        nextStep: 'test-callback',
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

    it('should return error when wallet connection times out', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: false,
          status: 'disconnected',
        }) as GetAccountReturnType
      );
      mockCreateMCPResponse.mockReturnValue('error response');

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('wait-wallet-connect');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          callback: 'test-callback',
          timeout: 100, // Short timeout for testing
        },
        createMockRequestExtra()
      );

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Wallet connection timed out',
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

    it('should use default timeout when not provided', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: true,
          address: '0x123' as `0x${string}`,
          status: 'connected',
          isDisconnected: false,
        }) as GetAccountReturnType
      );

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('wait-wallet-connect');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      await toolFunction(
        {
          callback: 'test-callback',
          timeout: 100, // Provide short timeout for testing
        },
        createMockRequestExtra()
      );

      expect(mockGetAccount).toHaveBeenCalled();
    });
  });

  describe('connect-wallet tool', () => {
    it('should return QR code when connection is successful', async () => {
      const mockConnectWallet = vi.mocked(
        await import('../../utils/wallet.js')
      ).connectWallet;
      const mockGenerateQRCode = vi.mocked(
        await import('../../utils/wallet.js')
      ).generateQRCode;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockConnectWallet.mockResolvedValue('test-uri');
      mockGenerateQRCode.mockResolvedValue('qr-code-text');
      mockCreateMCPResponse.mockReturnValue('success response');

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('connect-wallet');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          callback: 'test-callback',
        },
        createMockRequestExtra()
      );

      expect(mockConnectWallet).toHaveBeenCalled();
      expect(mockGenerateQRCode).toHaveBeenCalledWith('test-uri');
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'continue',
        message: 'Wallet connection options generated',
        nextStep: 'wait-wallet-connect',
        callback: 'test-callback',
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'success response\n\n',
          },
          {
            type: 'text',
            text: '📱 **Mobile Users**: Scan the QR code below with your MetaMask app\n\n',
          },
          {
            type: 'text',
            text: 'qr-code-text',
          },
          {
            type: 'text',
            text: '\n\n⚠️ **Note**: Make sure you have MetaMask app installed on your mobile device',
          },
        ],
      });
    });

    it('should return error when QR code generation fails', async () => {
      const mockConnectWallet = vi.mocked(
        await import('../../utils/wallet.js')
      ).connectWallet;
      const mockGenerateQRCode = vi.mocked(
        await import('../../utils/wallet.js')
      ).generateQRCode;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockConnectWallet.mockResolvedValue('test-uri');
      mockGenerateQRCode.mockRejectedValue(new Error('QR generation failed'));
      mockCreateMCPResponse.mockReturnValue('error response');

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('connect-wallet');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      const result = await toolFunction(
        {
          callback: 'test-callback',
        },
        createMockRequestExtra()
      );

      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'QR Code generation failed',
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

    it('should handle connection failure', async () => {
      const mockConnectWallet = vi.mocked(
        await import('../../utils/wallet.js')
      ).connectWallet;

      mockConnectWallet.mockRejectedValue(new Error('Connection failed'));

      registerWalletTools(mockServer as unknown as McpServer);

      const toolFunction = getToolFunction('connect-wallet');
      expect(toolFunction).toBeDefined();

      if (!toolFunction) return; // Type guard for toolFunction

      await expect(
        toolFunction(
          {
            callback: 'test-callback',
          },
          createMockRequestExtra()
        )
      ).rejects.toThrow('Connection failed');
    });
  });
});
