# DAO Integration Testing Guide

This document provides a comprehensive integration testing guide for DAO functionality in the Tokamak Network Terminal.

## Overview

DAO testing is an integration test that verifies the correct operation of DAO (Decentralized Autonomous Organization) functionality in the Tokamak Network. This test validates all DAO-related features through interaction with the actual blockchain.

### Test Design for MCP Server Characteristics

This test is designed considering the characteristics of the MCP (Model Context Protocol) server:

- **Simple Request-Response Structure**: Each tool operates independently
- **Blockchain Dependency**: Actual performance depends on blockchain RPC responses
- **Tool-Centric Design**: Complex state management or concurrency handling is unnecessary
- **Practical Approach**: Focus on basic functionality verification and error handling

## Test Structure

### Test File Organization

```
tests/
├── test-dao-integration.js              # Basic DAO integration test
├── test-dao-integration-comprehensive.js # Comprehensive DAO integration test
├── run-dao-tests.js                     # Integrated test runner
└── README.md                           # Test overview
```

### Test Categories

#### 1. Basic Integration Test (`test-dao-integration.js`)
- **Purpose**: Verify basic operation of core DAO functionality
- **Scope**:
  - `get-dao-member-count` - Get DAO member count
  - `get-dao-member-candidate-info` - Get DAO member candidate information
  - `get-dao-member-operator-manager-info` - Get DAO member operator manager information
  - `check-dao-membership` - Check DAO membership
  - `get-dao-members-staking-info` - Get DAO staking information

#### 2. Comprehensive Integration Test (`test-dao-integration-comprehensive.js`)
- **Purpose**: Complete verification of all DAO functionality
- **Scope**:
  - **Basic Functions**: All tools listed above
  - `dao-candidate-activity-reward` - Get DAO activity rewards
  - `get-challenge-member-info` - Get challenge member information
  - `execute-challenge-member` - Execute challenge member
  - **Network Testing**: Execute on both mainnet and sepolia
  - **Error Handling**: Invalid addresses, non-existent contracts, etc.
  - **Performance Testing**: Response time measurement
  - **Systematic Test Result Reporting**



## Test Execution Methods

### 1. Prerequisites

```bash
# Build project
npm run build

# Check dependencies
npm install
```

### 2. Individual Test Execution

```bash
# Basic DAO test
node tests/test-dao-integration.js

# Comprehensive DAO test
node tests/test-dao-integration-comprehensive.js


```

## Test Result Interpretation

### Success Indicators
- ✅ **PASS**: Test completed successfully
- **Response Time**: Generally within 1-5 seconds
- **Data Format**: Correct JSON response
- **Network Connection**: Stable blockchain connection

### Failure Indicators
- ❌ **FAIL**: Test failed
- **Error Messages**: Specific failure causes
- **Timeout**: Network delay or server issues
- **Contract Errors**: Blockchain contract call failures

### Performance Indicators
```javascript
// Test result example
{
  "totalTests": 15,
  "passedTests": 14,
  "failedTests": 1,
  "successRate": "93.33%",
  "averageResponseTime": "2.3s",
  "totalDuration": "34.5s"
}
```

## Network-Specific Testing

### Mainnet Testing
- **Purpose**: Verify actual production environment
- **Characteristics**: Uses actual blockchain data
- **Precautions**: Potential gas fee costs

### Sepolia Testing
- **Purpose**: Verify testnet environment
- **Characteristics**: Uses test data
- **Advantages**: Safe testing environment

## Error Handling Tests

### 1. Invalid Address Format
```javascript
// Test case
check-dao-membership({
  address: "invalid-address",
  network: "mainnet"
})
```

### 2. Non-existent Contract
```javascript
// Test case
dao-candidate-activity-reward({
  candidateContract: "0x0000000000000000000000000000000000000000",
  network: "mainnet"
})
```


## Problem Resolution

### Common Issues

#### 1. Build Errors
```bash
❌ Error: dist directory not found
```
**Solution**:
```bash
npm run build
```


## Conclusion

DAO integration testing is an important process to verify that DAO-related features, which are one of the core functionalities of the Tokamak Network Terminal, are working correctly. Through this guide, you can perform systematic and effective DAO testing.

### Key Points
1. **Systematic Test Structure**: Test in order from basic to comprehensive
2. **Network Verification**: Test on both mainnet and sepolia
3. **Error Handling**: Response to various error situations

