"use client";
import { PropsWithChildren, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { custom } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { celo } from '../chains/celo';
import { pylon } from '../chains/pylon';
import { walletConnect, injected } from 'wagmi/connectors';

const isBrowser = typeof window !== 'undefined';
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Create a transport that uses wallet provider when available, falls back to HTTP
// This avoids CORS issues by routing through the wallet provider
function createWalletTransport(chainId: number, fallbackRpcUrl: string) {
  if (isBrowser && typeof window !== 'undefined') {
    const { ethereum } = window as any;
    if (ethereum) {
      // Use wallet provider (routes through wallet, avoiding CORS)
      return custom(ethereum);
    }
  }
  // Fallback to HTTP transport (for SSR or when wallet not available)
  return http(fallbackRpcUrl);
}

const config = createConfig({
  ssr: true,
  chains: [celo, pylon],
  transports: {
    [celo.id]: createWalletTransport(
      celo.id,
      process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'
    ),
    [pylon.id]: createWalletTransport(
      pylon.id,
      process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc'
    )
  },
  connectors: [
    injected(),
    ...(isBrowser && wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            showQrModal: true
          })
        ]
      : [])
  ]
});

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}




