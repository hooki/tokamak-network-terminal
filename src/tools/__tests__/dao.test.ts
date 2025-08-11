import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDAOTools } from '../dao.js';

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
  getPublicClient: vi.fn(),
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

// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((network) => ({
    DAO_COMMITTEE: network === 'mainnet'
      ? '0x1234567890123456789012345678901234567890'
      : '0x0987654321098765432109876543210987654321',
    LAYER2_MANAGER: '0x2345678901234567890123456789012345678901',
    SEIG_MANAGER: '0x3456789012345678901234567890123456789012',
  })),
}));

// Mock utils
vi.mock('../../utils/dao.js', () => ({
  getDAOMembersActivityReward: vi.fn(),
  getDAOMemberCount: vi.fn(),
  getDAOMemberCandidateInfo: vi.fn(),
  getDAOMemberOperatorManagerInfo: vi.fn(),
  checkDAOMembership: vi.fn(),
  getDAOMembersStakingInfo: vi.fn(),
  getChallengeInfo: vi.fn(),
}));

// Mock the response functions to return proper structure
vi.mock('../../utils/response.js', () => ({
  createSuccessResponse: vi.fn((message) => {
    if (typeof message === 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ status: 'success', message }),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(message),
          },
        ],
      };
    }
  }),
  createErrorResponse: vi.fn((message) => {
    if (typeof message === 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ status: 'error', message }),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(message),
          },
        ],
      };
    }
  }),
}));

// Mock wallet.js
vi.mock('../../utils/wallet.js', () => ({
  checkWalletConnection: vi.fn(),
}));

vi.mock('../../utils/format.js', () => ({
  formatTokenAmountWithUnitPrecise: vi.fn(),
}));

// Mock ABIs
vi.mock('../../abis/daoCommittee.js', () => ({
  daoCommitteeAbi: [
    {
      type: 'function',
      name: 'getClaimableActivityReward',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ],
}));

vi.mock('../../abis/daoCandidate.js', () => ({
  daoCandidateAbi: [
    {
      type: 'function',
      name: 'candidate',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'claimActivityReward',
      inputs: [],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],
}));

vi.mock('../../abis/operatorManager.js', () => ({
  operatorManagerAbi: [
    {
      type: 'function',
      name: 'manager',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ],
}));

describe('dao.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get-dao-member-count tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-count'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Get DAO member count');
    });

    it('should return success when getDAOMemberCount succeeds', async () => {
      const mockGetDAOMemberCount = vi.mocked(await import('../../utils/dao.js')).getDAOMemberCount;

      mockGetDAOMemberCount.mockResolvedValue(10);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-count'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockGetDAOMemberCount).toHaveBeenCalledWith('mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('DAO member count on mainnet: 10');
    });

    it('should return error when getDAOMemberCount fails', async () => {
      const mockGetDAOMemberCount = vi.mocked(await import('../../utils/dao.js')).getDAOMemberCount;

      mockGetDAOMemberCount.mockRejectedValue(new Error('Network error'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-count'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toBe('Failed to get DAO member count on mainnet: Network error');
    });
  });

  describe('get-dao-member-candidate-info tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-candidate-info'
      );

      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Get DAO member candidate information');
    });

    it('should return success when getDAOMemberCandidateInfo succeeds', async () => {
      const mockGetDAOMemberCandidateInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMemberCandidateInfo;

      mockGetDAOMemberCandidateInfo.mockResolvedValue([
        {
          candidate: '0x1234567890123456789012345678901234567890',
          candidateInfo: {
            candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            indexMembers: BigInt(1),
            memberJoinedTime: BigInt(1234567890),
            rewardPeriod: BigInt(86400),
            claimedTimestamp: BigInt(1234567890),
          },
        },
      ]);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-candidate-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockGetDAOMemberCandidateInfo).toHaveBeenCalledWith('mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('Found 1 DAO members on mainnet. Member count: 1');
    });

    it('should return error when getDAOMemberCandidateInfo fails', async () => {
      const mockGetDAOMemberCandidateInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMemberCandidateInfo;

      mockGetDAOMemberCandidateInfo.mockRejectedValue(new Error('Network error'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-candidate-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toBe('Failed to get DAO member candidate info on mainnet: Network error');
    });
  });

  describe('get-dao-member-operator-manager-info tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-operator-manager-info'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Get DAO member operator manager information');
    });

    it('should return success when getDAOMemberOperatorManagerInfo succeeds', async () => {
      const mockGetDAOMemberOperatorManagerInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMemberOperatorManagerInfo;

      mockGetDAOMemberOperatorManagerInfo.mockResolvedValue([
        {
          candidate: '0x1234567890123456789012345678901234567890',
          candidateInfo: {
            candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            indexMembers: BigInt(1),
            memberJoinedTime: BigInt(1234567890),
            rewardPeriod: BigInt(86400),
            claimedTimestamp: BigInt(1234567890),
          },
          operatorManager: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          manager: '0x1234567890123456789012345678901234567890',
        },
      ]);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-operator-manager-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      expect(mockGetDAOMemberOperatorManagerInfo).toHaveBeenCalledWith('mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('Found 1 DAO members with operator manager info on mainnet. Member count: 1');
    });

    it('should return error when getDAOMemberOperatorManagerInfo fails', async () => {
      const mockGetDAOMemberOperatorManagerInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMemberOperatorManagerInfo;

      mockGetDAOMemberOperatorManagerInfo.mockRejectedValue(new Error('Network error'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-member-operator-manager-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toBe('Failed to get DAO member operator manager info on mainnet: Network error');
    });
  });

  describe('check-dao-membership tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'check-dao-membership'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Check DAO membership');
    });

    it('should return success when address is a DAO member', async () => {
      const mockCheckDAOMembership = vi.mocked(await import('../../utils/dao.js')).checkDAOMembership;

      mockCheckDAOMembership.mockResolvedValue(true);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'check-dao-membership'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      expect(mockCheckDAOMembership).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890', 'mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('Address 0x1234567890123456789012345678901234567890 is a DAO member on mainnet');
    });

    it('should return success when address is not a DAO member', async () => {
      const mockCheckDAOMembership = vi.mocked(await import('../../utils/dao.js')).checkDAOMembership;

      mockCheckDAOMembership.mockResolvedValue(false);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'check-dao-membership'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('Address 0x1234567890123456789012345678901234567890 is not a DAO member on mainnet');
    });

    it('should return error when checkDAOMembership fails', async () => {
      const mockCheckDAOMembership = vi.mocked(await import('../../utils/dao.js')).checkDAOMembership;

      mockCheckDAOMembership.mockRejectedValue(new Error('Network error'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'check-dao-membership'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        address: '0x1234567890123456789012345678901234567890',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toBe('Failed to check DAO membership for 0x1234567890123456789012345678901234567890 on mainnet: Network error');
    });
  });

  describe('get-dao-members-staking-info tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-members-staking-info'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Get DAO members staking information');
    });

    it('should return success when getDAOMembersStakingInfo succeeds', async () => {
      const mockGetDAOMembersStakingInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMembersStakingInfo;

      mockGetDAOMembersStakingInfo.mockResolvedValue([
        {
          candidate: '0x1234567890123456789012345678901234567890',
          candidateInfo: {
            candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            indexMembers: BigInt(1),
            memberJoinedTime: BigInt(1234567890),
            rewardPeriod: BigInt(86400),
            claimedTimestamp: BigInt(1234567890),
          },
          memo: 'Test memo',
          totalStaked: '1000.00000000 WTON',
          lastCommitBlock: BigInt(12345678),
          lastUpdateSeigniorageTime: BigInt(1234567890),
          claimableActivityReward: '500.00000000 WTON',
          operatorManager: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          manager: '0x1234567890123456789012345678901234567890',
        },
      ]);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-members-staking-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        includeOperatorManager: true,
      });

      expect(mockGetDAOMembersStakingInfo).toHaveBeenCalledWith('mainnet', true);

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.message).toBe('Found 1 DAO members with staking info on mainnet. Member count: 1');
    });

    it('should return error when getDAOMembersStakingInfo fails', async () => {
      const mockGetDAOMembersStakingInfo = vi.mocked(await import('../../utils/dao.js')).getDAOMembersStakingInfo;

      mockGetDAOMembersStakingInfo.mockRejectedValue(new Error('Network error'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-dao-members-staking-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        includeOperatorManager: false,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toBe('Failed to get DAO members staking info on mainnet: Network error');
    });
  });

  describe('dao-candidate-activity-reward tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1]).toEqual({
        title: 'Get DAO candidate\'s activity reward',
        description: 'Get the activity reward for a specific DAO candidate. Set claim=true to also claim the reward.',
        inputSchema: expect.any(Object),
      });
    });

    it('should return success when no claimable reward', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;
      const mockGetNetworkAddresses = vi.mocked(await import('../../constants.js')).getNetworkAddresses;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(0),
      });
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('0 WTON');
      mockGetNetworkAddresses.mockReturnValue({
        TON_ADDRESS: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5' as any,
        WTON_ADDRESS: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2' as any,
        DEPOSIT_MANAGER: '0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e' as any,
        SEIG_MANAGER: '0x0b55a0f463b6defb81c6063973763951712d0e5f' as any,
        LAYER2_REGISTRY: '0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b' as any,
        SWAPPROXY: '0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d' as any,
        L1BRIDGE_REGISTRY: '0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4' as any,
        LAYER2_MANAGER: '0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D' as any,
        DAO_COMMITTEE: '0xDD9f0cCc044B0781289Ee318e5971b0139602C26' as any,
        AGENDA_MANAGER: '0xcD4421d082752f363E1687544a09d5112cD4f484' as any,
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: false,
      });

      // console.log('Result:', JSON.stringify(result, null, 2));

      expect(mockGetDAOMembersActivityReward).toHaveBeenCalledWith('mainnet', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.activityReward).toBe('0');
      expect(response.formattedReward).toBe('0 WTON');
    });

    it('should return error when getDAOMembersActivityReward fails', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: false,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(0),
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: false,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Failed to get activity reward data');
    });

    it('should return reward info when claim=false', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(1000000000000000000),
      });
      mockReadContract.mockResolvedValue('0x1234567890123456789012345678901234567890'); // manager
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('1.0 WTON');

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: false,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.activityReward).toBe('1000000000000000000');
      expect(response.formattedReward).toBe('1.0 WTON');
      expect(response.claimed).toBe(false);
      expect(response.claimAccount).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return wallet connection error when claim=true but wallet not connected', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;
      const mockCheckWalletConnection = vi.mocked(await import('../../utils/wallet.js')).checkWalletConnection;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(1000000000000000000),
      });
      mockReadContract.mockResolvedValue('0x1234567890123456789012345678901234567890'); // manager
      mockGetAccount.mockReturnValue({
        isConnected: false
      } as any);
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('1.0 WTON');
      mockCheckWalletConnection.mockResolvedValue({
        isConnected: false,
        content: [{ type: 'text', text: JSON.stringify({ status: 'continue', message: 'waiting for wallet connection' }) }]
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: true,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('continue');
      expect(response.message).toBe('waiting for wallet connection');
    });

    it('should claim activity reward successfully when wallet is connected', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;
      const mockCheckWalletConnection = vi.mocked(await import('../../utils/wallet.js')).checkWalletConnection;
      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(1000000000000000000),
      });
      mockReadContract.mockResolvedValue('0x1234567890123456789012345678901234567890'); // manager
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890'
      } as any);
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('1.0 WTON');
      mockCheckWalletConnection.mockResolvedValue(undefined); // 지갑이 연결되어 있으면 undefined 반환

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: true,
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.any(Object),
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: expect.any(Array),
          functionName: 'claimActivityReward',
          args: [],
          chain: expect.any(Object),
          account: expect.any(String),
        }
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.claimed).toBe(true);
      expect(response.transactionHash).toBe('0xtxhash');
      expect(response.activityReward).toBe('1000000000000000000');
      expect(response.formattedReward).toBe('1.0 WTON');
    });

    it('should handle writeContract error when claiming', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;
      const mockCheckWalletConnection = vi.mocked(await import('../../utils/wallet.js')).checkWalletConnection;
      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(1000000000000000000),
      });
      mockReadContract.mockResolvedValue('0x1234567890123456789012345678901234567890'); // manager
      mockWriteContract.mockRejectedValue(new Error('Transaction failed'));
      mockGetAccount.mockReturnValue({ isConnected: true } as any);
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('1.0 WTON');

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: true,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Transaction failed');
      expect(response.activityReward).toBe('1000000000000000000');
      expect(response.formattedReward).toBe('1.0 WTON');
    });

    it('should handle operatorManager without manager function', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(1000000000000000000),
      });
      mockReadContract.mockRejectedValue(new Error('execution reverted')); // manager function fails
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890'
      } as any);
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('1.0 WTON');

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        network: 'mainnet',
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        claim: true,
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        })
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.claimed).toBe(true);
    });

    it('should use default network when not provided', async () => {
      const mockGetDAOMembersActivityReward = vi.mocked(await import('../../utils/dao.js')).getDAOMembersActivityReward;
      const mockFormatTokenAmountWithUnitPrecise = vi.mocked(await import('../../utils/format.js')).formatTokenAmountWithUnitPrecise;

      mockGetDAOMembersActivityReward.mockResolvedValue({
        result: true,
        candidate: '0x1234567890123456789012345678901234567890',
        reward: BigInt(0),
      });
      mockFormatTokenAmountWithUnitPrecise.mockReturnValue('0 WTON');

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'dao-candidate-activity-reward'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      await toolFunction({
        candidateContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }).catch((error: any) => {
        console.log('Error caught:', error);
        throw error;
      });

      expect(mockGetDAOMembersActivityReward).toHaveBeenCalledWith('mainnet', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });
  });

  describe('get-challenge-member-info tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-challenge-member-info'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Get challenge member info');
    });

    it('should return error when challenge is not possible', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(2000000000000000000),
        currentStake: BigInt(1000000000000000000),
        canChallenge: false,
        challengeReason: 'Challenger stake (1000000000000000000) must be at least 2000000000000000000 TON',
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-challenge-member-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 0,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockGetChallengeInfo).toHaveBeenCalledWith(0, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Challenger stake (1000000000000000000) must be at least 2000000000000000000 TON');
      expect(response.memberIndex).toBe(0);
      expect(response.challengerCandidate).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should return success when challenge is possible', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-challenge-member-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 1,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.canChallenge).toBe(true);
      expect(response.memberIndex).toBe(1);
      expect(response.challengerCandidate).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      expect(response.requiredStake).toBe('1000000000000000000');
      expect(response.challengerStake).toBe('3000000000000000000');
    });

  });

  describe('execute-challenge-member tool', () => {
    it('should register the tool correctly', () => {
      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      expect(toolCall![1].title).toBe('Execute challenge member');
    });

    it('should return error when challenge is not possible', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(2000000000000000000),
        currentStake: BigInt(1000000000000000000),
        canChallenge: false,
        challengeReason: 'Challenger stake (1000000000000000000) must be at least 2000000000000000000 TON',
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 0,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Challenger stake (1000000000000000000) must be at least 2000000000000000000 TON');
      expect(response.memberIndex).toBe(0);
      expect(response.challengerCandidate).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should return error when wallet is not connected', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });
      mockGetAccount.mockReturnValue({
        isConnected: false,
      } as any);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 2,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('UNAUTHORIZED_OPERATOR');
      expect(response.message).toContain('Connected wallet is not the authorized operator for this challenger candidate.');
    });

    it('should return error when wallet is not the operator of challenger candidate', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1111111111111111111111111111111111111111',
      } as any);
      mockReadContract.mockResolvedValue('0x2222222222222222222222222222222222222222'); // Different operator

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 3,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockReadContract).toHaveBeenCalledWith(
        expect.any(Object),
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: expect.any(Array),
          functionName: 'operator',
          args: [],
          chainId: expect.any(Number),
        }
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('UNAUTHORIZED_OPERATOR');
      expect(response.message).toBe('Connected wallet is not the authorized operator for this challenger candidate.');
    });

    it('should execute challenge successfully when all conditions are met', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;
      const mockGetPublicClient = vi.mocked(await import('@wagmi/core')).getPublicClient;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1111111111111111111111111111111111111111',
      } as any);
      mockReadContract.mockResolvedValue('0x1111111111111111111111111111111111111111'); // Same as wallet address
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockGetPublicClient.mockReturnValue({
        waitForTransactionReceipt: vi.fn().mockResolvedValue({
          status: 'success',
        }),
      } as any);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 4,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.any(Object),
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: expect.any(Array),
          functionName: 'changeMember',
          args: [BigInt(4)],
          chainId: expect.any(Number),
        }
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.transactionHash).toBe('0xtxhash');
      expect(response.memberIndex).toBe(4);
      expect(response.challengerCandidate).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
      expect(response.message).toContain('Successfully challenged member at index 4');
    });

    it('should handle transaction failure', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;
      const mockGetPublicClient = vi.mocked(await import('@wagmi/core')).getPublicClient;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1111111111111111111111111111111111111111',
      } as any);
      mockReadContract.mockResolvedValue('0x1111111111111111111111111111111111111111');
      mockWriteContract.mockResolvedValue('0xtxhash' as any);
      mockGetPublicClient.mockReturnValue({
        waitForTransactionReceipt: vi.fn().mockResolvedValue({
          status: 'reverted',
        }),
      } as any);

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 5,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Transaction reverted or failed');
      expect(response.transactionHash).toBe('0xtxhash');
      expect(response.message).toContain('Transaction failed for challenge at index 5');
    });

    it('should handle writeContract error', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;
      const mockGetAccount = vi.mocked(await import('@wagmi/core')).getAccount;
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockWriteContract = vi.mocked(await import('@wagmi/core')).writeContract;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });
      mockGetAccount.mockReturnValue({
        isConnected: true,
        address: '0x1111111111111111111111111111111111111111',
      } as any);
      mockReadContract.mockResolvedValue('0x1111111111111111111111111111111111111111');
      mockWriteContract.mockRejectedValue(new Error('Transaction failed'));

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'execute-challenge-member'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 6,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'mainnet',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.error).toBe('Transaction failed');
      expect(response.message).toContain('Failed to execute challenge on mainnet: Transaction failed');
    });

    it('should use default values when optional parameters are not provided', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-challenge-member-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 7,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      });

      expect(mockGetChallengeInfo).toHaveBeenCalledWith(7, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'mainnet');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.network).toBe('mainnet');
    });

    it('should work with sepolia network', async () => {
      const mockGetChallengeInfo = vi.mocked(await import('../../utils/dao.js')).getChallengeInfo;

      mockGetChallengeInfo.mockResolvedValue({
        memberCandidate: '0x1234567890123456789012345678901234567890',
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        requiredStake: BigInt(1000000000000000000),
        currentStake: BigInt(3000000000000000000),
        canChallenge: true,
        challengeReason: undefined,
      });

      registerDAOTools(mockServer as any);

      const toolCall = mockServer.registerTool.mock.calls.find(
        (call: any) => call[0] === 'get-challenge-member-info'
      );
      expect(toolCall).toBeDefined();
      const toolFunction = toolCall![2];

      const result = await toolFunction({
        memberIndex: 8,
        challengerCandidate: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        network: 'sepolia',
      });

      expect(mockGetChallengeInfo).toHaveBeenCalledWith(8, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'sepolia');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.network).toBe('sepolia');
    });
  });
});