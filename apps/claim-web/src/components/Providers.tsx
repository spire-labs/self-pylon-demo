"use client";
import { PropsWithChildren, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pylon } from '../chains/pylon';
import { walletConnect, injected } from 'wagmi/connectors';

const isBrowser = typeof window !== 'undefined';
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const config = createConfig({
  chains: [pylon],
  transports: {
    [pylon.id]: http(process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc')
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

