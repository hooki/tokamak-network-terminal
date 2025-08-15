# Tokamak Network MCP Server Development Guidelines

## 📖 Overview

This document provides development guidelines for the Tokamak Network MCP (Model Context Protocol) Server project. It is designed to help junior developers contribute to this project or develop similar projects.

## 🏗️ Project Structure

```
mcp/
├── src/
│   ├── abis/                 # Smart contract ABI definitions
│   ├── constants/            # Project constants and configurations
│   ├── tools/                # MCP tools (core business logic)
│   │   └── __tests__/        # Unit tests for tools
│   └── utils/                # Common utility functions
│       └── __tests__/        # Unit tests for utilities
├── tests/                    # Integration tests
├── docs/                     # Project documentation
└── dist/                     # Built files
```

## 🎯 Core Architecture Principles

### 1. Separation of Concerns

- **Tools**: MCP tool registration and business logic processing
- **Utils**: Reusable common functionality
- **Constants**: Network-specific addresses and configuration values
- **ABIs**: Smart contract interface definitions

### 2. Modular Design

Each tool is composed as an independent module and registered centrally in `index.ts`.

```typescript
// Each tool is encapsulated in a registerXXXTools function
registerAgendaTools(server);
registerWalletTools(server);
registerTokenTools(server);
```

## 🛠️ Development Patterns and Conventions

### 1. MCP Tool Development Pattern

All MCP tools follow this pattern:

```typescript
export function registerXXXTools(server: McpServer) {
  server.registerTool(
    'tool-name',
    {
      title: 'Tool Title',
      description: new DescriptionBuilder('Tool description')
        .withWalletConnect() // When wallet connection is required
        .toString(),
      inputSchema: {
        // Input validation using Zod schema
        network: z.string().optional().default('mainnet'),
        // Other parameters...
      },
    },
    async (params) => {
      // Tool implementation logic
      try {
        // Execute business logic
        return createSuccessResponse(message);
      } catch (error) {
        return createErrorResponse(`Error: ${error}`);
      }
    }
  );
}
```

### 2. Error Handling Pattern

#### Consistent Response Format
```typescript
// Success response
return createSuccessResponse('Operation completed successfully');

// Error response
return createErrorResponse('Operation failed: specific reason');

// Continue response (when there are next steps)
return {
  content: [{
    type: 'text' as const,
    text: createMCPResponse({
      status: 'continue',
      message: 'Please proceed to next step',
      nextStep: 'next-tool-name',
      callback: 'callback-parameters'
    })
  }]
};
```

#### Error Handling Priority
1. **Input Validation Errors**: Check first
2. **Network/Chain Errors**: Blockchain-related errors
3. **Wallet Connection Errors**: User authentication related
4. **Contract Call Errors**: Smart contract execution errors

### 3. Network Handling Pattern

```typescript
// Get network-specific configuration
const networkAddresses = getNetworkAddresses(network);
const chainId = network === 'sepolia' ? sepolia.id : mainnet.id;

// Get network-specific token addresses
const networkTokens = getNetworkTokens(network);
```

### 4. Wallet Connection Pattern

```typescript
// Use wallet connection check utility
const walletCheck = await checkWalletConnection(
  isCallback,
  callbackCommand
);
if (walletCheck && !walletCheck.isConnected) return walletCheck;
```

## 🧪 Test Writing Guidelines

### 1. Test Structure

```typescript
describe('tool-name.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerXXXTools', () => {
    it('should register all required tools', () => {
      // Tool registration test
    });
  });

  describe('specific-tool', () => {
    it('should handle success case', async () => {
      // Success scenario test
    });

    it('should handle error case', async () => {
      // Error scenario test
    });
  });
});
```

### 2. Mocking Strategy

- **External Dependencies**: Mock external libraries like wagmi, viem
- **Utility Functions**: Mock project utilities to isolate unit tests
- **Response Format**: Mock to match actual response format

### 3. Test Coverage

- Success/failure scenarios for each tool
- Input validation logic
- Network-specific behavior differences
- Error handling logic

## 📝 Coding Style Guide

### 1. TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

### 2. Biome Linter Rules

- **indentWidth**: 2 spaces
- **lineWidth**: 80 characters
- **quoteStyle**: Single quotes
- **semicolons**: Always use
- **trailingCommas**: ES5 style

### 3. Naming Conventions

- **File names**: kebab-case (e.g., `stake-tokens.ts`)
- **Function names**: camelCase (e.g., `registerStakeTools`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `TON_ADDRESS`)
- **Interfaces/Types**: PascalCase (e.g., `McpServer`)

## 🔧 Utility Usage Guide

### 1. DescriptionBuilder

Builder pattern for consistent tool descriptions:

```typescript
new DescriptionBuilder('Base description')
  .withWalletConnect() // Add wallet connection guidance
  .toString()
```

### 2. Response Utilities

```typescript
// Simple responses
createSuccessResponse(message);
createErrorResponse(message);

// Complex responses
createMCPResponse({
  status: 'continue',
  message: 'Message',
  nextStep: 'next-tool',
  callback: 'callback-data'
});
```

### 3. ERC20 Utilities

```typescript
// Token information queries
const balance = await getTokenBalance(tokenAddress, walletAddress, chainId);
const allowance = await getTokenAllowance(tokenAddress, owner, spender, chainId);
const info = await getTokenInfo(tokenAddress, chainId);
```

## ⚠️ Important Considerations and Best Practices

### 1. Security Considerations

- **Input Validation**: Validate all user inputs with Zod schemas
- **Address Validation**: Verify Ethereum address format
- **Amount Validation**: Use BigInt to prevent precision loss
- **Network Validation**: Allow only supported networks

### 2. Performance Optimization

- **Batch Calls**: Use `readContracts` for batch processing multiple contract calls
- **Memory Management**: Apply pagination for large datasets (e.g., 50 agenda limit)
- **Caching**: Utilize memory storage in wagmi configuration

### 3. User Experience

- **Clear Error Messages**: Provide user-understandable error messages
- **Step-by-step Guidance**: Break complex operations into steps
- **Preview Feature**: Provide preview options before execution (e.g., `execute=false`)

### 4. Network Compatibility

- **Multi-network Support**: Support both mainnet and sepolia
- **Network Address Management**: Use `getNetworkAddresses()` function
- **Chain ID Mapping**: Ensure correct chain ID usage

### 5. Code Quality

- **Single Responsibility Principle**: Each function should have one responsibility
- **DRY Principle**: Extract duplicate code into utility functions
- **Explicit Types**: Minimize `any` type usage
- **Error Handling**: Use try-catch blocks for all async functions

## 🚀 Development Workflow

### 1. Adding New Tools

1. Create new file in `src/tools/` directory
2. Implement `registerXXXTools` function
3. Add tool registration to `src/index.ts`
4. Write unit tests (`__tests__/` directory)
5. Add integration tests (if needed)

### 2. Adding Utility Functions

1. Implement function in `src/utils/` directory
2. Add type definitions and JSDoc comments
3. Write unit tests
4. Use in related tools

### 3. Adding Constants

1. Add network-specific constants to `src/constants.ts`
2. Ensure type safety
3. Check compatibility with existing code

## 🔍 Debugging Guide

### 1. Common Issues

- **Network Mismatch**: Check chain ID and network name consistency
- **Wallet Connection Failure**: Verify wallet state and connection process
- **Contract Call Failure**: Check ABI and function signature
- **Type Errors**: Ensure input schema matches actual parameter types

### 2. Logging Strategy

```typescript
// Debug logs during development (remove in production)
console.log('Debug info:', { parameter1, parameter2 });

// Error logs should be included in error responses
return createErrorResponse(`Detailed error: ${error.message}`);
```

## 📚 Additional Learning Resources

- [Model Context Protocol Official Documentation](https://modelcontextprotocol.io/)
- [Wagmi Official Documentation](https://wagmi.sh/)
- [Viem Official Documentation](https://viem.sh/)
- [Zod Schema Validation](https://zod.dev/)
- [Vitest Testing Framework](https://vitest.dev/)

## 🤝 Contribution Guidelines

1. **Code Style**: Follow Biome linter rules
2. **Testing**: Always write tests for new features
3. **Documentation**: Add JSDoc comments for complex logic
4. **Commit Messages**: Write clear and concise commit messages
5. **PR Reviews**: Ensure adherence to above guidelines during code reviews

---

Following these guidelines will help you write consistent and maintainable code. If you have any questions or suggestions for improvement, please share them with the team anytime! 🎉