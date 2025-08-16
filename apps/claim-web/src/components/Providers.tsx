"use client";
import { PropsWithChildren, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pylon } from '../chains/pylon';
import { walletConnect, injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [pylon],
  transports: {
    [pylon.id]: http(process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'http://localhost:8546')
  },
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-self-pylon',
      showQrModal: true
    })
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

