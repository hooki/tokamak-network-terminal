# Tokamak Network Terminal Protocol Documentation

## Overview

The Tokamak Network Terminal is an MCP (Model Context Protocol) server that provides tools for interacting with the Tokamak Network Layer2 ecosystem. This document describes all available tools and their input/output schemas.

## Supported Networks

- **mainnet**: Main Ethereum network
- **sepolia**: Sepolia testnet

## Tool Categories

### 1. Wallet Tools

#### `connect-wallet`
**Title**: Connect Wallet
**Description**: Connect to a wallet using WalletConnect
**Input Schema**:
- `callback` (optional): The callback to call after connecting the wallet

**Client Request (Input)**:
```json
{
  "callback": "stake-tokens hammer 5"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"continue\",\"message\":\"QR code generated successfully\",\"nextStep\":\"wait-wallet-connect\",\"callback\":\"stake-tokens hammer 5\"}"
    },
    {
      "type": "text",
      "text": "Please scan the QR code with your wallet to connect\n\n[QR Code Displayed]"
    }
  ]
}
```

#### `wait-wallet-connect`
**Title**: Waiting for wallet connection
**Description**: Wait for wallet connection to complete
**Input Schema**:
- `callback` (optional): The callback to call after connecting the wallet
- `timeout` (optional, default: 60000): Timeout in milliseconds

**Client Request (Input)**:
```json
{
  "callback": "stake-tokens hammer 5",
  "timeout": 30000
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"continue\",\"message\":\"Wallet connected: 0x1234...\",\"nextStep\":\"stake-tokens hammer 5\"}"
    }
  ]
}
```

#### Wallet Connection Check
**Function**: `checkWalletConnection(isCallback, callback)`
**Description**: Check if wallet is connected and return appropriate response

**Return Values**:

**When wallet is not connected:**
```json
{
  "isConnected": false,
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"continue\",\"message\":\"please connect your wallet first\",\"nextStep\":\"connect-wallet\",\"callback\":\"stake-tokens hammer 5\"}"
    }
  ]
}
```

**When wallet is connected:**
```json
{
  "isConnected": true,
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Wallet is connected: 0x1234567890123456789012345678901234567890\"}"
    }
  ]
}
```

### 2. Token Tools

#### `get-ethereum-balance`
**Title**: Get Ethereum (Native) token balance
**Description**: Get the Ethereum (Native) token balance of a specific address
**Input Schema**:
- `address`: The address to get the balance of
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"0x1234567890123456789012345678901234567890 balance is 1.5 on mainnet\"}"
    }
  ]
}
```

#### `get-token-balance`
**Title**: Get token balance
**Description**: Get the token balance of a specific address. You can specify the token by name (e.g., "TON", "WTON") or by address
**Input Schema**:
- `address`: The address to get the balance of
- `tokenAddressOrName` (optional): The token address or name to get the balance of (e.g., "TON", "WTON")
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "tokenAddressOrName": "TON",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"0x1234567890123456789012345678901234567890 balance is 100.5 on mainnet\"}"
    }
  ]
}
```

### 3. Stake Tools

#### `stake-tokens`
**Title**: Stake tokens to Layer2 operator
**Description**: Deposit and stake a specified amount of tokens to a Layer2 network operator. You can specify the operator by name (e.g., 'hammer', 'level123') or by address
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address
- `tokenAmount`: The amount of tokens to stake
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "network": "mainnet",
  "layer2Identifier": "hammer",
  "tokenAmount": "5"
}
```

**Server Response Examples**:

**When wallet is not connected**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"continue\",\"message\":\"please connect your wallet first\",\"nextStep\":\"connect-wallet\",\"callback\":\"stake-tokens hammer 5 --network mainnet\"}"
    }
  ]
}
```

**When wallet is connected**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Stake tokens successfully on mainnet (tx: 0x1234...)\"}"
    }
  ]
}
```

#### `update-seigniorage`
**Title**: Update seigniorage
**Description**: Update the seigniorage of the token for a Layer2 operator
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "network": "mainnet",
  "layer2Identifier": "hammer"
}
```

### 3. Staking Information Tools

#### `get-staked-balance`
**Title**: Get staked balance for Layer2 operator(s)
**Description**: Get the amount of tokens staked to one or multiple Layer2 operators. You can specify operators by name (e.g., 'hammer', 'tokamak1', 'level') or by address. No wallet connection required.
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `layer2Identifiers`: The Layer2 operator identifier(s) - can be a single name/address or array of names/addresses (e.g., 'hammer', ['hammer', 'level', 'tokamak1'])
- `walletAddress`: The wallet address to check

**Client Request (Input) - Single Operator**:
```json
{
  "layer2Identifiers": "hammer",
  "network": "mainnet",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Client Request (Input) - Multiple Operators**:
```json
{
  "layer2Identifiers": ["hammer", "level", "tokamak1"],
  "network": "mainnet",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Server Response (Output) - Single Operator**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"100.5 staked WTON to hammer on mainnet (address: 0x1234567890123456789012345678901234567890)\"}"
    }
  ]
}
```

**Server Response (Output) - Multiple Operators**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Staked amounts for 0x1234567890123456789012345678901234567890 on mainnet:\\n• hammer: 100.5 WTON\\n• level: 50.25 WTON\\n• tokamak1: 75.0 WTON\"}"
    }
  ]
}
```

#### `get-total-staked`
**Title**: Get total staked amount for user across all Layer2 operators
**Description**: Get the total amount of tokens staked by a specific user across all Layer2 operators. No wallet connection required.
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `walletAddress`: The wallet address to check

**Client Request (Input)**:
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Total 1500.75 WTON staked by 0x1234567890123456789012345678901234567890 across all Layer2 operators on mainnet\"}"
    }
  ]
}
```

#### `get-total-staked-layer`
**Title**: Get total staked amount for Layer2 operator
**Description**: Get the total amount of tokens staked to a specific Layer2 operator across all users. No wallet connection required.
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1', 'level') or a full address

**Client Request (Input)**:
```json
{
  "layer2Identifier": "hammer",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Total 1500.75 tokens staked to hammer on mainnet\"}"
    }
  ]
}
```

### 4. Agenda Tools

#### `get-agenda`
**Title**: Get agenda details
**Description**: Get detailed information about a specific agenda. This includes agenda status, voting period, and other relevant details. Supports both Version 1 (basic) and Version 2 (advanced) committee systems.
**Input Schema**:
- `agendaId` (required): The agenda ID to get details for
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "agendaId": "0",
  "network": "mainnet"
}
```

**Server Response (Output) - Version 1**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Agenda 0 Details on mainnet (Version 1):\\n• Status: Active\\n• Created: 2024-01-15T10:30:00.000Z\\n• Notice End: 2024-01-20T10:30:00.000Z\\n• Voting Period: 604800 seconds\\n• Voting Start: 2024-01-20T10:30:00.000Z\\n• Voting End: 2024-01-27T10:30:00.000Z\\n• Executable Limit: 2024-02-03T10:30:00.000Z\\n• Executed: No\\n• Executed Time: Not set\\n• Yes Votes: 1000\\n• No Votes: 200\\n• Abstain Votes: 50\\n• Total Votes: 1250\\n• Voters Count: 15\\n• Voters: 1. 0x1234567890123456789012345678901234567890\\n   2. 0x2345678901234567890123456789012345678901\"}"
    }
  ]
}
```

**Server Response (Output) - Version 2**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Agenda 0 Details on mainnet (Committee v2.0.0):\\n• Status: VOTING\\n• Result: ACCEPT\\n• Created: 2024-01-15T10:30:00.000Z\\n• Notice End: 2024-01-20T10:30:00.000Z\\n• Voting Period: 604800 seconds\\n• Voting Start: 2024-01-20T10:30:00.000Z\\n• Voting End: 2024-01-27T10:30:00.000Z\\n• Executable Limit: 2024-02-03T10:30:00.000Z\\n• Executed: No\\n• Executed Time: Not set\\n• Yes Votes: 1000\\n• No Votes: 200\\n• Abstain Votes: 50\\n• Total Votes: 1250\\n• Voters Count: 15\\n• Voters: 1. 0x1234567890123456789012345678901234567890\\n   2. 0x2345678901234567890123456789012345678901\"}"
    }
  ]
}
```

**Error Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"error\",\"message\":\"Agenda 999 not found on mainnet\"}"
    }
  ]
}
```

#### `get-agendas`
**Title**: Get multiple agendas
**Description**: Get multiple agendas within a specified range. If no range is specified, returns the latest 50 agendas. Maximum 50 agendas per request. Parameters: start (optional) - Starting agenda ID, end (optional) - Ending agenda ID, network (optional) - Network to query (mainnet, sepolia).
**Input Schema**:
- `start` (optional): Starting agenda ID (inclusive). If not provided, will get latest agendas
- `end` (optional): Ending agenda ID (inclusive). If not provided, will get up to 50 agendas from start
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input) - Latest 50 agendas**:
```json
{
  "network": "mainnet"
}
```

**Client Request (Input) - Range query**:
```json
{
  "start": "0",
  "end": "10",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"📋 **Agendas 0-10 on mainnet**\\nCommittee Version: undefined\\nTotal Found: 11\\n\\n**Agenda 10**\\n• Status: Active\\n• Created: 2024-01-15T10:30:00.000Z\\n• Notice End: 2024-01-20T10:30:00.000Z\\n• Voting Period: 604800 seconds\\n• Voting Start: 2024-01-20T10:30:00.000Z\\n• Voting End: 2024-01-27T10:30:00.000Z\\n• Executable Limit: 2024-02-03T10:30:00.000Z\\n• Executed: No\\n• Executed Time: Not set\\n• Yes Votes: 1000\\n• No Votes: 200\\n• Abstain Votes: 50\\n• Total Votes: 1250\\n• Voters Count: 15\\n\\n**Agenda 9**\\n• Status: Active\\n• Created: 2024-01-14T10:30:00.000Z\\n• Notice End: 2024-01-19T10:30:00.000Z\\n• Voting Period: 604800 seconds\\n• Voting Start: 2024-01-19T10:30:00.000Z\\n• Voting End: 2024-01-26T10:30:00.000Z\\n• Executable Limit: 2024-02-02T10:30:00.000Z\\n• Executed: No\\n• Executed Time: Not set\\n• Yes Votes: 800\\n• No Votes: 150\\n• Abstain Votes: 30\\n• Total Votes: 980\\n• Voters Count: 12\"}"
    }
  ]
}
```

**Error Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"error\",\"message\":\"Start ID 100 is out of range. Total agendas: 16\"}"
    }
  ]
}
```

#### `get-agenda-count`
**Title**: Get total agenda count
**Description**: Get the total number of agendas on the specified network. This returns the count of all agendas that have been created.
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"📊 **Agenda Count on mainnet**\\nTotal Agendas: 16\\nCommittee Version: undefined\\nRange: 0-15\"}"
    }
  ]
}
```

### 5. Unstake Tools

#### `unstake-tokens`
**Title**: Unstake tokens from Layer2 operator
**Description**: Unstake a specified amount of tokens from a Layer2 network operator. You can specify the operator by name (e.g., "hammer", "arbitrum") or by address
**Input Schema**:
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address
- `tokenAmount`: The amount of tokens to unstake
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "layer2Identifier": "hammer",
  "tokenAmount": "5",
  "network": "mainnet"
}
```

### 5. Withdraw Tools

#### `get-current-block-number`
**Title**: Get current block number
**Description**: Get the current block number for the specified network. This is useful for calculating withdrawal availability. No wallet connection required.
**Input Schema**:
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Current block number on mainnet: 18456789\\nCurrent time (UTC): 2024-01-15T10:30:45.123Z\"}"
    }
  ]
}
```

#### `pending-withdrawal-requests`
**Title**: Get pending withdrawal requests
**Description**: Get pending withdrawal requests from a Layer2 network operator for a specific wallet address. You can specify the operator by name (e.g., "hammer", "tokamak1", "level") or by address. No wallet connection required.
**Input Schema**:
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., "hammer", "tokamak1", "level") or a full address
- `walletAddress`: The wallet address to check for withdrawal requests
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)

**Client Request (Input)**:
```json
{
  "layer2Identifier": "hammer",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"[{\\\"withdrawableBlockNumber\\\":\\\"12345678\\\",\\\"amount\\\":\\\"100.5\\\",\\\"processed\\\":false}]\"}"
    }
  ]
}
```

#### `withdraw-tokens`
**Title**: Withdraw tokens
**Description**: Withdraw tokens from a Layer2 network operator
**Input Schema**:
- `layer2Identifier`: The Layer2 operator identifier - can be a name (e.g., "hammer", "tokamak1", "level") or a full address
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "layer2Identifier": "hammer",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Withdraw tokens successfully on mainnet (tx: 0x1234...)\"}"
    }
  ]
}
```

### 6. TON Tools

#### `wrap-ton`
**Title**: Wrap TON tokens to WTON
**Description**: Wrap(also known as Swap, Convert) a specified amount of TON tokens to WTON
**Input Schema**:
- `tokenAmount`: The amount of tokens to wrap
- `transferToAddress` (optional): The destination address to send the wrapped tokens to
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "tokenAmount": "10",
  "transferToAddress": "0x1234567890123456789012345678901234567890",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Wrap TON tokens to WTON successfully on mainnet (tx: 0x1234...)\"}"
    }
  ]
}
```

#### `unwrap-wton`
**Title**: Unwrap WTON tokens to TON
**Description**: Unwrap(also known as Swap, Convert) a specified amount of WTON tokens to TON
**Input Schema**:
- `tokenAmount`: The amount of tokens to unwrap
- `transferToAddress` (optional): The destination address to send the unwrapped tokens to
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "tokenAmount": "10",
  "transferToAddress": "0x1234567890123456789012345678901234567890",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Unwrap WTON tokens to TON successfully on mainnet (tx: 0x1234...)\"}"
    }
  ]
}
```

### 7. Approve Tools

#### `approve-token`
**Title**: Approve token spending
**Description**: Approve a spender to spend tokens on behalf of the owner
**Input Schema**:
- `token`: The token address or name to approve spending for (e.g., "TON", "WTON", or a contract address)
- `spender`: The address or name of the spender that will be approved to spend the tokens
- `amount`: The amount of tokens to approve. Use "max" for maximum approval or specify a number
- `network` (optional, default: 'mainnet'): The network to use (mainnet, sepolia, etc.)
- `decimals` (optional): The number of decimals of the token. If not provided, will read it from the token contract
- `callback` (optional): The callback to call after approving the token
- `isCallback` (optional): If true, indicates this is a callback execution

**Client Request (Input)**:
```json
{
  "token": "TON",
  "spender": "0x1234567890123456789012345678901234567890",
  "amount": "100",
  "network": "mainnet"
}
```

**Server Response (Output)**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Approve 100 tokens from TON to 0x1234567890123456789012345678901234567890 successfully on mainnet (tx: 0x1234...)\"}"
    }
  ]
}
```

## Layer2 Operators

### Mainnet Operators
- `tokamak1`: Tokamak Network Layer2 operator
- `DXM_Corp`: DXM Corp Layer2 operator
- `DSRV`: DSRV Layer2 operator
- `Talken`: Talken Layer2 operator
- `staked`: Staked Layer2 operator
- `level`: Level Layer2 operator
- `decipher`: Decipher Layer2 operator
- `DeSpread`: DeSpread Layer2 operator
- `Danal_Fintech`: Danal Fintech Layer2 operator
- `Hammer`: Hammer DAO Layer2 operator

### Sepolia Operators
- `TokamakOperator_v2`: Tokamak Network Layer2 operator (Sepolia)
- `poseidon`: Poseidon Layer2 operator (Sepolia)

## Response Format

All tools return responses in the following format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"message\":\"Operation completed successfully\"}"
    }
  ]
}
```

### Response Status Types
- `success`: Operation completed successfully
- `error`: Operation failed
- `continue`: Operation in progress, waiting for next step

## Error Handling

When a wallet is not connected and a transaction is attempted, the system will:
1. Automatically execute the `connect-wallet` tool
2. Wait for wallet connection
3. Re-execute the original tool after connection

## Network Configuration

The system supports multiple networks with different contract addresses:

### Mainnet
- TON_ADDRESS: `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5`
- WTON_ADDRESS: `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2`
- DEPOSIT_MANAGER: `0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e`

### Sepolia
- TON_ADDRESS: `0xa30fe40285b8f5c0457dbc3b7c8a280373c40044`
- WTON_ADDRESS: `0x79e0d92670106c85e9067b56b8f674340dca0bbd`
- DEPOSIT_MANAGER: `0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F`

## Usage Examples

### Basic Staking (Wallet Connected)
**Client Request (Input)**:
```json
{
  "tool": "stake-tokens",
  "input": {
    "network": "mainnet",
    "layer2Identifier": "hammer",
    "tokenAmount": "5"
  }
}
```

### Staking with Auto Wallet Connection
When wallet is not connected, the system automatically handles the flow:

1. **User executes**: `stake-tokens hammer 5 --network mainnet`
2. **System responds**:
   ```json
   {
     "status": "continue",
     "message": "please connect your wallet first",
     "nextStep": "connect-wallet",
     "callback": "stake-tokens hammer 5 --network mainnet"
   }
   ```
3. **System automatically calls**: `connect-wallet` with callback
4. **User scans QR code** and connects wallet
5. **System automatically executes**: `stake-tokens hammer 5 --network mainnet`

### Check Balance
**Client Request (Input)**:
```json
{
  "tool": "get-token-balance",
  "input": {
    "address": "0x1234567890123456789012345678901234567890",
    "tokenAddressOrName": "TON",
    "network": "mainnet"
  }
}
```

### Check Balance on Sepolia
**Client Request (Input)**:
```json
{
  "tool": "get-token-balance",
  "input": {
    "address": "0x1234567890123456789012345678901234567890",
    "tokenAddressOrName": "TON",
    "network": "sepolia"
  }
}
```

### Manual Wallet Connection
**Client Request (Input)**:
```json
{
  "tool": "connect-wallet",
  "input": {
    "callback": "stake-tokens hammer 5 --network mainnet"
  }
}
```

## Workflow Examples

### Complete Staking Workflow

1. **Initial Client Request (Input)**:
   ```json
   {
     "tool": "stake-tokens",
     "input": {
       "layer2Identifier": "hammer",
       "tokenAmount": "5",
       "network": "mainnet"
     }
   }
   ```

2. **If wallet not connected, Server Response (Output)**:
   ```json
   {
     "content": [
       {
         "type": "text",
         "text": "{\"status\":\"continue\",\"message\":\"please connect your wallet first\",\"nextStep\":\"connect-wallet\",\"callback\":\"stake-tokens hammer 5 --network mainnet\"}"
       }
     ]
   }
   ```

3. **System automatically calls connect-wallet**:
   ```json
   {
     "tool": "connect-wallet",
     "input": {
       "callback": "stake-tokens hammer 5 --network mainnet"
     }
   }
   ```

4. **QR code is displayed for wallet connection**

5. **After wallet connection, system automatically executes**:
   ```json
   {
     "tool": "stake-tokens",
     "input": {
       "layer2Identifier": "hammer",
       "tokenAmount": "5",
       "network": "mainnet",
       "isCallback": true
     }
   }
   ```

6. **Final Server Response (Output)**:
   ```json
   {
     "content": [
       {
         "type": "text",
         "text": "{\"status\":\"success\",\"message\":\"Stake tokens successfully on mainnet (tx: 0x1234...)\"}"
       }
     ]
   }
   ```
