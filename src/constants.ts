import type { Address } from 'viem';

const TOKENS: Record<string, Address> = {
  TON: '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044',
  WTON: '0x79e0d92670106c85e9067b56b8f674340dca0bbd',
};

const TON_ADDRESS: Address = '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044';
const WTON_ADDRESS: Address = '0x79e0d92670106c85e9067b56b8f674340dca0bbd';
const DEPOSIT_MANAGER: Address = '0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F';

export { TON_ADDRESS, WTON_ADDRESS, DEPOSIT_MANAGER, TOKENS };
