"use client";
import { PropsWithChildren, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { celo } from '../chains/celo';
import { walletConnect, injected } from 'wagmi/connectors';

const isBrowser = typeof window !== 'undefined';
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const config = createConfig({
  ssr: true,
  chains: [celo],
  transports: {
    [celo.id]: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org')
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

