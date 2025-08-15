import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectWallet, generateQRCode, checkWalletConnection } from '../wallet.js';

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
  default: {
    generate: vi.fn(),
  },
}));

// Mock wagmi config
vi.mock('../wagmi-config.js', () => ({
  wagmiConfig: {
    _internal: {
      connectors: {
        setup: vi.fn(() => ({
          emitter: {
            on: vi.fn(),
          },
        })),
      },
    },
  },
}));

describe('wallet.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectWallet', () => {
    it('should resolve with URI when display_uri event is emitted', async () => {
      const mockConnect = vi.mocked(await import('@wagmi/core')).connect;
      const mockMetaMask = vi.mocked(await import('@wagmi/connectors')).metaMask;
      const mockSetup = vi.mocked(await import('../wagmi-config.js')).wagmiConfig._internal.connectors.setup;

      // Mock the connector setup
      const mockConnector = {
        emitter: {
          on: vi.fn((event: string, callback: (payload: any) => void) => {
            if (event === 'message') {
              // Simulate the display_uri event
              setTimeout(() => {
                callback({ type: 'display_uri', data: 'test-uri' });
              }, 0);
            }
          }),
        },
      };
      (mockSetup as any).mockReturnValue(mockConnector);

      const result = await connectWallet();

      expect(mockMetaMask).toHaveBeenCalledWith({ headless: true });
      expect(mockSetup).toHaveBeenCalled();
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
      const mockQrcode = vi.mocked(await import('qrcode-terminal')).default;
      (mockQrcode.generate as any).mockImplementation((uri: string, options: any, callback: () => void) => {
        callback();
      });

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
      mockGetAccount.mockReturnValue({ isConnected: false } as any);

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
      mockGetAccount.mockReturnValue({ isConnected: true, address: '0x1234567890123456789012345678901234567890' } as any);

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
  });
});