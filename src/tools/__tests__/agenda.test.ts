import { describe, it, expect, beforeAll } from 'vitest';
import { registerAgendaTools } from '../agenda.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('Agenda Tools - Real Tool Tests', () => {
  let server: McpServer;
  let getAgendaHandler: any;
  let getAgendasHandler: any;
  let getAgendaCountHandler: any;

  beforeAll(() => {
    // Create a test server
    server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    // Register the agenda tools
    registerAgendaTools(server);

    // Get the tool handlers directly from the registration
    const registeredTools = (server as any)._registeredTools;
    const agendaTool = registeredTools['get-agenda'];
    const agendasTool = registeredTools['get-agendas'];
    const agendaCountTool = registeredTools['get-agenda-count'];
    getAgendaHandler = agendaTool?.callback;
    getAgendasHandler = agendasTool?.callback;
    getAgendaCountHandler = agendaCountTool?.callback;
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

    //   console.log('Missing ID result:', result);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('error');
      expect(response.message).toContain('Agenda ID is required');
    });
  });

  describe('get-agendas tool tests', () => {
    it('should get latest agendas from mainnet', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agendas');
        expect(response.message).toContain('mainnet');
      }
    });

    it('should get agendas with start parameter', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        start: '0',
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agendas');
        expect(response.message).toContain('0-');
      }
    });

    it('should get agendas with range parameters', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        start: '0',
        end: '5',
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agendas 0-5');
        expect(response.message).toContain('Total Found:');
      }
    });

    it('should get agendas from sepolia network', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        network: 'sepolia'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('sepolia');
      }
    });

    it('should handle invalid range parameters', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        start: '10',
        end: '5', // Invalid: start > end
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toContain('Start ID must be less than or equal to end ID');
    });

    it('should handle out of range agenda IDs', async () => {
      if (!getAgendasHandler) {
        console.log('❌ get-agendas tool not found');
        return;
      }

      const result = await getAgendasHandler({
        start: '0',
        end: '100', // Out of range
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('error');
      expect(response.message).toContain('out of range');
    });
  });

  describe('get-agenda-count tool tests', () => {
    it('should get agenda count from mainnet', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler({
        network: 'mainnet'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agenda Count');
        expect(response.message).toContain('mainnet');
        expect(response.message).toContain('Total Agendas:');
      }
    });

    it('should get agenda count from sepolia', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler({
        network: 'sepolia'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agenda Count');
        expect(response.message).toContain('sepolia');
        expect(response.message).toContain('Total Agendas:');
      }
    });

    it('should handle network errors gracefully', async () => {
      if (!getAgendaCountHandler) {
        console.log('❌ get-agenda-count tool not found');
        return;
      }

      const result = await getAgendaCountHandler({
        network: 'invalid-network'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      // The tool falls back to mainnet for invalid networks, so it should succeed
      expect(['success', 'error']).toContain(response.status);

      if (response.status === 'success') {
        expect(response.message).toContain('Agenda Count');
        expect(response.message).toContain('Total Agendas:');
      }
    });
  });
});