import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createMCPResponse, createErrorResponse, createSuccessResponse } from '../utils/response.js';
import {
  getDAOMemberCandidateInfo,
  getDAOMemberOperatorManagerInfo,
  getDAOMemberCount,
  checkDAOMembership,
  getDAOMembersStakingInfo,
} from '../utils/dao.js';

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
}