import { celo } from '../chains/celo';
import { pylon } from '../chains/pylon';

export const NETWORKS = {
  CELO: 'celo',
  PYLON: 'pylon',
  HUMAN_APPCHAIN: 'pylon' // Human Appchain is Pylon
} as const;

export type NetworkType = typeof NETWORKS[keyof typeof NETWORKS];

export const getChainById = (chainId: number) => {
  if (chainId === celo.id) return celo;
  if (chainId === pylon.id) return pylon;
  return null;
};

export const getNetworkType = (chainId: number): NetworkType => {
  if (chainId === celo.id) return NETWORKS.CELO;
  if (chainId === pylon.id) return NETWORKS.PYLON;
  return NETWORKS.CELO;
};




