import { metaMask } from '@wagmi/connectors';
import { connect, getAccount } from '@wagmi/core';
import qrcode from 'qrcode-terminal';
import { createMCPResponse } from './response.js';
import { wagmiConfig } from './wagmi-config.js';

export async function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    const connectorFn = metaMask({ headless: true });
    const connector = wagmiConfig._internal.connectors.setup(connectorFn);

    connector.emitter.on('message', (payload) => {
      if (payload.type === 'display_uri') {
        resolve(payload.data as string);
      }
    });

    connect(wagmiConfig, { connector }).catch(reject);
  });
}

export async function generateQRCode(uri: string): Promise<string> {
  return await new Promise((resolve) => {
    qrcode.generate(uri, { small: true }, resolve);
  });
}

export async function checkWalletConnection(
  isCallback: boolean | undefined,
  callback: string
): Promise<WalletCheckResult> {
  const account = getAccount(wagmiConfig);

  if (!account.isConnected) {
    const response: MCPResponse = isCallback
      ? {
          status: 'continue',
          message: 'waiting for wallet connection',
          nextStep: callback,
          executeNextStepAfter: '10s',
        }
      : {
          status: 'continue',
          message: 'please connect your wallet first',
          nextStep: 'connect-wallet',
          callback: callback,
        };

    return {
      content: [{ type: 'text' as const, text: createMCPResponse(response) }],
    };
  }
}
