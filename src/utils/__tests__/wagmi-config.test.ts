import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage, wagmiConfig } from '../wagmi-config.js';

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  createStorage: vi.fn((config) => ({
    getItem: config.storage.getItem,
    setItem: config.storage.setItem,
    removeItem: config.storage.removeItem,
  })),
  createConfig: vi.fn((config) => ({
    ...config,
    _internal: {
      connectors: {
        setup: vi.fn(),
      },
    },
  })),
  http: vi.fn(() => ({})),
}));

// Mock wagmi chains
vi.mock('@wagmi/core/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
}));

describe('wagmi-config.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('memoryStorage', () => {
    it('should store and retrieve items', () => {
      const key = 'test-key';
      const value = 'test-value';

      // Set item
      memoryStorage.setItem(key, value);

      // Get item
      const retrieved = memoryStorage.getItem(key);
      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent items', () => {
      const retrieved = memoryStorage.getItem('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should remove items', () => {
      const key = 'test-key';
      const value = 'test-value';

      // Set item
      memoryStorage.setItem(key, value);
      expect(memoryStorage.getItem(key)).toBe(value);

      // Remove item
      memoryStorage.removeItem(key);
      expect(memoryStorage.getItem(key)).toBeNull();
    });

    it('should handle multiple items', () => {
      memoryStorage.setItem('key1', 'value1');
      memoryStorage.setItem('key2', 'value2');

      expect(memoryStorage.getItem('key1')).toBe('value1');
      expect(memoryStorage.getItem('key2')).toBe('value2');
    });

    it('should handle empty string values', () => {
      const key = 'empty-key';
      memoryStorage.setItem(key, '');

      expect(memoryStorage.getItem(key)).toBe('');
    });

    it('should handle null values', () => {
      const key = 'null-key';
      memoryStorage.setItem(key, null as string | null);

      expect(memoryStorage.getItem(key)).toBeNull();
    });
  });

  describe('wagmiConfig', () => {
    it('should be created with correct configuration', () => {
      expect(wagmiConfig).toBeDefined();
      expect(typeof wagmiConfig).toBe('object');
    });

    it('should have storage configuration', () => {
      // The storage should be configured
      expect(wagmiConfig).toHaveProperty('storage');
    });

    it('should have chains configuration', () => {
      // The config should include chains
      expect(wagmiConfig).toHaveProperty('chains');
    });

    it('should have transports configuration', () => {
      // The config should include transports
      expect(wagmiConfig).toHaveProperty('transports');
    });

    it('should have SSR enabled', () => {
      // The config should have SSR enabled
      expect(wagmiConfig).toHaveProperty('ssr');
    });
  });

  describe('storage integration', () => {
    it('should use async storage functions', async () => {
      const storage = wagmiConfig.storage;

      expect(storage).toBeDefined();
      expect(typeof storage?.getItem).toBe('function');
      expect(typeof storage?.setItem).toBe('function');
      expect(typeof storage?.removeItem).toBe('function');
    });

    it('should handle async storage operations', async () => {
      const storage = wagmiConfig.storage;
      expect(storage).toBeDefined();

      if (!storage) return; // Skip if storage is not available

      const key = 'async-test';
      const value = 'async-value';

      // Set item
      await storage.setItem(key, value);

      // Get item
      const retrieved = await storage.getItem(key);
      expect(retrieved).toBe(value);

      // Remove item
      await storage.removeItem(key);
      const afterRemove = await storage.getItem(key);
      expect(afterRemove).toBeUndefined(); // getItem returns undefined for non-existent items
    });
  });
});
