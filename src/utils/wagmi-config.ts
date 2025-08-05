import { createConfig, createStorage, http } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';

const memory: Record<string, string> = {};

export const memoryStorage = createStorage({
  storage: {
    getItem: (key) => memory[key] ?? null,
    setItem: (key, value) => {
      memory[key] = value;
    },
    removeItem: (key) => {
      delete memory[key];
    },
  },
});

const storage = {
  getItem: async (key: string) => {
    const value = await memoryStorage.getItem(key);
    return value?.toString();
  },
  setItem: async (key: string, value: string) => {
    memoryStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    memoryStorage.removeItem(key);
  },
};

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  ssr: true,
  storage: createStorage({ storage }),
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
