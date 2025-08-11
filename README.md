### Supported Prompt

- I want to stake 5 token to hammer operator
- check my token balance
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
When executing the prompt to send a transaction, if the wallet is not connected, first execute the connect-wallet tool, and then execute the tool again after 10 seconds.

### Documentation

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

### Installation

Build MCP server
```
npm run build
```

Add the following code to `~/.gemini/settings.json`. `PATH` is the location of `tokamak-network-terminal`.
```
  "mcpServers": {
    "tokamak-network": {
      "command": "node",
      "args": ["[PATH]/dist/src/index.js"],
      "env": {}
    }
  }
```
