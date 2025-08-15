import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readContracts } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';
import { encodeAbiParameters, encodeFunctionData } from 'viem';
import { z } from 'zod';
import { agendaManagerAbi } from '../abis/agendaManager.js';
import { daoAgendaManagerAbi } from '../abis/daoAgendaManager.js';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';
import { tonAbi } from '../abis/ton.js';
import { getNetworkAddresses, MAX_AGENDAS_PER_REQUEST } from '../constants.js';
import {
  createAgendaMessage,
  getAgendaResultText,
  getAgendaStatusText,
  getAgendaStatusTextV1,
} from '../utils/agenda.js';
import { DescriptionBuilder } from '../utils/descriptionBuilder.js';
import {
  createErrorResponse,
  createMCPResponse,
  createResponse,
  createSuccessResponse,
} from '../utils/response.js';
import { formatTimestamp } from '../utils/time.js';
import { wagmiConfig } from '../utils/wagmi-config.js';

export function registerAgendaTools(server: McpServer) {
  server.registerTool(
    'get-agenda',
    {
      title: 'Get agenda details',
      description: new DescriptionBuilder(
        'Get detailed information about a specific agenda. This includes agenda status, voting period, and other relevant details.'
      ).toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        agendaId: z.string().describe('The agenda ID to get details for'),
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
          return createErrorResponse(
            `Failed to read agenda ${agendaId} on ${network}: ${results[0].error.message}`
          );
        }

        const agendaData = results[0].result as any;
        if (!agendaData) {
          return createErrorResponse(
            `Agenda ${agendaId} not found on ${network}`
          );
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
          const message = createAgendaMessage(
            agendaId,
            network,
            agendaData,
            statusText,
            undefined,
            'Version 1'
          );
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
              return createErrorResponse(
                `Failed to read current agenda status on ${network}: ${result2[0].error.message}`
              );
            }

            const statusData = result2[0].result as any;
            // statusData is an array [agendaResult, agendaStatus]
            const agendaResult =
              statusData?.[0] !== undefined ? Number(statusData[0]) : 0;
            const agendaStatus =
              statusData?.[1] !== undefined ? Number(statusData[1]) : 0;

            const agendaResultText = getAgendaResultText(agendaResult);
            const agendaStatusText = getAgendaStatusText(agendaStatus);

            const message = createAgendaMessage(
              agendaId,
              network,
              agendaData,
              agendaStatusText,
              agendaResultText,
              `Committee v${committeeVersion}`
            );

            return createSuccessResponse(message);
          } catch (error) {
            return createErrorResponse(
              `Failed to get agenda status for version ${committeeVersion}: ${error}`
            );
          }
        } else {
          return createErrorResponse(
            `Unsupported committee version: ${committeeVersion}`
          );
        }
      } catch (error) {
        return createErrorResponse(
          `Failed to get agenda ${agendaId} on ${network}: ${error}`
        );
      }
    }
  );

  server.registerTool(
    'get-agenda-count',
    {
      title: 'Get total agenda count',
      description: new DescriptionBuilder(
        'Get the total number of agendas on the specified network. This returns the count of all agendas that have been created.'
      ).toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
      },
    },
    async ({ network = 'mainnet' }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        // Get the total number of agendas
        const totalAgendasResult = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: daoAgendaManagerAbi,
              functionName: 'numAgendas',
              args: [],
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

        if (totalAgendasResult[0].error) {
          return createErrorResponse(
            `Failed to get agenda count on ${network}: ${totalAgendasResult[0].error.message}`
          );
        }

        const totalAgendas = Number(totalAgendasResult[0].result);
        const committeeVersion = totalAgendasResult[1]
          .result as unknown as string;

        // Create response message
        let message = `📊 **Agenda Count on ${network}**\n\n`;
        message += `Total Agendas: ${totalAgendas}\n`;
        message += `Committee Version: ${committeeVersion || 'Unknown'}\n`;
        message += `Agenda Range: 0 - ${totalAgendas - 1}\n\n`;

        if (totalAgendas === 0) {
          message += 'No agendas have been created on this network yet.';
        } else {
          message += `Latest Agenda ID: ${totalAgendas - 1}\n`;
          message += `First Agenda ID: 0\n`;
        }

        return createSuccessResponse(message);
      } catch (error) {
        return createErrorResponse(
          `Failed to get agenda count on ${network}: ${error}`
        );
      }
    }
  );

  server.registerTool(
    'get-agendas',
    {
      title: 'Get multiple agendas',
      description: new DescriptionBuilder(
        'Get multiple agendas within a specified range. If no range is specified, returns the latest 50 agendas. Maximum 50 agendas per request. Parameters: start (optional) - Starting agenda ID, end (optional) - Ending agenda ID, network (optional) - Network to query (mainnet, sepolia).'
      ).toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        start: z
          .string()
          .optional()
          .describe(
            'Starting agenda ID (inclusive). If not provided, will get latest agendas'
          ),
        end: z
          .string()
          .optional()
          .describe(
            'Ending agenda ID (inclusive). If not provided, will get up to 50 agendas from start'
          ),
      },
    },
    async ({ start, end, network = 'mainnet' }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        // First, get the total number of agendas to validate ranges
        const totalAgendasResult = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: daoAgendaManagerAbi,
              functionName: 'numAgendas',
              args: [],
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

        if (totalAgendasResult[0].error) {
          return createErrorResponse(
            `Failed to get agenda count on ${network}: ${totalAgendasResult[0].error.message}`
          );
        }

        const totalAgendas = Number(totalAgendasResult[0].result);
        if (totalAgendas === 0) {
          return createSuccessResponse('No agendas found on this network.');
        }

        // Check committee version
        const committeeVersion = totalAgendasResult[1]
          .result as unknown as string;
        const isVersion2 = committeeVersion === '2.0.0';

        // Determine the range of agenda IDs to fetch
        let startId: number;
        let endId: number;
        let agendaCount: number;

        if (!start && !end) {
          // No range specified: get latest 50 agendas
          startId = Math.max(0, totalAgendas - MAX_AGENDAS_PER_REQUEST);
          endId = totalAgendas - 1;
          agendaCount = Math.min(MAX_AGENDAS_PER_REQUEST, totalAgendas);
        } else if (start && !end) {
          // Start specified, no end: get from start to start + 49
          startId = parseInt(start);
          if (isNaN(startId) || startId < 0) {
            return createErrorResponse(
              'Invalid start ID. Must be a non-negative number.'
            );
          }
          if (startId >= totalAgendas) {
            return createErrorResponse(
              `Start ID ${startId} is out of range. Total agendas: ${totalAgendas}`
            );
          }
          endId = Math.min(
            startId + MAX_AGENDAS_PER_REQUEST - 1,
            totalAgendas - 1
          );
          agendaCount = endId - startId + 1;
        } else if (!start && end) {
          // End specified, no start: get from end - 49 to end
          endId = parseInt(end);
          if (isNaN(endId) || endId < 0) {
            return createErrorResponse(
              'Invalid end ID. Must be a non-negative number.'
            );
          }
          if (endId >= totalAgendas) {
            return createErrorResponse(
              `End ID ${endId} is out of range. Total agendas: ${totalAgendas}`
            );
          }
          startId = Math.max(0, endId - MAX_AGENDAS_PER_REQUEST + 1);
          agendaCount = endId - startId + 1;
        } else {
          // Both start and end specified
          startId = parseInt(start!);
          endId = parseInt(end!);

          if (isNaN(startId) || isNaN(endId) || startId < 0 || endId < 0) {
            return createErrorResponse(
              'Invalid start or end ID. Must be non-negative numbers.'
            );
          }

          if (startId > endId) {
            return createErrorResponse(
              'Start ID must be less than or equal to end ID.'
            );
          }

          if (startId >= totalAgendas) {
            return createErrorResponse(
              `Start ID ${startId} is out of range. Total agendas: ${totalAgendas}`
            );
          }

          if (endId >= totalAgendas) {
            return createErrorResponse(
              `End ID ${endId} is out of range. Total agendas: ${totalAgendas}`
            );
          }

          agendaCount = endId - startId + 1;
          if (agendaCount > MAX_AGENDAS_PER_REQUEST) {
            return createErrorResponse(
              `Too many agendas requested (${agendaCount}). Maximum is ${MAX_AGENDAS_PER_REQUEST}.`
            );
          }
        }

        // Prepare contracts to read agenda details
        const contracts = [];
        for (let i = startId; i <= endId; i++) {
          contracts.push({
            address: networkAddresses.AGENDA_MANAGER,
            abi: daoAgendaManagerAbi,
            functionName: 'agendas',
            args: [BigInt(i)],
            chainId,
          });
        }

        // If Version 2, also prepare status contracts
        if (isVersion2) {
          for (let i = startId; i <= endId; i++) {
            contracts.push({
              address: networkAddresses.DAO_COMMITTEE,
              abi: daoCommitteeAbi,
              functionName: 'currentAgendaStatus',
              args: [BigInt(i)],
              chainId,
            });
          }
        }

        // Read all agenda data
        const results = await readContracts(wagmiConfig, { contracts });

        // Process agenda results
        const agendas = [];
        const failedAgendas = [];

        const agendaResultsCount = endId - startId + 1;
        for (let i = 0; i < agendaResultsCount; i++) {
          const result = results[i];
          const agendaId = startId + i;

          if (result.error) {
            failedAgendas.push({ id: agendaId, error: result.error.message });
            continue;
          }

          const agendaData = result.result as any;
          if (!agendaData) {
            failedAgendas.push({ id: agendaId, error: 'Agenda not found' });
            continue;
          }

          // Extract basic agenda data
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
            result: agendaResult,
            voters,
            executed,
          } = agendaData;

          let statusText = 'Unknown';
          let resultText = 'Unknown';

          if (isVersion2) {
            // Version 2: Get detailed status from the additional results
            const statusResultIndex = i + agendaResultsCount; // Status results come after agenda results
            const statusResult = results[statusResultIndex];

            if (statusResult && !statusResult.error && statusResult.result) {
              try {
                const statusData = statusResult.result as any;
                const currentResult =
                  statusData?.[0] !== undefined ? Number(statusData[0]) : 0;
                const currentStatus =
                  statusData?.[1] !== undefined ? Number(statusData[1]) : 0;
                resultText = getAgendaResultText(currentResult);
                statusText = getAgendaStatusText(currentStatus);
              } catch (error) {
                // Fallback to basic status if parsing fails
                statusText = getAgendaStatusTextV1(status);
              }
            } else {
              // Fallback to basic status
              statusText = getAgendaStatusTextV1(status);
            }
          } else {
            // Version 1: Use basic status
            statusText = getAgendaStatusTextV1(status);
          }

          agendas.push({
            id: agendaId,
            createdTimestamp: Number(createdTimestamp) || 0,
            noticeEndTimestamp: Number(noticeEndTimestamp) || 0,
            votingPeriodInSeconds: Number(votingPeriodInSeconds) || 0,
            votingStartedTimestamp: Number(votingStartedTimestamp) || 0,
            votingEndTimestamp: Number(votingEndTimestamp) || 0,
            executableLimitTimestamp: Number(executableLimitTimestamp) || 0,
            executedTimestamp: Number(executedTimestamp) || 0,
            countingYes: Number(countingYes) || 0,
            countingNo: Number(countingNo) || 0,
            countingAbstain: Number(countingAbstain) || 0,
            status: Number(status) || 0,
            result: Number(agendaResult) || 0,
            voters: Array.isArray(voters) ? voters : [],
            executed: Boolean(executed),
            statusText,
            resultText,
          });
        }

        // Create response message
        let message = `📋 **Agendas ${startId}-${endId} on ${network}**\n\n`;
        message += `Committee Version: ${committeeVersion}\n`;
        message += `Total Found: ${agendas.length}\n`;

        if (failedAgendas.length > 0) {
          message += `Failed to load: ${failedAgendas.length}\n`;
        }

        message += '\n---\n\n';

        if (agendas.length === 0) {
          message += 'No agendas found in the specified range.\n';
        } else {
          // 최근 아젠다를 먼저 보여주기 위해 내림차순 정렬
          const sortedAgendas = agendas.sort((a, b) => b.id - a.id);
          for (const agenda of sortedAgendas) {
            message += `**Agenda #${agenda.id}**\n`;
            message += `Status: ${agenda.statusText}\n`;
            message += `Result: ${agenda.resultText}\n`;
            message += `Created: ${formatTimestamp(agenda.createdTimestamp)}\n`;
            message += `Voting: ${agenda.votingStartedTimestamp > 0 ? formatTimestamp(agenda.votingStartedTimestamp) : 'Not started'} - ${agenda.votingEndTimestamp > 0 ? formatTimestamp(agenda.votingEndTimestamp) : 'Not ended'}\n`;
            message += `Votes: Yes ${agenda.countingYes} | No ${agenda.countingNo} | Abstain ${agenda.countingAbstain}\n`;
            message += `Executed: ${agenda.executed ? 'Yes' : 'No'}\n\n`;
          }
        }

        if (failedAgendas.length > 0) {
          message += '**Failed to load:**\n';
          for (const failed of failedAgendas) {
            message += `- Agenda #${failed.id}: ${failed.error}\n`;
          }
        }

        return createSuccessResponse(message);
      } catch (error) {
        return createErrorResponse(
          `Failed to get agendas on ${network}: ${error}`
        );
      }
    }
  );

  server.registerTool(
    'create-agenda',
    {
      title: 'Create a new agenda',
      description: new DescriptionBuilder(
        'Create a new agenda with specified actions. Use execute=false for preview, execute=true to submit transaction. Requires TON tokens for fees.'
      ).toString(),
      inputSchema: {
        network: z
          .string()
          .optional()
          .default('mainnet')
          .describe('The network to use (mainnet, sepolia, etc.)'),
        actions: z
          .array(
            z.object({
              target: z.string().describe('Target contract address'),
              functionName: z
                .string()
                .describe(
                  'Function signature (e.g., "transfer(address,uint256)")'
                ),
              args: z.array(z.any()).describe('Function arguments array'),
            })
          )
          .describe('Array of actions to execute'),
        agendaUrl: z
          .string()
          .optional()
          .describe(
            'URL for agenda notice and snapshot (Version 2 only, optional)'
          ),
        execute: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Set to true to execute the transaction, false for preview only'
          ),
      },
    },
    async ({ actions, agendaUrl, network = 'mainnet', execute = false }) => {
      const networkAddresses = getNetworkAddresses(network);
      const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

      try {
        // Validate inputs
        if (!actions || actions.length === 0) {
          return createErrorResponse('At least one action is required');
        }

        // Generate callData from actions
        const targets: string[] = [];
        const callData: string[] = [];

        for (const action of actions) {
          if (!action.target || !action.functionName) {
            return createErrorResponse(
              'Each action must have target and functionName'
            );
          }

          targets.push(action.target);

          try {
            // Create a minimal ABI for the function
            const functionSignature = action.functionName;
            const functionName = functionSignature.split('(')[0];
            const params = functionSignature.match(/\((.*)\)/)?.[1] || '';

            if (!params) {
              return createErrorResponse(
                `Invalid function signature: ${functionSignature}`
              );
            }

            const paramTypes = params.split(',').map((p) => p.trim());
            const abi = [
              {
                inputs: paramTypes.map((type, index) => ({
                  name: `arg${index}`,
                  type: type,
                })),
                name: functionName,
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
              },
            ];

            const encodedData = encodeFunctionData({
              abi,
              functionName,
              args: action.args || [],
            });

            callData.push(encodedData);
          } catch (error) {
            return createErrorResponse(
              `Failed to encode function ${action.functionName}: ${error}`
            );
          }
        }

        // Read agenda creation fees and periods
        const results = await readContracts(wagmiConfig, {
          contracts: [
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: agendaManagerAbi,
              functionName: 'createAgendaFees',
              args: [],
              chainId,
            },
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: agendaManagerAbi,
              functionName: 'minimumNoticePeriodSeconds',
              args: [],
              chainId,
            },
            {
              address: networkAddresses.AGENDA_MANAGER,
              abi: agendaManagerAbi,
              functionName: 'minimumVotingPeriodSeconds',
              args: [],
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

        // Check for errors
        const [
          feesResult,
          noticePeriodResult,
          votingPeriodResult,
          versionResult,
        ] = results;

        if (feesResult.error) {
          return createErrorResponse(
            `Failed to get agenda creation fees: ${feesResult.error.message}`
          );
        }

        if (noticePeriodResult.error) {
          return createErrorResponse(
            `Failed to get minimum notice period: ${noticePeriodResult.error.message}`
          );
        }

        if (votingPeriodResult.error) {
          return createErrorResponse(
            `Failed to get minimum voting period: ${votingPeriodResult.error.message}`
          );
        }

        const requiredFees = feesResult.result as bigint;
        const noticePeriod = noticePeriodResult.result as bigint;
        const votingPeriod = votingPeriodResult.result as bigint;
        const isVersion2 = !versionResult.error && versionResult.result;

        // Prepare extraData based on version
        let extraData: string;

        // Convert targets and callData to proper types
        const targetAddresses = targets as `0x${string}`[];
        const callDataArray = callData as `0x${string}`[];

        if (isVersion2) {
          // Version 2: Include agenda URL
          const agendaUrlParam = agendaUrl || '';

          extraData = encodeAbiParameters(
            [
              { name: 'targetAddresses', type: 'address[]' },
              { name: 'minimumNoticePeriodSeconds', type: 'uint128' },
              { name: 'minimumVotingPeriodSeconds', type: 'uint128' },
              { name: 'executeImmediately', type: 'bool' },
              { name: 'callDataArray', type: 'bytes[]' },
              { name: 'agendaUrl', type: 'string' },
            ],
            [
              targetAddresses,
              noticePeriod,
              votingPeriod,
              true,
              callDataArray,
              agendaUrlParam,
            ]
          );
        } else {
          // Version 1: No agenda URL
          extraData = encodeAbiParameters(
            [
              { name: 'targetAddresses', type: 'address[]' },
              { name: 'minimumNoticePeriodSeconds', type: 'uint128' },
              { name: 'minimumVotingPeriodSeconds', type: 'uint128' },
              { name: 'executeImmediately', type: 'bool' },
              { name: 'callDataArray', type: 'bytes[]' },
            ],
            [targetAddresses, noticePeriod, votingPeriod, true, callDataArray]
          );
        }

        // If execute is false, show preview only
        if (!execute) {
          const tonFees = Number(requiredFees) / 10 ** 18;
          const message =
            `📝 **Create Agenda Preview on ${network}**\n\n` +
            `**Committee Version:** ${isVersion2 ? '2.0.0' : '1.0.0'}\n` +
            `**Required TON Fees:** ${tonFees.toFixed(6)} TON\n` +
            `**Notice Period:** ${noticePeriod.toString()} seconds\n` +
            `**Voting Period:** ${votingPeriod.toString()} seconds\n` +
            `**Actions:** ${actions.length} action(s)\n` +
            (agendaUrl ? `**Agenda URL:** ${agendaUrl}\n` : '') +
            `\n**Actions Details:**\n` +
            actions
              .map(
                (action, index) =>
                  `${index + 1}. ${action.target} -> ${action.functionName}(${action.args?.join(', ') || ''})`
              )
              .join('\n') +
            `\n\n**Transaction Details:**\n` +
            `- Contract: ${networkAddresses.TON_ADDRESS}\n` +
            `- Function: approveAndCall\n` +
            `- Spender: ${networkAddresses.WTON_ADDRESS}\n` +
            `- Amount: ${tonFees.toFixed(6)} TON\n` +
            `- Extra Data: ${extraData}\n\n` +
            `⚠️ **Next Step:** Set execute=true to proceed with agenda creation.`;

          return createSuccessResponse(message);
        }

        // If execute is true, proceed with transaction
        // Check wallet connection
        const { getAccount } = await import('@wagmi/core');
        const connectedAccount = getAccount(wagmiConfig);

        if (!connectedAccount?.isConnected) {
          const message =
            `🔗 **Wallet Connection Required**\n\n` +
            `To create an agenda, you need to connect your wallet first.\n\n` +
            `**Next Steps:**\n` +
            `1. Call the \`connect-wallet\` tool to generate a QR code\n` +
            `2. Scan the QR code with your MetaMask mobile app\n` +
            `3. Once connected, call this tool again with the same parameters\n\n` +
            `**Current Agenda Details:**\n` +
            `- Network: ${network}\n` +
            `- Actions: ${actions.length} action(s)\n` +
            `- Required Fees: ${(Number(requiredFees) / 10 ** 18).toFixed(6)} TON\n` +
            (agendaUrl ? `- Agenda URL: ${agendaUrl}\n` : '') +
            `\n💡 **Tip:** Use \`execute=false\` to preview agenda details without connecting wallet.`;

          return createErrorResponse(message);
        }

        // Check TON balance
        const { readContract } = await import('@wagmi/core');
        const tonBalance = await readContract(wagmiConfig, {
          address: networkAddresses.TON_ADDRESS,
          abi: tonAbi,
          functionName: 'balanceOf',
          args: [connectedAccount.address as `0x${string}`],
          chainId,
        });

        const tonFees = Number(requiredFees) / 10 ** 18;
        const userTonBalance = Number(tonBalance) / 10 ** 18;

        if (tonBalance < requiredFees) {
          return createErrorResponse(
            `Insufficient TON balance for agenda creation.\n` +
              `Required: ${tonFees.toFixed(6)} TON\n` +
              `Available: ${userTonBalance.toFixed(6)} TON\n` +
              `Missing: ${(tonFees - userTonBalance).toFixed(6)} TON`
          );
        }

        // Execute the transaction
        const { writeContract } = await import('@wagmi/core');
        const hash = await writeContract(wagmiConfig, {
          address: networkAddresses.TON_ADDRESS,
          abi: tonAbi,
          functionName: 'approveAndCall',
          args: [
            networkAddresses.DAO_COMMITTEE,
            requiredFees,
            extraData as `0x${string}`,
          ],
          chainId,
        });

        const message =
          `✅ **Agenda Creation Executed on ${network}**\n\n` +
          `**Wallet:** ${connectedAccount.address}\n` +
          `**TON Balance:** ${userTonBalance.toFixed(6)} TON\n` +
          `**Required Fees:** ${tonFees.toFixed(6)} TON\n` +
          `**Transaction Hash:** ${hash}\n\n` +
          `🎉 **Success:** Agenda creation transaction has been submitted to the network.`;

        return createSuccessResponse(message);
      } catch (error) {
        return createErrorResponse(
          `Failed to ${execute ? 'execute' : 'prepare'} agenda creation on ${network}: ${error}`
        );
      }
    }
  );
}
