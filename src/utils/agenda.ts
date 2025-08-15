import { formatTimestamp } from './time.js';

/**
 * Agenda status and result mapping utilities for different versions
 */

/**
 * Get agenda result text for version 2
 * @param result - The agenda result value (0-5)
 * @returns Human readable result text
 */
export function getAgendaResultText(result: number): string {
  const resultTextMap: { [key: number]: string } = {
    0: 'Pending',
    1: 'ACCEPT',
    2: 'REJECT',
    3: 'DISMISS',
    4: 'NO CONSENSUS',
    5: 'NO AGENDA',
  };
  return resultTextMap[result] || 'Unknown';
}

/**
 * Get agenda status text for version 2
 * @param status - The agenda status value (0-6)
 * @returns Human readable status text
 */
export function getAgendaStatusText(status: number): string {
  const statusTextMap: { [key: number]: string } = {
    0: 'NONE',
    1: 'NOTICE',
    2: 'VOTING',
    3: 'WAITING_EXEC',
    4: 'EXECUTED',
    5: 'ENDED',
    6: 'NO AGENDA',
  };
  return statusTextMap[status] || 'Unknown';
}

/**
 * Get agenda status text for version 1
 * @param status - The agenda status value (0-3)
 * @returns Human readable status text
 */
export function getAgendaStatusTextV1(status: number): string {
  const statusTextMap: { [key: number]: string } = {
    0: 'Pending',
    1: 'Active',
    2: 'Ended',
    3: 'Executed',
  };
  return statusTextMap[status] || 'Unknown';
}

/**
 * Check if agenda is in voting period
 * @param status - The agenda status value
 * @returns True if agenda is currently in voting period
 */
export function isAgendaInVoting(status: number): boolean {
  return status === 2; // VOTING status
}

/**
 * Check if agenda is executable
 * @param status - The agenda status value
 * @returns True if agenda can be executed
 */
export function isAgendaExecutable(status: number): boolean {
  return status === 3; // WAITING_EXEC status
}

/**
 * Create agenda details message
 */
export function createAgendaMessage(
  agendaId: string,
  network: string,
  agendaData: any,
  statusText: string,
  resultText?: string,
  version?: string
): string {
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
    voters,
    executed,
  } = agendaData;

  const totalVotes =
    Number(countingYes) + Number(countingNo) + Number(countingAbstain);
  const votersList =
    voters.length > 0
      ? voters
          .map((voter: string, index: number) => `${index + 1}. ${voter}`)
          .join('\n    ')
      : 'No voters';

  const versionSuffix = version ? ` (${version})` : '';
  const resultLine = resultText ? `• Result: ${resultText}\n` : '';

  return `Agenda ${agendaId} Details on ${network}${versionSuffix}:
• Status: ${statusText}
${resultLine}• Created: ${formatTimestamp(createdTimestamp)}
• Notice End: ${formatTimestamp(noticeEndTimestamp)}
• Voting Period: ${votingPeriodInSeconds.toString()} seconds
• Voting Start: ${formatTimestamp(votingStartedTimestamp)}
• Voting End: ${formatTimestamp(votingEndTimestamp)}
• Executable Limit: ${formatTimestamp(executableLimitTimestamp)}
• Executed: ${executed ? 'Yes' : 'No'}
• Executed Time: ${formatTimestamp(executedTimestamp)}
• Yes Votes: ${countingYes.toString()}
• No Votes: ${countingNo.toString()}
• Abstain Votes: ${countingAbstain.toString()}
• Total Votes: ${totalVotes}
• Voters Count: ${voters.length}
• Voters: ${votersList}`;
}
