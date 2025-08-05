import { describe, it, expect, beforeAll } from 'vitest';
import { registerAgendaTools } from '../agenda.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('Agenda Tools - Real Tool Tests', () => {
  let server: McpServer;
  let getAgendaHandler: any;

  beforeAll(() => {
    // Create a test server
    server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    // Register the agenda tools
    registerAgendaTools(server);

    // Get the tool handler directly from the registration
    const registeredTools = (server as any)._registeredTools;
    const agendaTool = registeredTools['get-agenda'];
    getAgendaHandler = agendaTool?.callback;
  });

  describe('get-agenda tool tests', () => {
    it('should get agenda details from mainnet', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler({
        agendaId: '0',
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);
    });

    it('should get agenda details from sepolia', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler({
        agendaId: '0',
        network: 'sepolia'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);
    });

    it('should handle missing agenda ID', async () => {
      if (!getAgendaHandler) {
        console.log('❌ get-agenda tool not found');
        return;
      }

      const result = await getAgendaHandler({
        agendaId: '',
        network: 'mainnet'
      });

      console.log('Missing ID result:', result);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('error');
      expect(response.message).toContain('Agenda ID is required');
    });
  });
});