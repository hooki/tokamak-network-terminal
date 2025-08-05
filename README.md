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
- get agendas from mainnet
- get agenda count
- create a new agenda
When executing the prompt to send a transaction, if the wallet is not connected, first execute the connect-wallet tool, and then execute the tool again after 10 seconds.

### Documentation

- [Protocol Documentation](docs/PROTOCOL.md) - Complete protocol specification with all available tools
- [API Reference](docs/API_REFERENCE.md) - Technical API reference with code examples
- [Testing Guide](docs/TESTING.md) - Testing documentation including DAO integration tests

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
