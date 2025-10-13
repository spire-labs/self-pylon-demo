export type Network = 'celo' | 'pylon';

export type AddressBook = {
  // Celo mainnet - where attestations happen
  celo: {
    proofOfHuman?: `0x${string}`;  // ProofOfHuman contract deployed on Celo
  };
  // Pylon appchain - where claims happen
  pylon: {
    settlementPort?: `0x${string}`;        // Settlement port on Pylon (provided by Pylon)
    proofOfHumanProxy?: `0x${string}`;     // SettlementForwardingProxy on Pylon
    humanNft?: `0x${string}`;              // HumanNFT contract on Pylon
  };
};

export const addresses: AddressBook = {
  celo: {
    proofOfHuman: '0x0000000000000000000000000000000000000000'
  },
  pylon: {
    settlementPort: '0x0000000000000000000000000000000000000042', // Fixed address on all Pylon chains
    proofOfHumanProxy: '0x0000000000000000000000000000000000000000',
    humanNft: '0x0000000000000000000000000000000000000000'
  }
};

export function getAddress<N extends Network, K extends keyof AddressBook[N]>(
  network: N,
  key: K
): AddressBook[N][K] | undefined {
  return addresses[network]?.[key];
}

