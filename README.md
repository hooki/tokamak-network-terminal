# Tokamak Network Terminal

## Features

### 🔗 Blockchain Operations
- **Token Management**: Check balances, transfer ERC20 tokens (TON, WTON)
- **Staking Operations**: Stake/unstake tokens to Layer2 operators
- **Token Swapping**: Wrap TON to WTON and unwrap WTON to TON
- **Approval Management**: Approve token spending for smart contracts

### 🏛️ DAO Governance
- **Agenda Management**: Create, view, and manage DAO proposals
- **Committee Interaction**: Access committee information and voting data
- **Proposal Creation**: Submit new governance proposals with multiple actions

### 💼 Wallet Integration
- **Wallet Connection**: Connect wallets via WalletConnect with QR code support
- **Multi-Network**: Support for Ethereum Mainnet and Sepolia testnet
- **Balance Queries**: Check native ETH and ERC20 token balances

## Supported Commands

### Token Operations
```
- send 20 TON to 0x1234567890123456789012345678901234567890
- check my WTON balance
- transfer 5 WTON to alice on sepolia network
- approve 100 TON to 0xContractAddress
- wrap 50 TON to WTON
- unwrap 25 WTON to TON
```

### Staking & Layer2
```
- stake 5 tokens to hammer operator
- unstake 10 tokens from daomaker operator
- check my staked balance on titan operator
- update seigniorage for hammer
- withdraw pending tokens from layer2
```

### DAO Governance
```
- get latest agendas
- create agenda with title "Increase staking rewards"
- get agenda details for ID 123
- check agenda count
```

### Wallet Management
```
- connect wallet
- update seniorage for hammer
- check my withdrawal requests from hammer
- when can I withdraw my tokens from hammer
- get DAO member count
- check if an address is a DAO member
- get DAO members staking information
- get DAO member candidate information
- get DAO member operator manager information
- get DAO candidate's activity reward
- get challenge member information
- execute challenge member
- get agendas from mainnet
- get agenda count
- create a new agenda
```

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

#### 📚 **Documentation Reading Order**

1. **[Protocol Documentation](docs/PROTOCOL.md)** - **Core Document**
   - Complete protocol specification for all tools
   - Actual request/response examples and workflows
   - Essential reference for MCP client developers

2. **[API Reference](docs/API_REFERENCE.md)** - **Developer Reference**
   - Technical reference for server implementation
   - Tool registration patterns and schema definitions
   - Essential reference for MCP server developers

3. **[Testing Guide](docs/TESTING.md)** - Testing Guide
   - Unit/integration test execution methods
   - Troubleshooting guide

4. **[DAO Testing Guide](docs/DAO_TESTING.md)** - DAO-specific Testing
   - DAO functionality integration test guide


### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/tokamak-network-mcp-server.git
cd tokamak-network-mcp-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the project**
```bash
npm run build
```

4. **Configure MCP Client**

For **Claude Desktop**, add to `~/.claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "tokamak-network": {
      "command": "node",
      "args": ["[PATH]/dist/src/index.js"],
      "env": {}
    }
  }
}
```

For **Gemini**, add to `~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "tokamak-network": {
      "command": "node",
      "args": ["[PATH]/dist/src/index.js"],
      "env": {}
    }
  }
}
```

Replace `[PATH]` with the absolute path to your project directory.

## Development

### Available Scripts

```bash
# Build the project
npm run build

# Start the server
npm start

# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Run tests with UI
npm test:ui

# Format code
npm run format

# Lint code
npm run lint

# Check and fix code issues
npm run check
```

### Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests for specific files
npm test src/tools/__tests__/send-token.test.ts

# Run tests in watch mode
npm test --watch
```

### Code Quality

This project uses [Biome](https://biomejs.dev/) for code formatting and linting:

- **Formatting**: 2-space indentation, single quotes, semicolons
- **Linting**: Strict TypeScript rules with error on unused variables
- **Import organization**: Automatic import sorting and type imports

## Architecture

### Project Structure
```
src/
├── tools/           # MCP tool implementations
│   ├── agenda.ts    # DAO governance tools
│   ├── token.ts     # Token management tools
│   ├── stake.ts     # Staking operations
│   ├── wallet.ts    # Wallet connection tools
│   └── __tests__/   # Test files
├── utils/           # Utility functions
│   ├── response.ts  # Response formatting
│   ├── wallet.ts    # Wallet utilities
│   └── erc20.ts     # ERC20 token utilities
├── constants.ts     # Network constants and addresses
└── index.ts         # Main server entry point
```

### Key Technologies
- **MCP SDK**: Model Context Protocol implementation
- **Wagmi**: Ethereum interaction library
- **Viem**: Low-level Ethereum utilities
- **Zod**: Schema validation
- **TypeScript**: Type-safe development
- **Vitest**: Testing framework

## Networks

### Supported Networks
- **Ethereum Mainnet** (chainId: 1)
- **Sepolia Testnet** (chainId: 11155111)

### Supported Tokens
- **TON**: Tokamak Network native token
- **WTON**: Wrapped TON token
- **Custom ERC20**: Any ERC20 token via contract address

## Usage Examples

### Basic Token Transfer
```
User: "Send 10 TON to 0x742d35Cc6634C0532925a3b8D5C9C2c" 
Assistant: I'll help you send 10 TON tokens. First, let me connect your wallet...
```

### Staking Operations
```
User: "Stake 100 TON to the hammer operator"
Assistant: I'll stake 100 TON to the hammer operator. Let me check your balance first...
```

### DAO Governance
```
User: "Show me the latest governance proposals"
Assistant: Here are the latest DAO agendas...
```

## Custom System Prompt

Optimize AI assistant performance with custom system prompts:

```bash
./run_with_system_prompt.sh
```

This removes unnecessary context and focuses on essential blockchain operations, reducing token usage and improving response quality.

### Performance Comparison

| Method | Input Tokens | Output Tokens | Total Cost |
|--------|-------------|---------------|------------|
| Default Gemini | 10,011 | 3 | High |
| Custom Prompt | 6,243 | 3 | 37.6% Lower |

## Documentation

- [Protocol Documentation](docs/PROTOCOL.md) - Complete protocol specification
- [API Reference](docs/API_REFERENCE.md) - Technical API reference with examples
- [Testing Guide](docs/TESTING.md) - Comprehensive testing documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Run the test suite (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

Please follow the established patterns:
- Use Zod for input validation
- Include comprehensive error handling
- Add unit tests for all new features
- Follow the existing code style (enforced by Biome)
- Update documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs/](docs/)

---

Built with ❤️ for the Tokamak Network ecosystem