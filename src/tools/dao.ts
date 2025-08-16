import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getAccount,
  getPublicClient,
  readContract,
  writeContract,
} from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { z } from 'zod';
import { daoCandidateAbi } from '../abis/daoCandidate.js';
import { operatorManagerAbi } from '../abis/operatorManager.js';
import { getNetworkAddresses } from '../constants.js';
import {
  checkDAOMembership,
  getChallengeInfo,
  getDAOMemberCandidateInfo,
  getDAOMemberCount,
  getDAOMemberOperatorManagerInfo,
  getDAOMembersActivityReward,
  getDAOMembersStakingInfo,
} from '../utils/dao.js';
import { formatTokenAmountWithUnitPrecise } from '../utils/format.js';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/response.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { checkWalletConnection } from '../utils/wallet.js';

export function registerDAOTools(server: McpServer) {
  // Get DAO member count
  server.registerTool(
    'get-dao-member-count',
    {
      title: 'Get DAO member count',
      description:
        'Get the total number of DAO members on the specified network.',
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ network = 'mainnet' }) => {
      try {
        const count = await getDAOMemberCount(network);
        return createSuccessResponse(
          `DAO member count on ${network}: ${count}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse(
          `Failed to get DAO member count on ${network}: ${errorMessage}`
        );
      }
    }
  );

  // Get DAO member candidate info
  server.registerTool(
    'get-dao-member-candidate-info',
    {
      title: 'Get DAO member candidate information',
      description:
        'Get detailed information about DAO member candidates including their contract addresses and staking details.',
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ network = 'mainnet' }) => {
      try {
        const members = await getDAOMemberCandidateInfo(network);

        const memberInfo = members.map((member) => ({
          candidate: member.candidate,
          candidateInfo: member.candidateInfo
            ? {
                candidateContract: member.candidateInfo.candidateContract,
                indexMembers: member.candidateInfo.indexMembers.toString(),
                memberJoinedTime:
                  member.candidateInfo.memberJoinedTime.toString(),
                rewardPeriod: member.candidateInfo.rewardPeriod.toString(),
                claimedTimestamp:
                  member.candidateInfo.claimedTimestamp.toString(),
              }
            : null,
        }));

        return createSuccessResponse({
          status: 'success',
          network: network,
          memberCount: members.length,
          members: memberInfo,
          message: `Found ${members.length} DAO members on ${network}. Member count: ${members.length}`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse(
          `Failed to get DAO member candidate info on ${network}: ${errorMessage}`
        );
      }
    }
  );

  // Get DAO member operator manager info
  server.registerTool(
    'get-dao-member-operator-manager-info',
    {
      title: 'Get DAO member operator manager information',
      description:
        'Get detailed information about DAO members including their operator manager and manager addresses.',
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ network }) => {
      try {
        const members = await getDAOMemberOperatorManagerInfo(network);
        const memberInfo = members.map((member) => ({
          candidate: member.candidate,
          candidateInfo: member.candidateInfo
            ? {
                candidateContract: member.candidateInfo.candidateContract,
                indexMembers: member.candidateInfo.indexMembers.toString(),
                memberJoinedTime:
                  member.candidateInfo.memberJoinedTime.toString(),
                rewardPeriod: member.candidateInfo.rewardPeriod.toString(),
                claimedTimestamp:
                  member.candidateInfo.claimedTimestamp.toString(),
              }
            : null,
          operatorManager: member.operatorManager,
          manager: member.manager,
        }));

        return createSuccessResponse({
          status: 'success',
          network: network,
          memberCount: members.length,
          members: memberInfo,
          message: `Found ${members.length} DAO members with operator manager info on ${network}. Member count: ${members.length}`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse(
          `Failed to get DAO member operator manager info on ${network}: ${errorMessage}`
        );
      }
    }
  );

  // Check DAO membership
  server.registerTool(
    'check-dao-membership',
    {
      title: 'Check DAO membership',
      description:
        'Check if a specific address is a DAO member (either as candidate or manager).',
      inputSchema: {
        address: z.string().describe('The address to check for DAO membership'),
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ address, network = 'mainnet' }) => {
      try {
        const isMember = await checkDAOMembership(address, network);
        const status = isMember ? 'is a DAO member' : 'is not a DAO member';

        return createSuccessResponse(
          `Address ${address} ${status} on ${network}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse(
          `Failed to check DAO membership for ${address} on ${network}: ${errorMessage}`
        );
      }
    }
  );

  // Get DAO members staking info
  server.registerTool(
    'get-dao-members-staking-info',
    {
      title: 'Get DAO members staking information',
      description:
        'Get detailed staking information for all DAO members including total staked, memo, and claimable rewards.',
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        includeOperatorManager: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to include operator manager information'),
      },
    },
    async ({ network = 'mainnet', includeOperatorManager = false }) => {
      try {
        const stakingInfo = await getDAOMembersStakingInfo(
          network,
          includeOperatorManager
        );

        const memberInfo = stakingInfo.map((member) => ({
          candidate: member.candidate,
          memo: member.memo,
          totalStaked: member.totalStaked?.toString(),
          lastCommitBlock: member.lastCommitBlock?.toString(),
          lastUpdateSeigniorageTime:
            member.lastUpdateSeigniorageTime?.toString(),
          claimableActivityReward: member.claimableActivityReward?.toString(),
          operatorManager: member.operatorManager,
          manager: member.manager,
        }));

        return createSuccessResponse({
          status: 'success',
          network: network,
          memberCount: memberInfo.length,
          members: memberInfo,
          message: `Found ${memberInfo.length} DAO members with staking info on ${network}. Member count: ${memberInfo.length}`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse(
          `Failed to get DAO members staking info on ${network}: ${errorMessage}`
        );
      }
    }
  );

  // Get DAO candidate activity reward
  server.registerTool(
    'dao-candidate-activity-reward',
    {
      title: "Get DAO candidate's activity reward",
      description:
        'Get the activity reward for a specific DAO candidate. Set claim=true to also claim the reward.',
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        candidateContract: z
          .string()
          .describe('The candidate contract address to get activity reward'),
        claim: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to claim the reward (requires wallet connection)'),
      },
    },
    async ({ network = 'mainnet', candidateContract, claim = false }) => {
      // console.log('Function called with:', { network, candidateContract, claim });
      const _networkAddresses = getNetworkAddresses(network);
      const _chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        // console.log('Calling getDAOMembersActivityReward...');
        const { result, candidate, reward } = await getDAOMembersActivityReward(
          network,
          candidateContract
        );
        // console.log('getDAOMembersActivityReward result:', { result, candidate, reward });

        if (!result) {
          // console.log('Returning error response...');
          return createErrorResponse({
            status: 'error',
            network: network,
            candidateContract: candidateContract,
            error: 'Failed to get activity reward data',
            message: `Failed to get DAO candidate's activity reward on ${network}`,
          });
        }

        if (reward === BigInt(0)) {
          // console.log('Returning success response for zero reward...');
          // console.log('About to call createSuccessResponse with:', {
          //   status: 'success',
          //   network: network,
          //   candidateContract: candidateContract,
          //   candidate: candidate,
          //   activityReward: '0',
          //   formattedReward: '0 WTON',
          //   message: `No claimable activity reward for ${candidateContract}. Nothing to claim.`
          // });
          const response = createSuccessResponse({
            status: 'success',
            network: network,
            candidateContract: candidateContract,
            candidate: candidate,
            activityReward: '0',
            formattedReward: '0 WTON',
            message: `No claimable activity reward for ${candidateContract}. Nothing to claim.`,
          });
          // console.log('Response:', response);
          return response;
        }

        // 실제 청구를 위해 지갑연결을 해야 하는 주소는 candidate 일수도 있고,
        // candidate가 operatorManager일 경우는 operatorManager.manager 주소를 사용해야 한다. 그래서 연결해야 하는 지갑 주소를 찾아보자.
        let claimer = candidate;
        try {
          const manager = await readContract(wagmiConfig, {
            address: candidate as `0x${string}`,
            abi: operatorManagerAbi,
            functionName: 'manager',
            args: [],
            chainId: network === 'sepolia' ? sepolia.id : mainnet.id,
          });
          claimer = manager as `0x${string}`;
        } catch (_error) {
          // operatorManager 에 manager함수가 없는 경우. 그냥 candidate 주소를 사용한다.
          claimer = candidate;
        }

        // If claim is requested, check wallet connection and claim
        if (claim) {
          const callbackCommand = `dao-candidate-activity-reward ${candidateContract} --claim true --network ${network}`;
          const walletCheck = await checkWalletConnection(
            undefined,
            callbackCommand
          );
          if (walletCheck && !walletCheck.isConnected) {
            return walletCheck;
          }

          const { getAccount } = await import('@wagmi/core');
          const connectedAccount = getAccount(wagmiConfig);

          try {
            const tx = await writeContract(wagmiConfig, {
              address: candidateContract as `0x${string}`,
              abi: daoCandidateAbi,
              functionName: 'claimActivityReward',
              args: [],
              chain: network === 'sepolia' ? sepolia : mainnet,
              account: connectedAccount.address,
            });

            return createSuccessResponse({
              status: 'success',
              network: network,
              candidateContract: candidateContract,
              claimAccount: claimer,
              activityReward: reward.toString(),
              formattedReward: formatTokenAmountWithUnitPrecise(
                reward,
                'WTON',
                18,
                8
              ),
              transactionHash: tx,
              claimed: true,
              message: `Activity reward has been claimed successfully. Transaction hash: ${tx}`,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return createErrorResponse({
              status: 'error',
              network: network,
              candidateContract: candidateContract,
              claimAccount: claimer,
              activityReward: reward.toString(),
              formattedReward: formatTokenAmountWithUnitPrecise(
                reward,
                'WTON',
                18,
                8
              ),
              error: errorMessage,
              message: `Failed to claim activity reward on ${network}: ${errorMessage}`,
            });
          }
        }

        // Return reward info without claiming
        return createSuccessResponse({
          status: 'success',
          network: network,
          candidateContract: candidateContract,
          candidate: candidate,
          claimAccount: claimer,
          activityReward: reward.toString(),
          formattedReward: formatTokenAmountWithUnitPrecise(
            reward,
            'WTON',
            18,
            8
          ),
          claimed: false,
          message: `DAO candidate's activity reward on ${network}: ${formatTokenAmountWithUnitPrecise(reward, 'WTON', 18, 8)}`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse({
          status: 'error',
          network: network,
          candidateContract: candidateContract,
          error: errorMessage,
          message: `Failed to get DAO candidate's activity reward on ${network}: ${errorMessage}`,
        });
      }
    }
  );

  // Get challenge member info
  server.registerTool(
    'get-challenge-member-info',
    {
      title: 'Get challenge member info',
      description:
        'Get information about challenging a DAO committee member, including stake requirements and eligibility.',
      inputSchema: {
        memberIndex: z
          .number()
          .describe('The index of the current DAO member slot to challenge'),
        challengerCandidate: z
          .string()
          .describe('The address of the challenger candidate contract'),
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ memberIndex, challengerCandidate, network = 'mainnet' }) => {
      try {
        // 챌린지 정보를 조회하여 가능 여부 확인
        const challengeInfo = await getChallengeInfo(
          memberIndex,
          challengerCandidate,
          network
        );

        if (!challengeInfo.canChallenge) {
          return createErrorResponse({
            status: 'error',
            network: network,
            memberIndex: memberIndex,
            memberCandidate: challengeInfo.memberCandidate,
            challengerCandidate: challengerCandidate,
            requiredStake: challengeInfo.requiredStake.toString(),
            challengerStake: challengeInfo.currentStake.toString(),
            error: challengeInfo.challengeReason,
            message: `Cannot challenge member: ${challengeInfo.challengeReason}`,
          });
        }

        return createSuccessResponse({
          status: 'success',
          network: network,
          memberIndex: memberIndex,
          memberCandidate: challengeInfo.memberCandidate,
          challengerCandidate: challengerCandidate,
          requiredStake: challengeInfo.requiredStake.toString(),
          challengerStake: challengeInfo.currentStake.toString(),
          canChallenge: true,
          message: `Challenge is possible. Challenger stake (${challengeInfo.currentStake}) is greater than member stake (${challengeInfo.requiredStake})`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse({
          status: 'error',
          network: network,
          memberIndex: memberIndex,
          challengerCandidate: challengerCandidate,
          error: errorMessage,
          message: `Failed to get challenge info on ${network}: ${errorMessage}`,
        });
      }
    }
  );

  // Execute challenge member
  server.registerTool(
    'execute-challenge-member',
    {
      title: 'Execute challenge member',
      description:
        'Execute a challenge against a DAO committee member. Requires wallet connection and proper authorization.',
      inputSchema: {
        memberIndex: z
          .number()
          .describe('The index of the current DAO member slot to challenge'),
        challengerCandidate: z
          .string()
          .describe('The address of the challenger candidate contract'),
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ memberIndex, challengerCandidate, network = 'mainnet' }) => {
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;
      try {
        // 지갑 연결 확인
        const callbackCommand = `execute-challenge-member ${memberIndex} ${challengerCandidate} --network ${network}`;
        const walletCheck = await checkWalletConnection(
          undefined,
          callbackCommand
        );
        if (walletCheck && !walletCheck.isConnected) {
          return walletCheck;
        }

        const account = getAccount(wagmiConfig);

        // 먼저 챌린지 정보를 조회하여 가능 여부 확인
        const challengeInfo = await getChallengeInfo(
          memberIndex,
          challengerCandidate,
          network
        );

        if (!challengeInfo.canChallenge) {
          return createErrorResponse({
            status: 'error',
            network: network,
            memberIndex: memberIndex,
            memberCandidate: challengeInfo.memberCandidate,
            challengerCandidate: challengerCandidate,
            requiredStake: challengeInfo.requiredStake.toString(),
            challengerStake: challengeInfo.currentStake.toString(),
            error: challengeInfo.challengeReason,
            message: `Cannot challenge member: ${challengeInfo.challengeReason}`,
          });
        }
        let operator = null;
        try {
          const operatorAddress = await readContract(wagmiConfig, {
            address: challengerCandidate as `0x${string}`,
            abi: daoCandidateAbi,
            functionName: 'operator',
            args: [],
            chainId,
          });
          operator = operatorAddress as `0x${string}`;

          try {
            const manager = await readContract(wagmiConfig, {
              address: operatorAddress as `0x${string}`,
              abi: operatorManagerAbi,
              functionName: 'manager',
              args: [],
              chainId,
            });
            operator = manager as `0x${string}`;
          } catch (_error) {
            operator = operatorAddress;
          }
        } catch (_error) {
          operator = null;
        }

        if (String(operator).toLowerCase() !== account.address?.toLowerCase()) {
          return createErrorResponse({
            status: 'error',
            network: network,
            memberIndex: memberIndex,
            challengerCandidate: challengerCandidate,
            error: 'UNAUTHORIZED_OPERATOR',
            message:
              'Connected wallet is not the authorized operator for this challenger candidate.',
          });
        }

        // changeMember 함수 호출 (멤버 인덱스 사용)
        const tx = await writeContract(wagmiConfig, {
          address: challengerCandidate as `0x${string}`,
          abi: daoCandidateAbi,
          functionName: 'changeMember',
          args: [BigInt(memberIndex)],
          chainId,
        });

        // 트랜잭션 영수증을 기다려서 성공 여부 확인
        const publicClient = getPublicClient(wagmiConfig, { chainId });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
        });

        if (receipt.status === 'success') {
          return createSuccessResponse({
            status: 'success',
            network: network,
            memberIndex: memberIndex,
            memberCandidate: challengeInfo.memberCandidate,
            challengerCandidate: challengerCandidate,
            transactionHash: tx,
            message: `Successfully challenged member at index ${memberIndex} (${challengeInfo.memberCandidate}) with ${challengerCandidate} on ${network}. Transaction: ${tx}`,
          });
        } else {
          return createErrorResponse({
            status: 'error',
            network: network,
            memberIndex: memberIndex,
            challengerCandidate: challengerCandidate,
            transactionHash: tx,
            error: 'Transaction reverted or failed',
            message: `Transaction failed for challenge at index ${memberIndex} on ${network}. Transaction: ${tx}`,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return createErrorResponse({
          status: 'error',
          network: network,
          memberIndex: memberIndex,
          challengerCandidate: challengerCandidate,
          error: errorMessage,
          message: `Failed to execute challenge on ${network}: ${errorMessage}`,
        });
      }
    }
  );
}
