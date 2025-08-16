import { defineChain } from 'viem';

// Placeholder Pylon appchain. Update once RPC/chainId are known.
export const pylon = defineChain({
  id: Number(process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 777777),
  name: 'Pylon Appchain',
  nativeCurrency: { name: 'PYL', symbol: 'PYL', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'http://localhost:8546'] },
    public: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'http://localhost:8546'] }
  }
});

