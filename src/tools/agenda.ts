import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readContracts } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { z } from 'zod';
import { getNetworkAddresses } from '../constants.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import { createMCPResponse, createErrorResponse, createSuccessResponse, createResponse } from '../utils/response.js';
import { formatTimestamp } from '../utils/time.js';
import { getAgendaResultText, getAgendaStatusText, getAgendaStatusTextV1, createAgendaMessage } from '../utils/agenda.js';
import { wagmiConfig } from '../utils/wagmi-config.js';
import { daoAgendaManagerAbi } from '../abis/daoAgendaManager.js';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';

export function registerAgendaTools(server: McpServer) {
  server.registerTool(
    'get-agenda',
    {
      title: 'Get agenda details',
      description: new DescriptionBuilder(
        'Get detailed information about a specific agenda. This includes agenda status, voting period, and other relevant details.'
      )
        .toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        agendaId: z
          .string()
          .describe('The agenda ID to get details for'),
      },
    },
    async ({ agendaId, network = 'mainnet' }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      if (!agendaId) {
        return createErrorResponse('Agenda ID is required');
      }

      try {
        // Read agenda details and committee version from contract
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: daoAgendaManagerAbi,
              functionName: 'agendas',
              args: [BigInt(agendaId)],
              chainId,
            },
            {
              address: networkAddresses.DAO_COMMITTEE,
              abi: daoCommitteeAbi,
              functionName: 'version',
              args: [],
              chainId,
            },
          ],
        });

        // Check if agenda call failed
        if (results[0].error) {
          return createErrorResponse(`Failed to read agenda ${agendaId} on ${network}: ${results[0].error.message}`);
        }

        const agendaData = results[0].result as any;
        if (!agendaData) {
          return createErrorResponse(`Agenda ${agendaId} not found on ${network}`);
        }

        // Extract agenda data
        const {
          createdTimestamp,
          noticeEndTimestamp,
          votingPeriodInSeconds,
          votingStartedTimestamp,
          votingEndTimestamp,
          executableLimitTimestamp,
          executedTimestamp,
          countingYes,
          countingNo,
          countingAbstain,
          status,
          result,
          voters,
          executed,
        } = agendaData;

        // Check committee version
        if (results[1].error) {
          // Version 1: Use basic agenda data
          let statusText = 'Unknown';
          statusText = getAgendaStatusTextV1(status);
          const message = createAgendaMessage(agendaId, network, agendaData, statusText, undefined, 'Version 1');
          return createSuccessResponse(message);
        }

        // Version 2: Get additional status info
        const committeeVersion = results[1].result as unknown as string;

        if (committeeVersion === '2.0.0') {
          try {
            const result2 = await readContracts(wagmiConfig, {
              contracts: [
                {
                  address: networkAddresses.DAO_COMMITTEE,
                  abi: daoCommitteeAbi,
                  functionName: 'currentAgendaStatus',
                  args: [BigInt(agendaId)],
                  chainId,
                },
              ],
            });

            if (result2[0].error) {
              return createErrorResponse(`Failed to read current agenda status on ${network}: ${result2[0].error.message}`);
            }

            const statusData = result2[0].result as any;
            // statusData is an array [agendaResult, agendaStatus]
            const agendaResult = statusData?.[0] !== undefined ? Number(statusData[0]) : 0;
            const agendaStatus = statusData?.[1] !== undefined ? Number(statusData[1]) : 0;

            const agendaResultText = getAgendaResultText(agendaResult);
            const agendaStatusText = getAgendaStatusText(agendaStatus);

            const message = createAgendaMessage(agendaId, network, agendaData, agendaStatusText, agendaResultText, `Committee v${committeeVersion}`);

            return createSuccessResponse(message);
          } catch (error) {
            return createErrorResponse(`Failed to get agenda status for version ${committeeVersion}: ${error}`);
          }
        } else {
            return createErrorResponse(`Unsupported committee version: ${committeeVersion}`);
        }

      } catch (error) {
        return createErrorResponse(`Failed to get agenda ${agendaId} on ${network}: ${error}`);
      }
    }
  );
}