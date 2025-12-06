import { defineChain } from 'viem';

// Pylon appchain - where NFT claims happen
export const pylon = defineChain({
  id: Number(process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 2139),
  name: 'Pylon',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc'] },
    public: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'https://pylon.celo-mainnet.spire.dev/v1/chain/2139/rpc'] }
  }
});




