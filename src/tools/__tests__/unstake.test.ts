import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUnstakeTools } from '../unstake.js';

// Mock MCP Server
const mockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  readContracts: vi.fn(),
  getAccount: vi.fn(),
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
  parseUnits: vi.fn(
    (value, decimals) => BigInt(value) * BigInt(10 ** decimals)
  ),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((network) => ({
    SEIG_MANAGER: '0x1234567890123456789012345678901234567890',
    DEPOSIT_MANAGER: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    TON_ADDRESS: '0x9876543210987654321098765432109876543210',
    WTON_ADDRESS: '0x1111111111111111111111111111111111111111',
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
  resolveLayer2Address: vi.fn(),
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

describe('unstake.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUnstakeTools', () => {
    it('should register unstake-tokens tool', () => {
      registerUnstakeTools(mockServer as any);

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
      registerUnstakeTools(mockServer as any);

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
        content: [{ type: 'text', text: 'wallet not connected' }],
      });

      registerUnstakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'unstake-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockGetAccount.mockReturnValue({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('100000000000000000000000000'), status: 'success' }, // 100 tokens (27 decimals)
      ] as any);
      mockParseUnits.mockReturnValue(BigInt('200000000000000000000000000')); // 200 tokens (27 decimals)
      mockCreateMCPResponse.mockReturnValue('error response');
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'unstake-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'error',
        message: expect.stringContaining('Insufficient staked amount'),
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
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockGetAccount.mockReturnValue({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('500000000000000000000000000'), status: 'success' }, // 500 tokens (27 decimals)
      ] as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockParseUnits.mockReturnValue(BigInt('100000000000000000000000000')); // 100 tokens (27 decimals)
      mockCreateMCPResponse.mockReturnValue('success response');
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'unstake-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Unstake tokens successfully on mainnet (tx: 0xtxhash)',
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
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      } as any);
      mockReadContracts.mockResolvedValue([
        { result: BigInt('500000000000000000000000000'), status: 'success' },
      ] as any);
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerUnstakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'unstake-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

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
