import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { metaMask } from '@wagmi/connectors';
import { connect, getAccount, readContract, writeContract } from '@wagmi/core';
import qrcode from 'qrcode-terminal';
import { encodeAbiParameters, formatEther, parseAbi, parseEther } from 'viem';
import { z } from 'zod';
import { wagmiConfig } from './wagmi-config.js';

const server = new McpServer({
  name: 'tokamak-network-mcp-server',
  version: '0.0.1',
});

async function connectWallet() {
  return new Promise((resolve, reject) => {
    const connectorFn = metaMask({
      headless: true,
    });
    const connector = wagmiConfig._internal.connectors.setup(connectorFn);
    connector.emitter.on('message', (payload) => {
      if (payload.type === 'display_uri') {
        const uri = payload.data;
        resolve(uri);
      }
    });

    connect(wagmiConfig, { connector }).catch((error) => {
      reject(error);
    });
  });
}

async function checkWalletConnection(
  isCallback: boolean | undefined,
  callback: string
) {
  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    if (isCallback)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'not_yet_connected',
              message: 'waiting for wallet connection',
              nextStep: callback,
              executeNextStepAfter: '10s',
            }),
          },
        ],
      };
    else
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'wallet_required',
              message: 'please connect your wallet first',
              nextStep: 'connect-wallet',
              callback: callback,
            }),
          },
        ],
      };
  }

  return account;
}

server.registerTool(
  'connect-wallet',
  {
    title: 'Connect Wallet',
    description: 'Connect to a wallet',
    inputSchema: {
      callback: z
        .string()
        .optional()
        .describe('The callback to call after connecting the wallet'),
    },
  },
  async ({ callback }) => {
    const uri = await connectWallet();
    let qrCodeText = '';
    try {
      qrCodeText = await new Promise((resolve) => {
        qrcode.generate(uri as string, { small: true }, (qrString: string) => {
          resolve(qrString);
        });
      });
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
      qrCodeText = '❌ QR 코드 생성 실패';
    }

    return {
      content: [
        {
          type: 'text',
          text: `${JSON.stringify({
            status: 'wallet_connect_qr_code',
            message: 'Wallet Connect QR Code',
            nextStep: callback,
            executeNextStepAfter: '10s',
          })}\n\n${qrCodeText}`,
        },
      ],
    };
  }
);

const layer2Operators: Record<
  string,
  { name: string; address: string; description: string }
> = {
  hammer: {
    name: 'hammer',
    address: '0xCBeF7Cc221c04AD2E68e623613cc5d33b0fE1599',
    description: 'Tokamak Network Layer2 operator',
  },
};

server.registerTool(
  'get-token-balance',
  {
    title: 'Get token balance',
    description: 'Get the balance of your wallet',
  },
  async () => {
    const result = getAccount(wagmiConfig);
    if (!result.isConnected) {
      return {
        content: [{ type: 'text', text: 'Please connect your wallet' }],
      };
    }

    const balance = await readContract(wagmiConfig, {
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      address: '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044',
      functionName: 'balanceOf',
      args: [result.address as `0x${string}`],
    });

    return {
      content: [
        {
          type: 'text',
          text: `Your balance is ${formatEther(balance)}`,
        },
      ],
    };
  }
);

server.registerTool(
  'stake-tokens',
  {
    title: 'Stake tokens to Layer2 operator',
    description:
      "Deposit and stake a specified amount of tokens to a Layer2 network operator. You can specify the operator by name (e.g., 'hammer', 'level123') or by address. This tool allows you to participate in Layer2 staking by transferring tokens from your wallet to the specified Layer2 operator for staking purposes. The staked tokens will earn rewards based on the network's staking mechanism.",
    inputSchema: {
      layer2Identifier: z
        .string()
        .describe(
          "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address"
        ),
      tokenAmount: z.string().describe('The amount of tokens to stake'),
      isCallback: z
        .boolean()
        .optional()
        .describe(
          'If true, the callback will be called after the transaction is confirmed'
        ),
    },
  },
  async ({ layer2Identifier, tokenAmount, isCallback }) => {
    const tokenAddress = '0xa30fe40285b8f5c0457dbc3b7c8a280373c40044';
    const WTON = '0x79e0d92670106c85e9067b56b8f674340dca0bbd';
    const DEPOSIT_MANAGER = '0x90ffcc7F168DceDBEF1Cb6c6eB00cA73F922956F';

    let targetAddress = layer2Identifier;
    if (!targetAddress.startsWith('0x')) {
      targetAddress = layer2Operators[layer2Identifier].address;
    }

    await checkWalletConnection(
      isCallback,
      `stake-tokens ${targetAddress} ${tokenAmount}`
    );

    const tx = await writeContract(wagmiConfig, {
      abi: parseAbi(['function approveAndCall(address, uint256, bytes)']),
      address: tokenAddress,
      functionName: 'approveAndCall',
      args: [
        WTON,
        parseEther(tokenAmount),
        encodeAbiParameters(
          [{ type: 'address' }, { type: 'address' }],
          [DEPOSIT_MANAGER, targetAddress as `0x${string}`]
        ),
      ],
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎯 Operator: ${targetAddress}\n💰 Token amount: ${tokenAmount}\n📝 Transaction hash: ${tx}`,
        },
      ],
    };
  }
);

server.registerTool(
  'update-seigniorage',
  {
    title: 'Update seigniorage',
    description:
      'Update the seigniorage of the token. This tool allows you to update the seigniorage of the token. The seigniorage is the amount of tokens that are minted and burned by the token contract.',
    inputSchema: {
      layer2Identifier: z
        .string()
        .describe(
          "The Layer2 operator identifier - can be a name (e.g., 'hammer', 'arbitrum') or a full address"
        ),
      isCallback: z
        .boolean()
        .optional()
        .describe(
          'If true, the callback will be called after the transaction is confirmed'
        ),
    },
  },
  async ({ layer2Identifier, isCallback }) => {
    let targetAddress = layer2Identifier;
    if (!targetAddress.startsWith('0x')) {
      targetAddress = layer2Operators[layer2Identifier].address;
    }

    await checkWalletConnection(
      isCallback,
      `update-seigniorage ${targetAddress}`
    );

    const tx = await writeContract(wagmiConfig, {
      abi: parseAbi(['function updateSeigniorage()']),
      address: targetAddress as `0x${string}`,
      functionName: 'updateSeigniorage',
      args: [],
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎯 Operator: ${targetAddress}\n💰 📝 Transaction hash: ${tx}`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
