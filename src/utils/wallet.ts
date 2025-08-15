import { metaMask } from '@wagmi/connectors';
import { connect, getAccount } from '@wagmi/core';
import qrcode from 'qrcode-terminal';
import { createMCPResponse, type MCPResponse } from './response.js';
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
    if (isCallback === true) {
      // 콜백인 경우 대기 상태 반환
      const response: MCPResponse = {
        status: 'continue',
        message: 'waiting for wallet connection',
        nextStep: callback,
        executeNextStepAfter: '10s',
      };

      return {
        isConnected: false,
        content: [{ type: 'text' as const, text: createMCPResponse(response) }],
      };
    } else {
      // 초기 호출인 경우 QR 코드 생성
      try {
        const uri = await connectWallet();
        const qrCodeText = await generateQRCode(uri);

        const response: MCPResponse = {
          status: 'continue',
          message: 'QR code generated successfully',
          nextStep: 'wait-wallet-connect',
          callback: callback,
        };

        return {
          isConnected: false,
          content: [
            { type: 'text' as const, text: createMCPResponse(response) },
            {
              type: 'text' as const,
              text:
                'Please scan the QR code with your wallet to connect\n\n' +
                qrCodeText,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const response: MCPResponse = {
          status: 'error',
          message: `QR Code generation failed: ${errorMessage}`,
        };

        return {
          isConnected: false,
          content: [
            { type: 'text' as const, text: createMCPResponse(response) },
          ],
        };
      }
    }
  }

  // 지갑이 연결되어 있으면 성공 상태 반환
  return {
    isConnected: true,
    content: [
      {
        type: 'text' as const,
        text: createMCPResponse({
          status: 'success',
          message: `Wallet is connected: ${account.address}`,
        }),
      },
    ],
  };
}
