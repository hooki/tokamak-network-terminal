### Supported Prompt

- stake 5 token to hammer operator
- check my token balance
- connect wallet
- update seniorage for hammer
- approve 5 TON token to blahblah contract

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

### Custom System Prompt

You can tune Gemini's system prompts to optimize performance and minimize token usage on the blockchain network. The improved system prompts remove all but the minimum information necessary for using the tool from the context!
```
./run_with_system_prompt.sh
```

Below are the results of processing the `connect-wallet` prompt.

[ Gemini System Prompt ]
![Before](/img/before.png)

[ Custom System Prompt ]
![Before](/img/after.png)