/**
 * Vote Agenda ABI - Functions for voting on agendas
 */
export const voteAgendaAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_agendaID',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_voter',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_vote',
        type: 'uint256',
      },
    ],
    name: 'castVote',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_agendaID',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'hasVoted',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_agendaID',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_candidate',
        type: 'address',
      },
    ],
    name: 'isVoter',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_agendaID',
        type: 'uint256',
      },
    ],
    name: 'isVotableStatus',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
