import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStakeTools } from '../stake.js';

// Mock MCP Server
const mockServer = {
  registerTool: vi.fn(),
};

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  getAccount: vi.fn(),
  readContract: vi.fn(),
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

// Mock viem functions
vi.mock('viem', () => ({
  parseAbi: vi.fn((abi) => abi),
  parseEther: vi.fn((value) => BigInt(value) * BigInt(10 ** 18)),
  encodeAbiParameters: vi.fn((types, values) => `encoded_${values.join('_')}`),
}));

// Mock constants
vi.mock('../../constants.js', () => ({
  DEPOSIT_MANAGER: '0x1234567890123456789012345678901234567890',
  TON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  WTON_ADDRESS: '0x9876543210987654321098765432109876543210',
  getNetworkAddresses: vi.fn((network) => ({
    DEPOSIT_MANAGER: '0x1234567890123456789012345678901234567890',
    TON_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    WTON_ADDRESS: '0x9876543210987654321098765432109876543210',
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

describe('stake.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerStakeTools', () => {
    it('should register stake-tokens tool', () => {
      registerStakeTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'stake-tokens',
        expect.objectContaining({
          title: 'Stake tokens to Layer2 operator',
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

    it('should register update-seigniorage tool', () => {
      registerStakeTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'update-seigniorage',
        expect.objectContaining({
          title: 'Update seigniorage',
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

    it('should register exactly 2 tools', () => {
      registerStakeTools(mockServer as any);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('stake-tokens tool', () => {
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

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'stake-tokens'
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
        'stake-tokens 0x1234567890123456789012345678901234567890 100 --network mainnet'
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should stake tokens successfully', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockParseEther = vi.mocked(await import('viem')).parseEther;
      const mockEncodeAbiParameters = vi.mocked(
        await import('viem')
      ).encodeAbiParameters;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockGetNetworkAddresses = vi.mocked(
        await import('../../constants.js')
      ).getNetworkAddresses;
      const mockCreateMCPResponse = vi.mocked(
        await import('../../utils/response.js')
      ).createMCPResponse;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockParseEther.mockReturnValue(BigInt('100000000000000000000')); // 100 tokens
      mockEncodeAbiParameters.mockReturnValue(
        '0x1234567890123456789012345678901234567890123456789012345678901234567890' as `0x${string}`
      );
      mockCreateMCPResponse.mockReturnValue('success response');
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'stake-tokens'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        tokenAmount: '100',
        network: 'mainnet',
      });

      expect(mockResolveLayer2Address).toHaveBeenCalledWith(
        'hammer',
        'mainnet'
      );
      expect(mockGetNetworkAddresses).toHaveBeenCalledWith('mainnet');
      expect(mockParseEther).toHaveBeenCalledWith('100');
      expect(mockEncodeAbiParameters).toHaveBeenCalledWith(
        [{ type: 'address' }, { type: 'address' }],
        [
          '0x1234567890123456789012345678901234567890',
          '0x1234567890123456789012345678901234567890',
        ]
      );
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function approveAndCall(address, uint256, bytes)'],
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          functionName: 'approveAndCall',
          args: [
            '0x9876543210987654321098765432109876543210',
            BigInt('100000000000000000000'),
            '0x1234567890123456789012345678901234567890123456789012345678901234567890',
          ],
          chainId: 1,
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Stake tokens successfully on mainnet (tx: 0xtxhash)',
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
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;
      const mockCheckWalletConnection = vi.mocked(
        await import('../../utils/wallet.js')
      ).checkWalletConnection;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'stake-tokens'
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

  describe('update-seigniorage tool', () => {
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

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockCheckWalletConnection).toHaveBeenCalledWith(
        undefined,
        'update-seigniorage 0x1234567890123456789012345678901234567890 --network mainnet'
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'wallet not connected' }],
      });
    });

    it('should update seigniorage successfully', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
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
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockCreateMCPResponse.mockReturnValue('success response');
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: true,
        content: [{ type: 'text', text: 'Wallet is connected' }],
      });

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        layer2Identifier: 'hammer',
        network: 'mainnet',
      });

      expect(mockResolveLayer2Address).toHaveBeenCalledWith(
        'hammer',
        'mainnet'
      );
      expect(mockWriteContract).toHaveBeenCalledWith(
        { id: 'wagmi-config' },
        {
          abi: ['function updateSeigniorage()'],
          address: '0x1234567890123456789012345678901234567890',
          functionName: 'updateSeigniorage',
          args: [],
          chainId: 1,
        }
      );
      expect(mockCreateMCPResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Update seigniorage successfully on mainnet (tx: 0xtxhash)',
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

    it('should handle sepolia network for update-seigniorage', async () => {
      const mockWriteContract = vi.mocked(
        await import('@wagmi/core')
      ).writeContract;
      const mockResolveLayer2Address = vi.mocked(
        await import('../../utils/layer2.js')
      ).resolveLayer2Address;

      mockResolveLayer2Address.mockReturnValue(
        '0x1234567890123456789012345678901234567890'
      );
      mockWriteContract.mockResolvedValue('0xtxhash' as any);

      registerStakeTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'update-seigniorage'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        layer2Identifier: 'hammer',
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
