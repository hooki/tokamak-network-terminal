/**
 * DAO Committee ABI
 */
export const daoCommitteeAbi = [
  {
    "inputs": [],
    "name": "version",
    "outputs": [{"internalType": "string","name": "","type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "agendaId","type": "uint256"}],
    "name": "currentAgendaStatus",
    "outputs": [
      {"internalType": "uint256","name": "agendaResult","type": "uint256"},
      {"internalType": "uint256","name": "agendaStatus","type": "uint256"},
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;