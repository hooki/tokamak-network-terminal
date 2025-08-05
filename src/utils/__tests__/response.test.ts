import { describe, it, expect } from 'vitest';
import { createMCPResponse } from '../response.js';

describe('response.ts', () => {
  describe('createMCPResponse', () => {
    it('should create success response', () => {
      const response = createMCPResponse({
        status: 'success',
        message: 'Operation completed successfully',
      });

      expect(response).toContain('"status":"success"');
      expect(response).toContain('"message":"Operation completed successfully"');
    });

    it('should create error response', () => {
      const response = createMCPResponse({
        status: 'error',
        message: 'Operation failed',
      });

      expect(response).toContain('"status":"error"');
      expect(response).toContain('"message":"Operation failed"');
    });

    it('should create continue response with nextStep', () => {
      const response = createMCPResponse({
        status: 'continue',
        message: 'Please approve the token',
        nextStep: 'approve TON for WTON amount 100',
        callback: 'stake-tokens hammer 100',
      });

      expect(response).toContain('"status":"continue"');
      expect(response).toContain('"message":"Please approve the token"');
      expect(response).toContain('"nextStep":"approve TON for WTON amount 100"');
      expect(response).toContain('"callback":"stake-tokens hammer 100"');
    });

    it('should handle response without optional fields', () => {
      const response = createMCPResponse({
        status: 'success',
        message: 'Simple response',
      });

      expect(response).toContain('"status":"success"');
      expect(response).toContain('"message":"Simple response"');
      expect(response).not.toContain('"nextStep"');
      expect(response).not.toContain('"callback"');
    });

    it('should handle network-specific messages', () => {
      const response = createMCPResponse({
        status: 'error',
        message: 'Operation failed on mainnet',
      });

      expect(response).toContain('"status":"error"');
      expect(response).toContain('"message":"Operation failed on mainnet"');
    });
  });
});