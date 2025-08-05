import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readContract, readContracts, getPublicClient } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import {
  checkDAOMembership,
  getDAOMemberCandidateInfo,
  getDAOMemberOperatorManagerInfo,
  getDAOMemberCount,
  getDAOMembersStakingInfo,
  type CandidateInfo,
  type DAOMemberCandidateInfo,
  type DAOMembersStakingInfo,
} from '../dao.js';


// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  readContracts: vi.fn(),
  getPublicClient: vi.fn(),
  createStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
  createConfig: vi.fn(() => ({})),
  http: vi.fn(() => ({})),
}));


// Mock constants
vi.mock('../../constants.js', () => ({
  getNetworkAddresses: vi.fn((network: string) => ({
    DAO_COMMITTEE: network === 'mainnet'
      ? '0x1234567890123456789012345678901234567890'
      : '0x0987654321098765432109876543210987654321',
    LAYER2_MANAGER: '0x2345678901234567890123456789012345678901',
    SEIG_MANAGER: '0x3456789012345678901234567890123456789012',
  })),
}));

// Mock ABIs
vi.mock('../../abis/daoCommittee.js', () => ({
  daoCommitteeAbi: [
    {
      type: 'function',
      name: 'maxMember',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'members',
      inputs: [{ type: 'uint256' }],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'candidateInfos',
      inputs: [{ type: 'address' }],
      outputs: [
        { type: 'address', name: 'candidateContract' },
        { type: 'uint256', name: 'indexMembers' },
        { type: 'uint128', name: 'memberJoinedTime' },
        { type: 'uint128', name: 'rewardPeriod' },
        { type: 'uint128', name: 'claimedTimestamp' },
      ],
      stateMutability: 'view',
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

describe('DAO Utils', () => {
  const mockCandidateInfo: CandidateInfo = {
    candidateContract: '0x4567890123456789012345678901234567890123',
    indexMembers: 1n,
    memberJoinedTime: 1640995200n,
    rewardPeriod: 86400n,
    claimedTimestamp: 1640995200n,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkDAOMembership', () => {
    it('should return true when address is a DAO member (candidate)', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]) // operatorManager
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]); // manager

      const result = await checkDAOMembership('0x1234567890123456789012345678901234567890', 'mainnet');
      expect(result).toBe(true);
    });

    it('should return true when address is a DAO member (manager)', async () => {
      // Mock the internal function calls
      vi.mocked(readContract).mockResolvedValueOnce(1n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x0987654321098765432109876543210987654321', error: null },
        ]) // operatorManager
        .mockResolvedValueOnce([
          { result: '0x0987654321098765432109876543210987654321', error: null },
        ]); // manager

      const result = await checkDAOMembership('0x0987654321098765432109876543210987654321', 'mainnet');
      expect(result).toBe(true);
    });

    it('should return false when address is not a DAO member', async () => {
      // Mock the internal function calls
      vi.mocked(readContract).mockResolvedValueOnce(1n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]) // operatorManager
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]); // manager

      const result = await checkDAOMembership('0x9999999999999999999999999999999999999999', 'mainnet');
      expect(result).toBe(false);
    });

    it('should handle case-insensitive address comparison', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(2n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: null, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: null, error: { message: 'execution reverted' } },
        ]); // manager

      const result = await checkDAOMembership('0x1234567890123456789012345678901234567890', 'mainnet');
      expect(result).toBe(true);
    });
  });

  describe('getDAOMemberCandidateInfo', () => {
    it('should return DAO member candidate information', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(2n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]) // members
        .mockResolvedValueOnce([
          {
            result: [
              '0x1234567890123456789012345678901234567890', // candidateContract
              0n, // indexMembers
              1234567890n, // memberJoinedTime
              86400n, // rewardPeriod
              0n, // claimedTimestamp
            ],
            error: null
          },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: null, error: { message: 'execution reverted' } },
        ]); // manager

      const result = await getDAOMemberCandidateInfo('mainnet');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        candidate: '0x1234567890123456789012345678901234567890',
        candidateInfo: [
          '0x1234567890123456789012345678901234567890',
          0n,
          1234567890n,
          86400n,
          0n,
        ],
      });
    });

    it('should handle candidate info for DAO members', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(2n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1234567890123456789012345678901234567890', error: null },
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]); // candidateInfos

      const result = await getDAOMemberCandidateInfo('mainnet');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        candidate: '0x1234567890123456789012345678901234567890',
        candidateInfo: mockCandidateInfo,
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(readContract).mockRejectedValueOnce(new Error('Contract error'));

      const result = await getDAOMemberCandidateInfo('mainnet');
      expect(result).toEqual([]);
    });
  });

  describe('getDAOMemberCount', () => {
    it('should return the correct member count', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(5n);

      const result = await getDAOMemberCount('mainnet');
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      vi.mocked(readContract).mockRejectedValueOnce(new Error('Contract error'));

      const result = await getDAOMemberCount('mainnet');
      expect(result).toBe(0);
    });

    it('should work with different networks', async () => {
      vi.mocked(readContract).mockResolvedValueOnce(3n);

      const result = await getDAOMemberCount('sepolia');
      expect(result).toBe(3);
    });
  });

  describe('getDAOMemberOperatorManagerInfo', () => {
    it('should return members with operator manager info', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x5555555555555555555555555555555555555555', error: null },
        ]) // operatorManager
        .mockResolvedValueOnce([
          { result: '0x6666666666666666666666666666666666666666', error: null },
        ]); // manager

      const result = await getDAOMemberOperatorManagerInfo('mainnet');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        candidate: '0x1111111111111111111111111111111111111111',
        candidateInfo: mockCandidateInfo,
        operatorManager: '0x5555555555555555555555555555555555555555',
        manager: '0x6666666666666666666666666666666666666666',
      });
    });

    it('should handle null operator manager', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x0000000000000000000000000000000000000000', error: null },
        ]); // operatorManager (null)

      const result = await getDAOMemberOperatorManagerInfo('mainnet');

      expect(result).toHaveLength(1);
      expect(result[0].operatorManager).toBeNull();
      expect(result[0].manager).toBeNull();
    });
  });

  describe('getDAOMembersStakingInfo', () => {
    const mockMembers: DAOMemberCandidateInfo[] = [
      {
        candidate: '0x1111111111111111111111111111111111111111',
        candidateInfo: mockCandidateInfo,
      },
    ];

    it('should return staking info without operator manager', async () => {
      // Mock the internal function calls directly
      vi.mocked(readContract).mockResolvedValueOnce(1n); // maxMember
      vi.mocked(readContracts)
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: 'Test memo', error: null },
          { result: 1000n, error: null },
          { result: 100n, error: null },
          { result: 12345n, error: null },
        ]); // staking info

      vi.mocked(getPublicClient).mockReturnValue({
        getBlock: vi.fn().mockResolvedValue({
          timestamp: 1640995200,
        }),
      } as any);

      const result = await getDAOMembersStakingInfo('mainnet', false);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        candidate: '0x1111111111111111111111111111111111111111',
        candidateInfo: mockCandidateInfo,
        memo: 'Test memo',
        totalStaked: 1000n,
        lastCommitBlock: 12345n,
        lastUpdateSeigniorageTime: 1640995200n,
        claimableActivityReward: 100n,
      });
    });

    it('should return staking info with operator manager', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockGetPublicClient = vi.mocked(await import('@wagmi/core')).getPublicClient;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: '0x2222222222222222222222222222222222222222', error: null },
        ]) // operatorManager
        .mockResolvedValueOnce([
          { result: '0x3333333333333333333333333333333333333333', error: null },
        ]) // manager
        .mockResolvedValueOnce([
          { result: 'Test memo', error: null },
          { result: 1000n, error: null },
          { result: 100n, error: null },
          { result: 12345n, error: null },
        ]); // staking info

      mockGetPublicClient.mockReturnValue({
        getBlock: vi.fn().mockResolvedValue({
          timestamp: 1640995200,
        }),
      } as any);

      const result = await getDAOMembersStakingInfo('mainnet', true);

      expect(result).toHaveLength(1);
      expect(result[0].candidate).toBe('0x1111111111111111111111111111111111111111');
    });

    it('should handle errors in staking info retrieval', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { error: new Error('Contract error') },
          { error: new Error('Contract error') },
          { error: new Error('Contract error') },
          { error: new Error('Contract error') },
        ]); // staking info

      const result = await getDAOMembersStakingInfo('mainnet', false);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        candidate: '0x1111111111111111111111111111111111111111',
        candidateInfo: mockCandidateInfo,
        memo: '',
        totalStaked: 0n,
        lastCommitBlock: 0n,
        lastUpdateSeigniorageTime: 0n,
        claimableActivityReward: 0n,
      });
    });

    it('should handle block timestamp retrieval error', async () => {
      const mockReadContract = vi.mocked(await import('@wagmi/core')).readContract;
      const mockReadContracts = vi.mocked(await import('@wagmi/core')).readContracts;
      const mockGetPublicClient = vi.mocked(await import('@wagmi/core')).getPublicClient;

      mockReadContract.mockResolvedValueOnce(1n); // maxMember
      mockReadContracts
        .mockResolvedValueOnce([
          { result: '0x1111111111111111111111111111111111111111', error: null },
        ]) // members
        .mockResolvedValueOnce([
          { result: mockCandidateInfo, error: null },
        ]) // candidateInfos
        .mockResolvedValueOnce([
          { result: 'Test memo', error: null },
          { result: 1000n, error: null },
          { result: 100n, error: null },
          { result: 12345n, error: null },
        ]); // staking info

      mockGetPublicClient.mockReturnValue({
        getBlock: vi.fn().mockRejectedValue(new Error('Block error')),
      } as any);

      const result = await getDAOMembersStakingInfo('mainnet', false);

      expect(result).toHaveLength(1);
      expect(result[0].lastUpdateSeigniorageTime).toBe(0n);
    });
  });
});