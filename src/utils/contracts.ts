import { readContracts } from '@wagmi/core';
import { wagmiConfig } from './wagmi-config.js';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';

/**
 * Read agenda data from contract
 */
export async function readAgendaData(
  agendaId: string,
  networkAddresses: any,
  daoAgendaManagerAbi: any,
  chainId: 1 | 11155111
) {
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

  return results;
}

/**
 * Read committee version from contract
 */
export async function readCommitteeVersion(
  networkAddresses: any,
  daoCommitteeAbi: any,
  chainId: 1 | 11155111
) {
  const results = await readContracts(wagmiConfig, {
    contracts: [
      {
        address: networkAddresses.DAO_COMMITTEE,
        abi: daoCommitteeAbi,
        functionName: 'version',
        args: [],
        chainId,
      },
    ],
  });

  return results[0];
}

/**
 * Read current agenda status from contract
 */
export async function readCurrentAgendaStatus(
  agendaId: string,
  networkAddresses: any,
  daoCommitteeAbi: any,
  chainId: 1 | 11155111
) {
  const results = await readContracts(wagmiConfig, {
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

  return results[0];
}