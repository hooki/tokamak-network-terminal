# Tokamak Network Terminal API Reference

## Server Configuration

```typescript
const server = new McpServer({
  name: 'tokamak-network-mcp-server',
  version: '0.0.1',
});
```

## Tool Registration Pattern

All tools follow this registration pattern:

```typescript
server.registerTool(
  'tool-name',
  {
    title: 'Tool Title',
    description: new DescriptionBuilder('Tool description')
      .withWalletConnect()
      .toString(),
    inputSchema: {
      // Zod schema definitions
    },
  },
  async (params) => {
    // Tool implementation
  }
);
```

## Input Schema Types

### Network Parameter
```typescript
network: z
  .string()
  .optional()
  .default('mainnet')
  .describe('The network to use (mainnet, sepolia, etc.)')
```

### Layer2 Identifier
```typescript
layer2Identifier: z
  .string()
  .describe("The Layer2 operator identifier - can be a name (e.g., 'hammer', 'tokamak1') or a full address")
```

### Token Amount
```typescript
tokenAmount: z
  .string()
  .describe('The amount of tokens to stake/unstake')
```

### Address Parameter
```typescript
address: z
  .string()
  .describe('The address to get the balance of')
  .transform((address) => address as Address)
```

### Callback Parameter
```typescript
isCallback: z
  .boolean()
  .optional()
  .describe('If true, indicates this is a callback execution')
```

## Response Format

### Success Response
```typescript
{
  content: [
    {
      type: 'text' as const,
      text: createMCPResponse({
        status: 'success',
        message: 'Operation completed successfully',
      }),
    },
  ],
}
```

### Error Response
```typescript
{
  content: [
    {
      type: 'text' as const,
      text: createMCPResponse({
        status: 'error',
        message: 'Error description',
      }),
    },
  ],
}
```

### Continue Response (for multi-step operations)
```typescript
{
  content: [
    {
      type: 'text' as const,
      text: createMCPResponse({
        status: 'continue',
        message: 'Operation in progress',
        nextStep: 'next-tool-name',
        callback: 'original-command',
      }),
    },
  ],
}
```

## Contract Interactions

### Stake Tokens
```typescript
const tx = await writeContract(wagmiConfig, {
  abi: parseAbi(['function approveAndCall(address, uint256, bytes)']),
  address: networkAddresses.TON_ADDRESS,
  functionName: 'approveAndCall',
  args: [
    networkAddresses.WTON_ADDRESS,
    parseEther(tokenAmount),
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }],
      [networkAddresses.DEPOSIT_MANAGER, targetAddress]
    ),
  ],
});
```

### Unstake Tokens
```typescript
const tx = await writeContract(wagmiConfig, {
  abi: parseAbi(['function requestWithdrawal(address, uint256)']),
  address: networkAddresses.DEPOSIT_MANAGER,
  functionName: 'requestWithdrawal',
  args: [targetAddress, parseUnits(tokenAmount, 27)],
});
```

### Update Seigniorage
```typescript
const tx = await writeContract(wagmiConfig, {
  abi: parseAbi(['function updateSeigniorage()']),
  address: targetAddress,
  functionName: 'updateSeigniorage',
  args: [],
});
```

## Wallet Connection

### checkWalletConnection Function

```typescript
export async function checkWalletConnection(
  isCallback: boolean | undefined,
  callback: string
): Promise<WalletCheckResult | undefined>
```

**Parameters:**
- `isCallback`: Whether this is a callback execution
- `callback`: The callback command to execute after wallet connection

**Return Value:**
- **When wallet is not connected:**
  ```typescript
  {
    isConnected: false,
    content: [
      {
        type: 'text',
        text: createMCPResponse({
          status: 'continue',
          message: isCallback ? 'waiting for wallet connection' : 'please connect your wallet first',
          nextStep: isCallback ? callback : 'connect-wallet',
          executeNextStepAfter: isCallback ? '10s' : undefined,
          callback: isCallback ? undefined : callback,
        })
      }
    ]
  }
  ```

- **When wallet is connected:**
  ```typescript
  {
    isConnected: true,
    content: [
      {
        type: 'text',
        text: createMCPResponse({
          status: 'success',
          message: `Wallet is connected: ${account.address}`
        })
      }
    ]
  }
  ```

**Usage Example:**
```typescript
const walletCheck = await checkWalletConnection(isCallback, callbackCommand);
if (walletCheck && !walletCheck.isConnected) {
  return walletCheck; // Return early if wallet is not connected
}
// Continue with the main logic
```

## Network Configuration

### Mainnet Configuration
```typescript
const mainnetConfig = {
  TON_ADDRESS: '0x2be5e8c109e2197D077D13A82dAead6a9b3433C5',
  WTON_ADDRESS: '0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2',
  DEPOSIT_MANAGER: '0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e',
  SEIG_MANAGER: '0x0b55a0f463b6defb81c6063973763951712d0e5f',
  LAYER2_REGISTRY: '0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b',
  SWAPPROXY: '0x30e65B3A6e6868F044944Aa0e9C5d52F8dcb138d',
  L1BRIDGE_REGISTRY: '0x39d43281A4A5e922AB0DCf89825D73273D8C5BA4',
  LAYER2_MANAGER: '0xD6Bf6B2b7553c8064Ba763AD6989829060FdFC1D'
};
```

### Sepolia Configuration
```typescript
const sepoliaConfig = {
  TON_ADDRESS: '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044',
  WTON_ADDRESS: '0x79e0d92670106c85e9067b56b8f674340dca0bbd',
  DEPOSIT_MANAGER: '0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F',
  SEIG_MANAGER: '0x2320542ae933FbAdf8f5B97cA348c7CeDA90fAd7',
  LAYER2_REGISTRY: '0xA0a9576b437E52114aDA8b0BC4149F2F5c604581',
  SWAPPROXY: '0x690f994b82f001059e24d79292c3c476854b767a',
  L1BRIDGE_REGISTRY: '0x2D47fa57101203855b336e9E61BC9da0A6dd0Dbc',
  LAYER2_MANAGER: '0x58B4C2FEf19f5CDdd944AadD8DC99cCC71bfeFDc'
};
```

## Layer2 Operator Resolution

```typescript
export function resolveLayer2Address(identifier: string, network: string = 'mainnet'): Address {
  const operators = getNetworkLayer2Operators(network);

  return identifier.startsWith('0x')
    ? (identifier as Address)
    : operators[identifier]?.address || (identifier as Address);
}
```

## Error Handling

### Wallet Connection Timeout
```typescript
if (!account?.isConnected) {
  return {
    isConnected: false,
    content: [
      {
        type: 'text' as const,
        text: createMCPResponse({
          status: 'error',
          message: 'Wallet connection timed out',
        }),
      },
    ],
  };
}
```

### Invalid Token Name
```typescript
if (!(tokenAddressOrName in TOKENS)) {
  return {
    content: [
      {
        type: 'text' as const,
        text: createMCPResponse({
          status: 'error',
          message: 'Invalid token name',
        }),
      },
    ],
  };
}
```

### QR Code Generation Failure
```typescript
try {
  qrCodeText = await generateQRCode(uri);
} catch {
  return {
    content: [
      {
        type: 'text' as const,
        text: createMCPResponse({
          status: 'error',
          message: 'QR Code generation failed',
        }),
      },
    ],
  };
}
```

## Utility Functions

### Create MCP Response
```typescript
export function createMCPResponse(response: MCPResponse): string {
  return JSON.stringify(response);
}
```

### Get Network Addresses
```typescript
export function getNetworkAddresses(network: string) {
  return NETWORK_ADDRESSES[network as keyof typeof NETWORK_ADDRESSES] || NETWORK_ADDRESSES.mainnet;
}
```

### Get Network Layer2 Operators
```typescript
export function getNetworkLayer2Operators(network: string): Layer2Operators {
  return LAYER2_OPERATORS[network] || LAYER2_OPERATORS.mainnet;
}
```

## Type Definitions

```typescript
interface Layer2Operator {
  name: string;
  address: Address;
  description: string;
}

interface MCPResponse {
  status: string;
  message: string;
  nextStep?: string;
  callback?: string;
  executeNextStepAfter?: string;
}

type Layer2Operators = Record<string, Layer2Operator>;
```

## Agenda Tools

### Get Multiple Agendas
```typescript
server.registerTool(
  'get-agendas',
  {
    title: 'Get multiple agendas',
    description: new DescriptionBuilder(
      'Get multiple agendas within a specified range. If no range is specified, returns the latest 50 agendas. Maximum 50 agendas per request. Parameters: start (optional) - Starting agenda ID, end (optional) - Ending agenda ID, network (optional) - Network to query (mainnet, sepolia).'
    ).toString(),
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      start: z.string().optional().describe('Starting agenda ID (inclusive). If not provided, will get latest agendas'),
      end: z.string().optional().describe('Ending agenda ID (inclusive). If not provided, will get up to 50 agendas from start'),
    },
  },
  async ({ start, end, network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Get Agenda Count
```typescript
server.registerTool(
  'get-agenda-count',
  {
    title: 'Get total agenda count',
    description: new DescriptionBuilder(
      'Get the total number of agendas on the specified network. This returns the count of all agendas that have been created.'
    ).toString(),
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
    },
  },
  async ({ network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Create Agenda
```typescript
server.registerTool(
  'create-agenda',
  {
    title: 'Create a new agenda',
    description: new DescriptionBuilder(
      'Create a new agenda with specified actions. Use execute=true to submit transaction, execute=false for preview only. Requires TON tokens for fees.'
    ).toString(),
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      actions: z.array(z.object({
        target: z.string().describe('Target contract address'),
        functionName: z.string().describe('Function signature (e.g., "transfer(address,uint256)")'),
        args: z.array(z.any()).describe('Function arguments array'),
      })).describe('Array of actions to execute'),
      agendaUrl: z.string().optional().describe('URL for agenda notice and snapshot (Version 2 only, optional)'),
              execute: z.boolean().optional().default(true).describe('Set to true to execute the transaction, false for preview only'),
    },
  },
        async ({ actions, agendaUrl, network = 'mainnet', execute = true }) => {
    // Implementation with preview and execute modes
  }
);
```

## DAO Tools

### Get DAO Member Count
```typescript
server.registerTool(
  'get-dao-member-count',
  {
    title: 'Get DAO member count',
    description: 'Get the total number of DAO members on the specified network.',
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
    },
  },
  async ({ network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Get DAO Member Candidate Info
```typescript
server.registerTool(
  'get-dao-member-candidate-info',
  {
    title: 'Get DAO member candidate information',
    description: 'Get detailed information about DAO member candidates including their contract addresses and staking details.',
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
    },
  },
  async ({ network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Get DAO Member Operator Manager Info
```typescript
server.registerTool(
  'get-dao-member-operator-manager-info',
  {
    title: 'Get DAO member operator manager information',
    description: 'Get detailed information about DAO members including their operator manager and manager addresses.',
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
    },
  },
  async ({ network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Check DAO Membership
```typescript
server.registerTool(
  'check-dao-membership',
  {
    title: 'Check DAO membership',
    description: 'Check if a specific address is a DAO member (either as candidate or manager).',
    inputSchema: {
      address: z.string().describe('The address to check for DAO membership'),
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
    },
  },
  async ({ address, network = 'mainnet' }) => {
    // Implementation
  }
);
```

### Get DAO Members Staking Info
```typescript
server.registerTool(
  'get-dao-members-staking-info',
  {
    title: 'Get DAO members staking information',
    description: 'Get detailed staking information for all DAO members including total staked, memo, and claimable rewards.',
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      includeOperatorManager: z.boolean().optional().default(false).describe('Whether to include operator manager information'),
    },
  },
  async ({ network = 'mainnet', includeOperatorManager = false }) => {
    // Implementation
  }
);
```

### Get DAO Candidate Activity Reward
```typescript
server.registerTool(
  'dao-candidate-activity-reward',
  {
    title: 'Get DAO candidate\'s activity reward',
    description: new DescriptionBuilder(
      'Get the claimable activity reward for a specific DAO candidate contract. Use claim=true to claim the reward (requires wallet connection), claim=false to only check the reward amount.'
    )
      .withWalletConnect()
      .toString(),
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      candidateContract: z.string().describe('The candidate contract address to check for activity rewards'),
      claim: z.boolean().optional().default(false).describe('Whether to claim the reward (requires wallet connection if true)'),
    },
  },
  async ({ network = 'mainnet', candidateContract, claim = false }) => {
    // Implementation
  }
);
```

### Get Challenge Member Info
```typescript
server.registerTool(
  'get-challenge-member-info',
  {
    title: 'Get challenge member information',
    description: 'Get information about challenging a DAO committee member including required stake and eligibility. No wallet connection required.',
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      memberIndex: z.number().describe('The index of the current DAO member slot to challenge'),
      challengerCandidate: z.string().describe('The address of the challenger candidate contract'),
    },
  },
  async ({ network = 'mainnet', memberIndex, challengerCandidate }) => {
    // Implementation
  }
);
```

### Execute Challenge Member
```typescript
server.registerTool(
  'execute-challenge-member',
  {
    title: 'Execute challenge member',
    description: new DescriptionBuilder(
      'Execute a challenge against a DAO committee member by staking the required amount of tokens. The challenger must have more stake than the current member.'
    )
      .withWalletConnect()
      .toString(),
    inputSchema: {
      network: z.string().optional().default('mainnet').describe('The network to use (mainnet, sepolia, etc.)'),
      memberIndex: z.number().describe('The index of the current DAO member slot to challenge'),
      challengerCandidate: z.string().describe('The address of the challenger candidate contract'),
    },
  },
  async ({ network = 'mainnet', memberIndex, challengerCandidate }) => {
    // Implementation
  }
);
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `@wagmi/core`: Ethereum wallet integration
- `viem`: Ethereum utilities
- `zod`: Schema validation
- `qrcode-terminal`: QR code generation
- `@walletconnect/modal`: WalletConnect integration