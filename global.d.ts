import type { Address } from 'viem';

declare global {
  interface Layer2Operator {
    name: string;
    address: Address;
    description: string;
  }

  interface CallToolResult {
    content: Array<{
      type: 'text';
      text: string;
    }>;
    isError?: boolean;
    [key: string]: unknown;
  }

  interface WalletCheckResult extends CallToolResult {
    isConnected: boolean;
  }

  interface MCPResponse {
    status: string;
    message: string;
    nextStep?: string;
    callback?: string;
    executeNextStepAfter?: string;
  }

  type Layer2Operators = Record<string, Layer2Operator>;

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      [key: string]: string | undefined;
    }
  }
}
