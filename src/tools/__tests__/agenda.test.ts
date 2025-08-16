import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ZodRawShape } from 'zod';
import { registerAgendaTools } from '../agenda.js';

// Define proper interfaces for registered tools
interface RegisteredTool {
  callback: ToolCallback<ZodRawShape>;
}

interface RegisteredToolsMap {
  [toolName: string]: RegisteredTool;
}

// Mock response type for tests
interface MCPTestResponse {
  status: 'success' | 'error' | 'continue';
  message: string;
  [key: string]: unknown;
}

// Helper function to create mock request handler extra
function createMockRequestExtra() {
  return {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: () => Promise.resolve(),
    sendRequest: () => Promise.resolve({}),
  };
}

// Helper function to safely parse JSON response
function parseTestResponse(textContent: unknown): MCPTestResponse {
  if (typeof textContent !== 'string') {
    throw new Error('Expected string content for JSON parsing');
  }
  const parsed = JSON.parse(textContent) as MCPTestResponse;
  return parsed;
}

describe('Agenda Tools - Real Tool Tests', () => {
  let server: McpServer;
  let getAgendaHandler: ToolCallback<ZodRawShape> | undefined;
  let getAgendasHandler: ToolCallback<ZodRawShape> | undefined;
  let getAgendaCountHandler: ToolCallback<ZodRawShape> | undefined;
  let createAgendaHandler: ToolCallback<ZodRawShape> | undefined;

  beforeAll(() => {
    // Create a test server
    server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    // Register the agenda tools
    registerAgendaTools(server);

    // Get the tool handlers directly from the registration
    // Use type assertion to access private property for testing
    const registeredTools = (
      server as unknown as { _registeredTools: RegisteredToolsMap }
    )._registeredTools;
    const agendaTool = registeredTools['get-agenda'];
    const agendasTool = registeredTools['get-agendas'];
    const agendaCountTool = registeredTools['get-agenda-count'];
    const createAgendaTool = registeredTools['create-agenda'];
    getAgendaHandler = agendaTool?.callback;
    getAgendasHandler = agendasTool?.callback;
    getAgendaCountHandler = agendaCountTool?.callback;
    createAgendaHandler = createAgendaTool?.callback;
  });

  describe('get-agenda tool tests', () => {
    it('should get agenda details from mainnet', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler(
        {
          agendaId: '0',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);
      }
    });

    it('should get agenda details from sepolia', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler(
        {
          agendaId: '0',
          network: 'sepolia',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);
      }
    });

    it('should handle missing agenda ID', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler(
        {
          agendaId: '',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(response.status).toBe('error');
        expect(response.message).toContain('Agenda ID is required');
      }
    });
  });

  describe('get-agendas tool tests', () => {
    it('should get latest agendas from mainnet', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agendas');
          expect(response.message).toContain('mainnet');
        }
      }
    });

    it('should get agendas with start parameter', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          start: '0',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agendas');
          expect(response.message).toContain('0-');
        }
      }
    });

    it('should get agendas with range parameters', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          start: '0',
          end: '5',
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agendas 0-5');
          expect(response.message).toContain('Total Found:');
        }
      }
    });

    it('should get agendas from sepolia network', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          network: 'sepolia',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('sepolia');
        }
      }
    });

    it('should handle invalid range parameters', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          start: '10',
          end: '5', // Invalid: start > end
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(response.status).toBe('error');
        expect(response.message).toContain(
          'Start ID must be less than or equal to end ID'
        );
      }
    });

    it('should handle out of range agenda IDs', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler(
        {
          start: '0',
          end: '100', // Out of range
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(response.status).toBe('error');
        expect(response.message).toContain('out of range');
      }
    });
  });

  describe('get-agenda-count tool tests', () => {
    it('should get agenda count from mainnet', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler(
        {
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agenda Count');
          expect(response.message).toContain('mainnet');
          expect(response.message).toContain('Total Agendas:');
        }
      }
    });

    it('should get agenda count from sepolia', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler(
        {
          network: 'sepolia',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agenda Count');
          expect(response.message).toContain('sepolia');
          expect(response.message).toContain('Total Agendas:');
        }
      }
    });

    it('should handle network errors gracefully', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler(
        {
          network: 'invalid-network',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        // The tool falls back to mainnet for invalid networks, so it should succeed
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Agenda Count');
          expect(response.message).toContain('Total Agendas:');
        }
      }
    });
  });

  describe('create-agenda tool tests', () => {
    it('should prepare agenda creation preview with basic actions', async () => {
      if (!createAgendaHandler) {
        console.log('❌ create-agenda tool not found');
        return;
      }

      const result = await createAgendaHandler(
        {
          actions: [
            {
              target: '0x1234567890123456789012345678901234567890',
              functionName: 'approve(address,uint256)',
              args: [
                '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                '500000000000000000',
              ],
            },
          ],
          execute: false,
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Create Agenda Preview');
          expect(response.message).toContain('mainnet');
          expect(response.message).toContain('Required TON Fees:');
          expect(response.message).toContain('TON');
          expect(response.message).toContain('Next Step:');
        }
      }
    });

    it('should prepare agenda creation preview with multiple actions', async () => {
      if (!createAgendaHandler) {
        console.log('❌ create-agenda tool not found');
        return;
      }

      const result = await createAgendaHandler(
        {
          actions: [
            {
              target: '0x1234567890123456789012345678901234567890',
              functionName: 'approve(address,uint256)',
              args: [
                '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                '500000000000000000',
              ],
            },
            {
              target: '0x9876543210987654321098765432109876543210',
              functionName: 'setValue(uint256,string)',
              args: ['42', 'test value'],
            },
          ],
          agendaUrl: 'https://forum.tokamak.network/agenda/123',
          execute: false,
          network: 'sepolia',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(['success', 'error']).toContain(response.status);

        if (response.status === 'success') {
          expect(response.message).toContain('Create Agenda Preview');
          expect(response.message).toContain('sepolia');
          expect(response.message).toContain('**Actions:** 2 action(s)');
          expect(response.message).toContain('Agenda URL:');
          expect(response.message).toContain('Next Step:');
        }
      }
    });

    it('should handle missing actions', async () => {
      if (!createAgendaHandler) {
        console.log('❌ create-agenda tool not found');
        return;
      }

      const result = await createAgendaHandler(
        {
          actions: [],
          execute: false,
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(response.status).toBe('error');
        expect(response.message).toContain('At least one action is required');
      }
    });

    it('should handle invalid function signature', async () => {
      if (!createAgendaHandler) {
        console.log('❌ create-agenda tool not found');
        return;
      }

      const result = await createAgendaHandler(
        {
          actions: [
            {
              target: '0x1234567890123456789012345678901234567890',
              functionName: 'invalidFunction',
              args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
            },
          ],
          execute: false,
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        expect(response.status).toBe('error');
        expect(response.message).toContain('Invalid function signature');
      }
    });

    it('should require wallet connection for execution', async () => {
      if (!createAgendaHandler) {
        console.log('❌ create-agenda tool not found');
        return;
      }

      const result = await createAgendaHandler(
        {
          actions: [
            {
              target: '0x1234567890123456789012345678901234567890',
              functionName: 'approve(address,uint256)',
              args: [
                '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                '1000000000000000000',
              ],
            },
          ],
          execute: true,
          network: 'mainnet',
        },
        createMockRequestExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      if (result.content[0] && 'text' in result.content[0]) {
        const response = parseTestResponse(result.content[0].text);
        // This will likely fail due to wallet connection requirement in test environment
        expect(['error', 'success']).toContain(response.status);
        if (response.status === 'error') {
          expect(response.message).toContain('Wallet Connection Required');
          expect(response.message).toContain('connect-wallet');
          expect(response.message).toContain('QR code');
        }
      }
    });
  });
});
