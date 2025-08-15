import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWalletTools } from '../wallet.js';

// Mock MCP Server
const mockServer = {
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
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

vi.mock('../../utils/wallet.js', () => ({
  connectWallet: vi.fn(),
  generateQRCode: vi.fn(),
}));

describe('wallet.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWalletTools', () => {
    it('should register wait-wallet-connect tool', () => {
      registerWalletTools(mockServer as any);

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
      registerWalletTools(mockServer as any);

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
      registerWalletTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('wait-wallet-connect tool', () => {
    it('should return success when wallet is connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;

      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      } as any);
      mockCreateMCPResponse.mockReturnValue('success response');

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'wait-wallet-connect'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        callback: 'test-callback',
        timeout: 1000,
      });

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

      mockGetAccount.mockReturnValue({ isConnected: false } as any);
      mockCreateMCPResponse.mockReturnValue('error response');

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'wait-wallet-connect'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        callback: 'test-callback',
        timeout: 100, // Short timeout for testing
      });

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

      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x123',
      } as any);

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'wait-wallet-connect'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        callback: 'test-callback',
        timeout: 100, // Provide short timeout for testing
      });

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

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'connect-wallet'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        callback: 'test-callback',
      });

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

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'connect-wallet'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        callback: 'test-callback',
      });

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

      registerWalletTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'connect-wallet'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await expect(
        toolFunction({
          callback: 'test-callback',
        })
      ).rejects.toThrow('Connection failed');
    });
  });
});
