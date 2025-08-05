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
  },
  {
    "inputs": [{"internalType": "address","name": "_candidate","type": "address"}],
    "name": "isMember",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxMember",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "name": "members",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;