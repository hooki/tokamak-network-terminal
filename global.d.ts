export {};

declare global {
  interface Layer2Operator {
    name: string;
    address: Address;
    description: string;
  }

  type WalletCheckResult = CallToolResult | undefined;

  interface MCPResponse {
    status: string;
    message: string;
    nextStep?: string;
    callback?: string;
    executeNextStepAfter?: string;
  }

  type Layer2Operators = Record<string, Layer2Operator>;
}
