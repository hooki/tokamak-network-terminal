# Testing Guide

This document explains how to test the Tokamak Network MCP Server.

## Test Types

### 1. Unit Tests
- **Command**: `npm run test`
- **Framework**: Vitest
- **Location**: `src/tools/__tests__/` and `src/utils/__tests__/`
- **Purpose**: Verify individual tool and utility function behavior

### 2. Integration Tests
- **Command**: `node tests/test-get-agendas.js`
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
# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

### Running Integration Tests
```bash
# Test get-agendas tool
node tests/test-get-agendas.js
```

### Test Scenarios
1. **Get Latest Agendas**: Retrieve the latest 50 agendas without parameters
2. **Range Queries**: Query specific ranges using start and end parameters
3. **Network-specific Queries**: Test mainnet and sepolia networks
4. **Error Handling**: Verify error responses for invalid parameters
5. **Get Agenda Count**: Retrieve total number of agendas for both networks

### Test Results Example
```
=== Test 1: Get latest agendas ===
✅ Response: 📋 **Agendas 0-15 on mainnet**
Committee Version: undefined
Total Found: 16

=== Test 2: Get agendas from start=0 ===
✅ Response: 📋 **Agendas 0-15 on mainnet**

=== Test 3: Get agendas with range start=0, end=5 ===
✅ Response: 📋 **Agendas 0-5 on mainnet**
Total Found: 6

=== Test 4: Get agendas on sepolia network ===
✅ Response: 📋 **Agendas 131-180 on sepolia**
Committee Version: 2.0.0
Total Found: 50

=== Test 5: Get agenda count on mainnet ===
✅ Response: 📊 **Agenda Count on mainnet**
Total Agendas: 16
Committee Version: undefined
Range: 0-15

=== Test 6: Get agenda count on sepolia ===
✅ Response: 📊 **Agenda Count on sepolia**
Total Agendas: 181
Committee Version: 2.0.0
Range: 0-180
```

## Test Environment Requirements

### Prerequisites
- Node.js 18+
- npm or yarn
- Internet connection (for blockchain network access)

### Network Access
- **Mainnet**: Real Ethereum mainnet data
- **Sepolia**: Testnet data
- **RPC Endpoints**: Automatically configured

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

### Server Connection Issues
```bash
# Check port usage
lsof -i :3000

# Check process status
ps aux | grep "node dist/src/index.js"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test:run
```

## Adding New Tests

### Adding Unit Tests
```typescript
// src/tools/__tests__/agenda.test.ts
it('should handle get-agendas tool', async () => {
  const result = await getAgendasHandler({
    start: '0',
    end: '5',
    network: 'mainnet'
  });

  expect(result).toBeDefined();
  expect(result.content[0].type).toBe('text');
});
```

### Adding Integration Tests
```javascript
// tests/test-custom.js
console.log('=== Custom Test ===');
sendRequest('tools/call', {
  name: 'get-agendas',
  arguments: { start: '0', end: '10' }
});
```

## Performance Testing

### Large Data Tests
```bash
# Test 50 agenda retrieval
node tests/test-get-agendas.js

# Measure response time
time node tests/test-get-agendas.js
```

### Memory Usage Monitoring
```bash
# Monitor memory usage
node --inspect tests/test-get-agendas.js
```

## Reference Materials

- [Vitest Documentation](https://vitest.dev/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Wagmi Documentation](https://wagmi.sh/)