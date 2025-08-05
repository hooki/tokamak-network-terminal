### Supported Prompt

- I want to stake 5 token to hammer operator
- check my token balance
- connect wallet
- update seniorage for hammer

When executing the prompt to send a transaction, if the wallet is not connected, first execute the connect-wallet tool, and then execute the tool again after 10 seconds.

### Documentation

- [Protocol Documentation](docs/PROTOCOL.md) - Complete protocol specification with all available tools
- [API Reference](docs/API_REFERENCE.md) - Technical API reference with code examples

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
