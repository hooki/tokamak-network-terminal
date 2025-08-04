import type { Address } from 'viem';

// 네트워크별 토큰 주소
const TOKENS: Record<string, Record<string, Address>> = {
  mainnet: {
    TON: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
    WTON: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
  },
  sepolia: {
    TON: '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044',
    WTON: '0x79e0d92670106c85e9067b56b8f674340dca0bbd',
  },
};

// 네트워크별 개별 주소 상수들
const NETWORK_ADDRESSES = {
  mainnet: {
    TON_ADDRESS: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5' as Address,
    WTON_ADDRESS: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2' as Address,
    DEPOSIT_MANAGER: '0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e' as Address,
    SEIG_MANAGER: '0x0b55a0f463b6defb81c6063973763951712d0e5f' as Address,
    LAYER2_REGISTRY: '0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b' as Address,
    SWAPPROXY: '0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d' as Address,
    L1BRIDGE_REGISTRY: '0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4' as Address,
    LAYER2_MANAGER: '0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D' as Address
  },
  sepolia: {
    TON_ADDRESS: '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044' as Address,
    WTON_ADDRESS: '0x79e0d92670106c85e9067b56b8f674340dca0bbd' as Address,
    DEPOSIT_MANAGER: '0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F' as Address,
    SEIG_MANAGER: '0x2320542ae933FbAdf8f5B97cA348c7CeDA90fAd7' as Address,
    LAYER2_REGISTRY: '0xA0a9576b437E52114aDA8b0BC4149F2F5c604581' as Address,
    SWAPPROXY: '0x690f994b82f001059e24d79292c3c476854b767a' as Address,
    L1BRIDGE_REGISTRY: '0x2D47fa57101203855b336e9E61BC9da0A6dd0Dbc' as Address,
    LAYER2_MANAGER: '0x58B4C2FEf19f5CDdd944AadD8DC99cCC71bfeFDc' as Address
  },
};

// 기본값으로 메인넷 사용 (기존 코드와의 호환성을 위해)
const TON_ADDRESS: Address = NETWORK_ADDRESSES.mainnet.TON_ADDRESS;
const WTON_ADDRESS: Address = NETWORK_ADDRESSES.mainnet.WTON_ADDRESS;
const DEPOSIT_MANAGER: Address = NETWORK_ADDRESSES.mainnet.DEPOSIT_MANAGER;

// 네트워크별 주소를 가져오는 헬퍼 함수
export function getNetworkAddresses(network: string) {
  return NETWORK_ADDRESSES[network as keyof typeof NETWORK_ADDRESSES] || NETWORK_ADDRESSES.mainnet;
}

export function getNetworkTokens(network: string) {
  return TOKENS[network as keyof typeof TOKENS] || TOKENS.mainnet;
}


export {
  TON_ADDRESS,
  WTON_ADDRESS,
  DEPOSIT_MANAGER,
  TOKENS,
  NETWORK_ADDRESSES
};
