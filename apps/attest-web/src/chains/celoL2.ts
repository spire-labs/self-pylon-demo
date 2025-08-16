import { defineChain } from 'viem';

// Placeholder L2 definition. Update chainId/RPC once confirmed.
export const celoL2 = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CELO_L2_CHAIN_ID || 12345),
  name: 'Celo L2',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || 'http://localhost:8545'] },
    public: { http: [process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || 'http://localhost:8545'] }
  }
});

