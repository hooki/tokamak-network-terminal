import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTokenTools } from '../token.js';

// Mock MCP Server
const mockServer = {
  registerTool: vi.fn(),
} as unknown as Parameters<typeof registerTokenTools>[0] & {
  registerTool: {
    mock: {
      calls: unknown[][];
    };
  };
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  getBalance: vi.fn(),
  readContracts: vi.fn(),
  writeContract: vi.fn(),
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

// Mock viem
vi.mock('viem', () => ({
  formatEther: vi.fn((value) => (Number(value) / 1e18).toString()),
  formatUnits: vi.fn((value, _decimals) =>
    (Number(value) / 10 ** _decimals).toString()
  ),
  parseAbi: vi.fn((abi) => abi),
  parseUnits: vi.fn((value, decimals) =>
    BigInt(Number(value) * 10 ** decimals)
  ),
  isAddress: vi.fn(
    (address) => address.startsWith('0x') && address.length === 42
  ),
}));

// Mock utils
vi.mock('../../constants.js', () => ({
  getNetworkTokens: vi.fn((_network) => ({
    TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
    WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
  })),
}));

vi.mock('../../utils/descriptionBuilder.js', () => ({
  DescriptionBuilder: vi.fn().mockImplementation((str) => ({
    withWalletConnect: vi.fn().mockReturnThis(),
    toString: vi.fn().mockReturnValue(`${str}_with_wallet_connect`),
  })),
}));

vi.mock('../../utils/response.js', () => ({
  createMCPResponse: vi.fn((response) => JSON.stringify(response)),
  createSuccessResponse: vi.fn((message) => ({
    content: [
      { type: 'text', text: JSON.stringify({ status: 'success', message }) },
    ],
  })),
  createErrorResponse: vi.fn((message) => ({
    content: [
      { type: 'text', text: JSON.stringify({ status: 'error', message }) },
    ],
  })),
}));

vi.mock('../../utils/wagmi-config.js', () => ({
  wagmiConfig: { id: 'wagmi-config' },
}));

vi.mock('../../utils/wallet.js', () => ({
  checkWalletConnection: vi.fn(),
}));

vi.mock('../../utils/erc20.js', () => ({
  getTokenBalance: vi.fn(),
  getTokenDecimals: vi.fn(),
}));

describe('send-token tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerTokenTools', () => {
    it('should register send-token tool', () => {
      registerTokenTools(mockServer);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'send-token',
        expect.objectContaining({
          title: 'Send ERC20 tokens',
          description: expect.stringContaining(
            'Send ERC20 tokens to a specified address'
          ),
          inputSchema: expect.objectContaining({
            network: expect.any(Object),
            tokenAddressOrSymbol: expect.any(Object),
            amount: expect.any(Object),
            toAddress: expect.any(Object),
            isCallback: expect.any(Object),
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('send-token functionality', () => {
    let sendTokenHandler: (params: {
      tokenAddressOrSymbol: string;
      amount: string;
      toAddress: string;
      network?: string;
      isCallback?: boolean;
    }) => Promise<unknown>;

    beforeEach(() => {
      registerTokenTools(mockServer);
      const sendTokenCall = mockServer.registerTool.mock.calls.find(
        (call: unknown[]) => call[0] === 'send-token'
      );
      if (sendTokenCall) {
        sendTokenHandler = sendTokenCall[2] as typeof sendTokenHandler;
      }
    });

    it('should validate amount input', async () => {
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error' }],
      });

      await sendTokenHandler({
        tokenAddressOrSymbol: 'TON',
        amount: 'invalid',
        toAddress: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Invalid amount. Must be a positive number.'
      );
    });

    it('should validate recipient address format', async () => {
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      const mockIsAddress = vi.mocked(await import('viem')).isAddress;

      mockIsAddress.mockReturnValue(false);
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error' }],
      });

      await sendTokenHandler({
        tokenAddressOrSymbol: 'TON',
        amount: '10',
        toAddress: 'invalid-address',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Invalid recipient address format.'
      );
    });

    it('should reject unknown token symbols', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockGetNetworkTokens = vi.mocked(
        await import('../../constants.js')
      ).getNetworkTokens;
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      const mockIsAddress = vi.mocked(await import('viem')).isAddress;

      mockIsAddress.mockReturnValue(true);
      mockCheckWalletConnection.mockResolvedValue(null);
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      } as any);
      mockGetNetworkTokens.mockReturnValue({
        TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
        WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
      });
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error' }],
      });

      await sendTokenHandler({
        tokenAddressOrSymbol: 'UNKNOWN',
        amount: '10',
        toAddress: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Unknown token symbol "UNKNOWN" on mainnet. Supported tokens: TON, WTON'
      );
    });

    it('should handle successful token transfer with symbol', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockGetNetworkTokens = vi.mocked(
        await import('../../constants.js')
      ).getNetworkTokens;
      const mockCreateSuccessResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createSuccessResponse;
      const mockIsAddress = vi.mocked(await import('viem')).isAddress;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockIsAddress.mockReturnValue(true);
      mockCheckWalletConnection.mockResolvedValue(null);
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      } as any);
      mockGetNetworkTokens.mockReturnValue({
        TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
        WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
      });
      mockReadContracts.mockResolvedValue([
        { result: 18, error: null }, // decimals
        { result: BigInt('1000000000000000000000'), error: null }, // balance (1000 tokens)
        { result: 'TON', error: null }, // symbol
      ]);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens
      mockFormatUnits.mockImplementation((value, decimals) =>
        (Number(value) / 10 ** decimals).toString()
      );
      mockWriteContract.mockResolvedValue('0xabcdef1234567890');
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success' }],
      });

      const result = await sendTokenHandler({
        tokenAddressOrSymbol: 'TON',
        amount: '100',
        toAddress: '0x9876543210987654321098765432109876543210',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          address: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
          functionName: 'transfer',
          args: [
            '0x9876543210987654321098765432109876543210',
            BigInt('100000000000000000000'),
          ],
        })
      );
      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('Token Transfer Successful')
      );
      expect(result).toEqual({ content: [{ type: 'text', text: 'success' }] });
    });

    it('should handle token transfer with contract address', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
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
      const mockIsAddress = vi.mocked(await import('viem')).isAddress;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockIsAddress.mockReturnValue(true);
      mockCheckWalletConnection.mockResolvedValue(null);
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: 6, error: null }, // decimals (USDC has 6 decimals)
        { result: BigInt('1000000000'), error: null }, // balance (1000 USDC)
        { result: 'USDC', error: null }, // symbol
      ]);
      mockParseUnits.mockReturnValue(BigInt('100000000')); // 100 USDC
      mockFormatUnits.mockImplementation((value, decimals) =>
        (Number(value) / 10 ** decimals).toString()
      );
      mockWriteContract.mockResolvedValue('0xabcdef1234567890');
      mockCreateSuccessResponse.mockReturnValue({
        content: [{ type: 'text', text: 'success' }],
      });

      const result = await sendTokenHandler({
        tokenAddressOrSymbol: '0xA0b86a33E6441E5e5c7C2f32b5c6E5e5d5e5e5e5',
        amount: '100',
        toAddress: '0x9876543210987654321098765432109876543210',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        expect.objectContaining({
          address: '0xA0b86a33E6441E5e5c7C2f32b5c6E5e5d5e5e5e5',
          functionName: 'transfer',
          args: [
            '0x9876543210987654321098765432109876543210',
            BigInt('100000000'),
          ],
        })
      );
      expect(result).toEqual({ content: [{ type: 'text', text: 'success' }] });
    });

    it('should handle insufficient balance error', async () => {
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContracts = vi.mocked(
        await import('@wagmi/core')
      ).readContracts;
      const mockGetNetworkTokens = vi.mocked(
        await import('../../constants.js')
      ).getNetworkTokens;
      const mockCreateErrorResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createErrorResponse;
      const mockIsAddress = vi.mocked(await import('viem')).isAddress;
      const mockParseUnits = vi.mocked(await import('viem')).parseUnits;
      const mockFormatUnits = vi.mocked(await import('viem')).formatUnits;

      mockIsAddress.mockReturnValue(true);
      mockCheckWalletConnection.mockResolvedValue(null);
      mockGetAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      } as any);
      mockGetNetworkTokens.mockReturnValue({
        TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
        WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
      });
      mockReadContracts.mockResolvedValue([
        { result: 18, error: null }, // decimals
        { result: BigInt('50000000000000000000'), error: null }, // balance (50 tokens)
        { result: 'TON', error: null }, // symbol
      ]);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000')); // trying to send 100 tokens
      mockFormatUnits.mockReturnValue('50'); // current balance
      mockCreateErrorResponse.mockReturnValue({
        content: [{ type: 'text', text: 'error' }],
      });

      const result = await sendTokenHandler({
        tokenAddressOrSymbol: 'TON',
        amount: '100',
        toAddress: '0x9876543210987654321098765432109876543210',
        network: 'mainnet',
      });

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Insufficient balance. You have 50 TON, but trying to send 100 TON.'
      );
      expect(result).toEqual({ content: [{ type: 'text', text: 'error' }] });
    });
  });
});
