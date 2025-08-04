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
): Promise<WalletCheckResult | undefined> {
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
      isConnected: false,
      content: [{ type: 'text' as const, text: createMCPResponse(response) }],
    };
  }

  // 지갑이 연결되어 있으면 성공 상태 반환
  return {
    isConnected: true,
    content: [{ type: 'text' as const, text: createMCPResponse({
      status: 'success',
      message: `Wallet is connected: ${account.address}`,
    }) }],
  };
}
