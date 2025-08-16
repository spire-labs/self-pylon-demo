"use client";
import { PropsWithChildren, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { celoL2 } from '../chains/celoL2';
import { walletConnect, injected } from 'wagmi/connectors';

const isBrowser = typeof window !== 'undefined';
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const config = createConfig({
  ssr: true,
  chains: [celoL2],
  transports: {
    [celoL2.id]: http(process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || 'http://localhost:8545')
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

