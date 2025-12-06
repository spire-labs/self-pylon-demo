import { defineChain } from 'viem';

// Celo mainnet - where attestations are stored
export const celo = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || 42220),
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'] },
    public: { http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'] }
  },
  blockExplorers: {
    default: { name: 'Celoscan', url: 'https://celoscan.io' }
  }
});




