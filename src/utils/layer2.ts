import type { Address } from 'viem';

// 체인별 Layer2 오퍼레이터 정의
export const LAYER2_OPERATORS: Record<string, Layer2Operators> = {
  mainnet: {
    tokamak1: {
      name: 'tokamak1',
      address: '0xf3B17FDB808c7d0Df9ACd24dA34700ce069007DF',
      description: 'Tokamak Network Layer2 operator',
    },
    DXM_Corp: {
      name: 'DXM Corp',
      address: '0x44e3605d0ed58FD125E9C47D1bf25a4406c13b57',
      description: 'Tokamak Network Layer2 operator',
    },
    DSRV: {
      name: 'DSRV',
      address: '0x2B67D8D4E61b68744885E243EfAF988f1Fc66E2D',
      description: 'Tokamak Network Layer2 operator',
    },
    Talken: {
      name: 'Talken',
      address: '0x36101b31e74c5E8f9a9cec378407Bbb776287761',
      description: 'Tokamak Network Layer2 operator',
    },
    staked: {
      name: 'staked',
      address: '0x2c25A6be0e6f9017b5bf77879c487eed466F2194',
      description: 'Tokamak Network Layer2 operator',
    },
    level: {
      name: 'level',
      address: '0x0F42D1C40b95DF7A1478639918fc358B4aF5298D',
      description: 'Tokamak Network Layer2 operator',
    },
    decipher: {
      name: 'decipher',
      address: '0xbc602C1D9f3aE99dB4e9fD3662CE3D02e593ec5d',
      description: 'Tokamak Network Layer2 operator',
    },
    DeSpread: {
      name: 'DeSpread',
      address: '0xC42cCb12515b52B59c02eEc303c887C8658f5854',
      description: 'Tokamak Network Layer2 operator',
    },
    Danal_Fintech: {
      name: 'Danal Fintech',
      address: '0xf3CF23D896Ba09d8EcdcD4655d918f71925E3FE5',
      description: 'Tokamak Network Layer2 operator',
    },
    Hammer: {
      name: 'Hammer DAO',
      address: '0x06D34f65869Ec94B3BA8c0E08BCEb532f65005E2',
      description: 'Tokamak Network Layer2 operator',
    },
  },
  sepolia: {
    TokamakOperator_v2: {
      name: 'TokamakOperator_v2 ',
      address: '0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599', // Sepolia 주소
      description: 'Tokamak Network Layer2 operator (Sepolia)',
    },
    poseidon: {
      name: 'poseidon',
      address: '0xf078ae62ea4740e19ddf6c0c5e17ecdb820bbee1', // Sepolia  주소
      description: 'Tokamak Network Layer2 operator (Sepolia)',
    },
    // Sepolia의 다른 오퍼레이터들 추가 가능
  },
};

// 네트워크별 Layer2 오퍼레이터를 가져오는 헬퍼 함수
export function getNetworkLayer2Operators(network: string): Layer2Operators {
  return LAYER2_OPERATORS[network] || LAYER2_OPERATORS.mainnet;
}

// 특정 네트워크의 Layer2 주소를 해석하는 함수
export function resolveLayer2Address(
  identifier: string,
  network: string = 'mainnet'
): Address {
  const operators = getNetworkLayer2Operators(network);

  return identifier.startsWith('0x')
    ? (identifier as Address)
    : operators[identifier]?.address || (identifier as Address);
}

// 기존 함수와의 호환성을 위한 기본 함수 (메인넷 사용)
export function resolveLayer2AddressDefault(identifier: string): Address {
  return resolveLayer2Address(identifier, 'mainnet');
}
