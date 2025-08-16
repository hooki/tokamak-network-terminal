import type { GetAccountReturnType } from '@wagmi/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkWalletConnection,
  connectWallet,
  generateQRCode,
} from '../wallet.js';

// Import global types
/// <reference path="../../../global.d.ts" />

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  readContracts: vi.fn(),
  createStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
  createConfig: vi.fn(() => ({})),
  http: vi.fn(() => ({})),
  connect: vi.fn(() => Promise.resolve()),
  getAccount: vi.fn(),
}));

// Mock wagmi chains
vi.mock('@wagmi/core/chains', () => ({
  mainnet: { id: 1 },
  sepolia: { id: 11155111 },
}));

// Mock wagmi connectors
vi.mock('@wagmi/connectors', () => ({
  metaMask: vi.fn(() => ({})),
}));

// Mock qrcode-terminal
vi.mock('qrcode-terminal', () => ({
  generate: vi.fn(),
}));

// Mock response utilities
vi.mock('../response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
}));

// Mock wagmi config
vi.mock('../wagmi-config.js', () => ({
  wagmiConfig: {
    _internal: {
      connectors: {
        setup: vi.fn(),
      },
    },
  },
}));

// Mock interface for wagmi config setup
interface MockWagmiConfig {
  _internal: {
    connectors: {
      setup: ReturnType<typeof vi.fn>;
    };
  };
}

function createMockAccountData(overrides: Partial<GetAccountReturnType> = {}) {
  const base: GetAccountReturnType = {
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
  };
  return { ...base, ...overrides } as GetAccountReturnType;
}

describe('wallet.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectWallet', () => {
    it('should resolve with URI when display_uri event is emitted', async () => {
      const mockConnect = vi.mocked(await import('@wagmi/core')).connect;
      const mockMetaMask = vi.mocked(
        await import('@wagmi/connectors')
      ).metaMask;
      const mockWagmiConfig = vi.mocked(await import('../wagmi-config.js'))
        .wagmiConfig as unknown as MockWagmiConfig;

      // Mock the connector setup
      const mockConnector = {
        emitter: {
          on: vi.fn(
            (
              event: string,
              callback: (payload: { type: string; data: string }) => void
            ) => {
              if (event === 'message') {
                // Simulate the display_uri event
                setTimeout(() => {
                  callback({ type: 'display_uri', data: 'test-uri' });
                }, 0);
              }
            }
          ),
        },
      };
      mockWagmiConfig._internal.connectors.setup.mockReturnValue(mockConnector);

      const result = await connectWallet();

      expect(mockMetaMask).toHaveBeenCalledWith({ headless: true });
      expect(mockWagmiConfig._internal.connectors.setup).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
      expect(result).toBe('test-uri');
    });

    it('should reject when connect fails', async () => {
      const mockConnect = vi.mocked(await import('@wagmi/core')).connect;
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      await expect(connectWallet()).rejects.toThrow('Connection failed');
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code and resolve', async () => {
      const mockQrcode = vi.mocked(await import('qrcode-terminal'));
      mockQrcode.generate.mockImplementation(
        (
          _uri: string,
          _options: { small: boolean } | undefined,
          callback?: (qrcode: string) => void
        ) => {
          callback?.('mocked qr code');
        }
      );

      await generateQRCode('test-uri');

      expect(mockQrcode.generate).toHaveBeenCalledWith(
        'test-uri',
        { small: true },
        expect.any(Function)
      );
    });
  });

  describe('checkWalletConnection', () => {
    it('should return continue response when wallet is not connected and isCallback is true', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../response.js')
      ).createMCPResponse;

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: false,
        })
      );
      mockCreateMCPResponse.mockReturnValue(
        '{"status":"continue","message":"waiting for wallet connection"}'
      );

      const result = await checkWalletConnection(true, 'test-callback');

      expect(result).toEqual({
        isConnected: false,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('waiting for wallet connection'),
          },
        ],
      });
    });

    it('should return success response when wallet is connected', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../response.js')
      ).createMCPResponse;

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: true,
          address:
            '0x1234567890123456789012345678901234567890' as `0x${string}`,
        })
      );
      mockCreateMCPResponse.mockReturnValue(
        '{"status":"success","message":"Wallet is connected"}'
      );

      const result = await checkWalletConnection(false, 'test-callback');

      expect(result).toEqual({
        isConnected: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Wallet is connected'),
          },
        ],
      });
    });

    it('should handle QR code generation when wallet is not connected and isCallback is false', async () => {
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockCreateMCPResponse = vi.mocked(
        await import('../response.js')
      ).createMCPResponse;
      const mockConnect = vi.mocked(await import('@wagmi/core')).connect;
      const mockWagmiConfig = vi.mocked(await import('../wagmi-config.js'))
        .wagmiConfig as unknown as MockWagmiConfig;
      const mockQrcode = vi.mocked(await import('qrcode-terminal'));

      mockGetAccount.mockReturnValue(
        createMockAccountData({
          isConnected: false,
        })
      );

      // Mock connector setup for connectWallet
      const mockConnector = {
        emitter: {
          on: vi.fn(
            (
              event: string,
              callback: (payload: { type: string; data: string }) => void
            ) => {
              if (event === 'message') {
                setTimeout(() => {
                  callback({ type: 'display_uri', data: 'test-uri' });
                }, 0);
              }
            }
          ),
        },
      };
      mockWagmiConfig._internal.connectors.setup.mockReturnValue(mockConnector);

      // Mock QR code generation to return a simulated QR string
      mockQrcode.generate.mockImplementation(
        (
          _uri: string,
          _options: { small: boolean } | undefined,
          callback?: (qrcode: string) => void
        ) => {
          // Simulate QR code generation with actual QR text
          callback?.(
            '█▀▀▀▀▀█ ▄▀▄▄▀ █▀▀▀▀▀█\n█ ███ █ ██▄ ▀▄ █ ███ █\n█ ▀▀▀ █ ▀▄█▄▀█ █ ▀▀▀ █'
          );
        }
      );

      // Ensure connect resolves properly
      mockConnect.mockResolvedValue({
        accounts: [
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
        ],
        chainId: 1,
      });

      mockCreateMCPResponse.mockReturnValue(
        '{"status":"continue","message":"QR code generated successfully"}'
      );

      const result = await checkWalletConnection(false, 'test-callback');

      expect(result).toEqual({
        isConnected: false,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('QR code generated successfully'),
          },
          {
            type: 'text',
            text: expect.stringContaining('Please scan the QR code'),
          },
        ],
      });
    });
  });
});
