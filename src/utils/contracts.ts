import { readContracts } from '@wagmi/core';
import type { Abi } from 'viem';
import { daoCommitteeAbi } from '../abis/daoCommittee.js';
import { wagmiConfig } from './wagmi-config.js';

type NetworkAddresses = {
  AGENDA_MANAGER: `0x${string}`;
  DAO_COMMITTEE: `0x${string}`;
  [key: string]: `0x${string}`;
};

/**
 * Read agenda data from contract
 */
export async function readAgendaData(
  agendaId: string,
  networkAddresses: NetworkAddresses,
  daoAgendaManagerAbi: Abi,
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
  networkAddresses: NetworkAddresses,
  daoCommitteeAbi: Abi,
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
  networkAddresses: NetworkAddresses,
  daoCommitteeAbi: Abi,
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
