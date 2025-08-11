# Testing Guide

This document explains how to test the Tokamak Network MCP Server.

## Test Types

### 1. Unit Tests
- **Command**: `npm run test`
- **Framework**: Vitest
- **Location**: `src/tools/__tests__/` and `src/utils/__tests__/`
- **Purpose**: Verify individual tool and utility function behavior

### 2. Integration Tests
- **Command**: `node tests/test-dao-integration.js`
- **Location**: `tests/`
- **Purpose**: Verify communication with actual MCP server

## Unit Tests

### Environment Setup
```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running Tests
```bash
# Run all tests
npm run test

# Run with UI (view results in browser)
npm run test:ui

# Run once (for CI/CD)
npm run test:run
```

### Test File Structure
```
src/tools/__tests__/          # Tool-related tests
├── agenda.test.ts            # Agenda-related tests
├── approve.test.ts           # Approval-related tests
├── stake.test.ts             # Staking-related tests
├── staking.test.ts           # Staking info-related tests
├── token.test.ts             # Token-related tests
├── ton.test.ts               # TON-related tests
├── unstake.test.ts           # Unstaking-related tests
├── wallet.test.ts            # Wallet-related tests
└── withdraw.test.ts          # Withdrawal-related tests

src/utils/__tests__/          # Utility-related tests
├── approve.test.ts           # Approval utility tests
├── dao.test.ts               # DAO utility tests
├── descriptionBuilder.test.ts # Description builder tests
├── erc20.test.ts             # ERC20 token tests
├── layer2.test.ts            # Layer2-related tests
├── resolve.test.ts           # Address resolution tests
├── response.test.ts          # Response utility tests
├── wagmi-config.test.ts      # Wagmi configuration tests
└── wallet.test.ts            # Wallet utility tests
```

### Tool Test Example
```typescript
// src/tools/__tests__/agenda.test.ts
describe('get-agenda tool tests', () => {
  it('should get agenda details from mainnet', async () => {
    const result = await getAgendaHandler({
      agendaId: '0',
      network: 'mainnet'
    });

    expect(result).toBeDefined();
    expect(result.content[0].type).toBe('text');
  });
});
```

### Utility Test Example
```typescript
// src/utils/__tests__/response.test.ts
describe('Response utilities', () => {
  it('should create success response', () => {
    const response = createSuccessResponse('Test message');
    expect(response.content[0].text).toContain('Test message');
  });

  it('should create error response', () => {
    const response = createErrorResponse('Error message');
    expect(response.content[0].text).toContain('Error message');
  });
});
```

## Integration Tests

### Server Setup
```bash
# Build the project
npm run build

# Run the server
node dist/src/index.js
```

### Running Integration Tests
```bash
# Test DAO integration
node tests/test-dao-integration.js

# Test comprehensive DAO functionality
node tests/test-dao-integration-comprehensive.js
```

### Test Scenarios
1. **Get Latest Agendas**: Retrieve the latest 50 agendas without parameters
2. **Range Queries**: Query specific ranges using start and end parameters
3. **Network-specific Queries**: Test mainnet and sepolia networks
4. **Error Handling**: Verify error responses for invalid parameters
5. **Get Agenda Count**: Retrieve total number of agendas for both networks
6. **Create Agenda**: Preview and execute agenda creation with actions and fees

### DAO Integration Tests
```bash
# Test DAO utilities
node tests/test-dao-integration.js
```

**DAO Test Scenarios:**
1. **Get DAO Member Count**: Retrieve total number of DAO members on both networks
2. **Get DAO Member Info**: Retrieve detailed information about DAO member candidates
3. **Get Operator Manager Info**: Retrieve DAO members with operator manager and manager addresses
4. **Check DAO Membership**: Verify if a specific address is a DAO member
5. **Get Staking Info**: Retrieve detailed staking information for all DAO members
6. **Get Activity Rewards**: Retrieve claimable activity rewards for DAO candidates
7. **Get Challenge Member Info**: Test challenge information retrieval without wallet connection
8. **Execute Challenge Members**: Test DAO member challenge execution with wallet connection
9. **Performance Testing**: Measure response times for blockchain queries
10. **Error Handling**: Test with invalid addresses and network parameters
11. **Cross-Network Testing**: Verify functionality on both mainnet and sepolia

### Test Results Example
```
=== Test 1: Get DAO member count on mainnet ===
✅ Response: {"status":"success","message":"DAO member count on mainnet: 3"}

=== Test 2: Get DAO member candidate info on mainnet ===
✅ Response: {"status":"success","message":"Found 3 DAO members on mainnet. Member count: 3"}

=== Test 3: Get DAO member operator manager info on mainnet ===
✅ Response: {"status":"success","message":"Found 3 DAO members with operator manager info on mainnet. Member count: 3"}

=== Test 4: Get DAO members staking info on mainnet ===
✅ Response: {"status":"success","message":"Found 3 DAO members with staking info on mainnet. Member count: 3"}

=== Test 5: Check DAO membership for test address ===
✅ Response: {"status":"success","message":"Address 0x1234567890123456789012345678901234567890 is not a DAO member on mainnet"}

=== Test 6: Get DAO member count on sepolia ===
✅ Response: {"status":"success","message":"DAO member count on sepolia: 3"}

⏱️ Response time: 2002ms
✅ All DAO integration tests completed
```



## Troubleshooting

### Build Errors
```bash
# Check TypeScript compilation errors
npm run build

# Check linting errors
npm run lint
```

### Test Failures
```bash
# Check detailed error logs
npm run test:run -- --reporter=verbose

# Run specific test
npm run test agenda.test.ts
```







## Reference Materials

- [Vitest Documentation](https://vitest.dev/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Wagmi Documentation](https://wagmi.sh/)