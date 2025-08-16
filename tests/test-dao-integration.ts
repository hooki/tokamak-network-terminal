import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: Array<{ text: string }>;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

class DAOIntegrationTest {
  private serverProcess: ChildProcess | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in sendRequest method for JSON-RPC request ID generation
  private requestId = 1;

  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (
        !this.serverProcess.stdout ||
        !this.serverProcess.stderr ||
        !this.serverProcess.stdin
      ) {
        reject(new Error('Failed to create server process streams'));
        return;
      }

      this.serverProcess.stderr.on('data', (data: Buffer) => {
        console.log('🚨 Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error: Error) => {
        reject(error);
      });

      // Wait for server to start
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  stopServer(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  private sendRequest(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess?.stdin || !this.serverProcess?.stdout) {
        reject(new Error('Server process not available'));
        return;
      }

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params,
      };

      // biome-ignore lint/complexity/useLiteralKeys: TypeScript noPropertyAccessFromIndexSignature requires bracket notation
      const toolName = (params['name'] as string) || 'unknown';
      console.log(`Sending: ${method} (tool: ${toolName})`);

      // Set up response listener
      const onData = (data: Buffer): void => {
        const response = this.parseResponse(data);
        if (response && response.id === request.id) {
          this.serverProcess?.stdout?.off('data', onData);
          resolve(response);
        }
      };

      this.serverProcess.stdout.on('data', onData);

      // Send request
      this.serverProcess.stdin.write(`${JSON.stringify(request)}\n`);

      // Timeout after 10 seconds
      setTimeout(() => {
        this.serverProcess?.stdout?.off('data', onData);
        reject(new Error(`Request timeout for ${method}`));
      }, 10000);
    });
  }

  private parseResponse(data: Buffer): JsonRpcResponse | null {
    const dataStr = data.toString();
    const lines = dataStr.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const response = JSON.parse(line.trim()) as unknown;

        // Type guard for JsonRpcResponse
        if (
          typeof response === 'object' &&
          response !== null &&
          'jsonrpc' in response &&
          response.jsonrpc === '2.0' &&
          ('result' in response || 'error' in response)
        ) {
          return response as JsonRpcResponse;
        }
      } catch (_error) {
        // Silent JSON parse failures are expected for non-JSON log lines
      }
    }

    return null;
  }

  async testDAOMemberCount(network: string): Promise<void> {
    const response = await this.sendRequest('tools/call', {
      name: 'get-dao-member-count',
      arguments: { network },
    });

    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();

    if (response.result?.content?.[0]?.text) {
      const content = JSON.parse(response.result.content[0].text) as unknown;
      expect(content).toHaveProperty('status');
    }
  }

  async testDAOMemberCandidateInfo(network: string): Promise<void> {
    const response = await this.sendRequest('tools/call', {
      name: 'get-dao-member-candidate-info',
      arguments: { network },
    });

    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  }

  async testCheckDAOMembership(
    address: string,
    network: string
  ): Promise<void> {
    const response = await this.sendRequest('tools/call', {
      name: 'check-dao-membership',
      arguments: { address, network },
    });

    if (address === 'invalid-address') {
      // Expect error for invalid address
      expect(response.error).toBeDefined();
    } else {
      expect(response.result).toBeDefined();
    }
  }
}

describe('DAO Integration Tests', () => {
  let testInstance: DAOIntegrationTest;

  beforeAll(async () => {
    testInstance = new DAOIntegrationTest();
    await testInstance.startServer();
  }, 30000);

  afterAll(() => {
    testInstance.stopServer();
  });

  it('should get DAO member count on mainnet', async () => {
    await testInstance.testDAOMemberCount('mainnet');
  }, 15000);

  it('should get DAO member count on sepolia', async () => {
    await testInstance.testDAOMemberCount('sepolia');
  }, 15000);

  it('should get DAO member candidate info on mainnet', async () => {
    await testInstance.testDAOMemberCandidateInfo('mainnet');
  }, 15000);

  it('should get DAO member candidate info on sepolia', async () => {
    await testInstance.testDAOMemberCandidateInfo('sepolia');
  }, 15000);

  it('should check DAO membership for valid address', async () => {
    await testInstance.testCheckDAOMembership(
      '0xc1eba383D94c6021160042491A5dfaF1d82694E6',
      'sepolia'
    );
  }, 15000);

  it('should handle invalid address gracefully', async () => {
    await testInstance.testCheckDAOMembership('invalid-address', 'mainnet');
  }, 15000);
});
