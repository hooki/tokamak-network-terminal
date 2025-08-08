import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readContract, readContracts, writeContract } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { getNetworkAddresses } from '../constants.js';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';
import { operatorManagerAbi } from '../abis/operatorManager.js';
import { daoCandidateAbi } from '../abis/daoCandidate.js';
import { createMCPResponse, createErrorResponse, createSuccessResponse } from '../utils/response.js';
import {
  getDAOMemberCandidateInfo,
  getDAOMemberOperatorManagerInfo,
  getDAOMemberCount,
  checkDAOMembership,
  getDAOMembersStakingInfo,
  getDAOMembersActivityReward,
} from '../utils/dao.js';
import { formatTokenAmountWithUnitPrecise } from '../utils/format.js';

export function registerDAOTools(server: McpServer) {
  // Get DAO member count
  server.registerTool(
    'get-dao-member-count',
    {
      title: 'Get DAO member count',
      description: 'Get the total number of DAO members on the specified network.',
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
        return createSuccessResponse(`DAO member count on ${network}: ${count}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse(`Failed to get DAO member count on ${network}: ${errorMessage}`);
      }
    }
  );

  // Get DAO member candidate info
  server.registerTool(
    'get-dao-member-candidate-info',
    {
      title: 'Get DAO member candidate information',
      description: 'Get detailed information about DAO member candidates including their contract addresses and staking details.',
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
        const memberInfo = members.map(member => ({
          candidate: member.candidate,
          candidateInfo: member.candidateInfo,
        }));

        return createSuccessResponse(`Found ${members.length} DAO members on ${network}. Member count: ${members.length}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse(`Failed to get DAO member candidate info on ${network}: ${errorMessage}`);
      }
    }
  );

  // Get DAO member operator manager info
  server.registerTool(
    'get-dao-member-operator-manager-info',
    {
      title: 'Get DAO member operator manager information',
      description: 'Get detailed information about DAO members including their operator manager and manager addresses.',
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
        const members = await getDAOMemberOperatorManagerInfo(network);
        const memberInfo = members.map(member => ({
          candidate: member.candidate,
          candidateInfo: member.candidateInfo,
          operatorManager: member.operatorManager,
          manager: member.manager,
        }));

        return createSuccessResponse(`Found ${members.length} DAO members with operator manager info on ${network}. Member count: ${members.length}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse(`Failed to get DAO member operator manager info on ${network}: ${errorMessage}`);
      }
    }
  );

  // Check DAO membership
  server.registerTool(
    'check-dao-membership',
    {
      title: 'Check DAO membership',
      description: 'Check if a specific address is a DAO member (either as candidate or manager).',
      inputSchema: {
        address: z
          .string()
          .describe('The address to check for DAO membership'),
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

        return createSuccessResponse(`Address ${address} ${status} on ${network}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse(`Failed to check DAO membership for ${address} on ${network}: ${errorMessage}`);
      }
    }
  );

  // Get DAO members staking info
  server.registerTool(
    'get-dao-members-staking-info',
    {
      title: 'Get DAO members staking information',
      description: 'Get detailed staking information for all DAO members including total staked, memo, and claimable rewards.',
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
        const stakingInfo = await getDAOMembersStakingInfo(network, includeOperatorManager);
        const memberInfo = stakingInfo.map(member => ({
          candidate: member.candidate,
          memo: member.memo,
          totalStaked: member.totalStaked?.toString(),
          lastCommitBlock: member.lastCommitBlock?.toString(),
          lastUpdateSeigniorageTime: member.lastUpdateSeigniorageTime?.toString(),
          claimableActivityReward: member.claimableActivityReward?.toString(),
          operatorManager: member.operatorManager,
          manager: member.manager,
        }));

        return createSuccessResponse(`Found ${stakingInfo.length} DAO members with staking info on ${network}. Member count: ${stakingInfo.length}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse(`Failed to get DAO members staking info on ${network}: ${errorMessage}`);
      }
    }
  );

  // Get DAO candidate activity reward
  server.registerTool(
    'dao-candidate-activity-reward',
    {
      title: 'Get DAO candidate\'s activity reward',
      description: 'Get the activity reward for a specific DAO candidate. Set claim=true to also claim the reward.',
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
      console.log('Function called with:', { network, candidateContract, claim });
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        console.log('Calling getDAOMembersActivityReward...');
        const {result, candidate, reward} = await getDAOMembersActivityReward(network, candidateContract);
        console.log('getDAOMembersActivityReward result:', { result, candidate, reward });

        if (!result) {
          console.log('Returning error response...');
          return createErrorResponse({
            status: 'error',
            network: network,
            candidateContract: candidateContract,
            error: 'Failed to get activity reward data',
            message: `Failed to get DAO candidate's activity reward on ${network}`
          });
        }

        if (reward === BigInt(0)) {
          console.log('Returning success response for zero reward...');
          console.log('About to call createSuccessResponse with:', {
            status: 'success',
            network: network,
            candidateContract: candidateContract,
            candidate: candidate,
            activityReward: '0',
            formattedReward: '0 WTON',
            message: `No claimable activity reward for ${candidateContract}. Nothing to claim.`
          });
          const response = createSuccessResponse({
            status: 'success',
            network: network,
            candidateContract: candidateContract,
            candidate: candidate,
            activityReward: '0',
            formattedReward: '0 WTON',
            message: `No claimable activity reward for ${candidateContract}. Nothing to claim.`
          });
          console.log('Response:', response);
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
        } catch (error) {
          // operatorManager 에 manager함수가 없는 경우. 그냥 candidate 주소를 사용한다.
          claimer = candidate;
        }

        // If claim is requested, check wallet connection and claim
        if (claim) {
          const { getAccount } = await import('@wagmi/core');
          const connectedAccount = getAccount(wagmiConfig);

          if (!connectedAccount?.isConnected) {
            return createErrorResponse({
              status: 'error',
              network: network,
              candidateContract: candidateContract,
              claimAccount: claimer,
              activityReward: reward.toString(),
              formattedReward: formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8),
              error: 'Wallet connection required',
              message: `🔗 **Wallet Connection Required**\n\nTo claim this reward, you need to connect your wallet first.\n\n**Next Steps:**\n1. Call the \`connect-wallet\` tool to generate a QR code\n2. Scan the QR code with your MetaMask mobile app\n3. Once connected, call this tool again with claim=true\n\n**Current Reward Details:**\n- Network: ${network}\n- Candidate Contract: ${candidateContract}\n- Claim Account: ${claimer}\n- Activity Reward: ${formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8)}`
            });
          }

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
              formattedReward: formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8),
              transactionHash: tx,
              claimed: true,
              message: `Activity reward has been claimed successfully. Transaction hash: ${tx}`
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return createErrorResponse({
              status: 'error',
              network: network,
              candidateContract: candidateContract,
              claimAccount: claimer,
              activityReward: reward.toString(),
              formattedReward: formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8),
              error: errorMessage,
              message: `Failed to claim activity reward on ${network}: ${errorMessage}`
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
          formattedReward: formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8),
          claimed: false,
          message: `DAO candidate's activity reward on ${network}: ${formatTokenAmountWithUnitPrecise(reward, "WTON", 18, 8)}`
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return createErrorResponse({
          status: 'error',
          network: network,
          candidateContract: candidateContract,
          error: errorMessage,
          message: `Failed to get DAO candidate's activity reward on ${network}: ${errorMessage}`
        });
      }
    }
  );


}
