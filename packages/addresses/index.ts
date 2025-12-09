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
    proofOfHuman: '0x5E05a5CCf9fe3EC0a4b602A56381D685D0f711a8' // ProofOfHuman on Celo mainnet
  },
  pylon: {
    settlementPort: '0x0000000000000000000000000000000000000042', // Fixed address on all Pylon chains
    proofOfHumanProxy: '0xa0077219389A1aE6c061CCEBDc9760C626dA90B5', // SettlementForwardingProxy on Pylon (post-genesis)
    humanNft: '0x6DC93BEFC7311089B92A39242411ACd102A0F6f8' // HumanNFT on Pylon (post-genesis)
  }
};

export function getAddress<N extends Network, K extends keyof AddressBook[N]>(
  network: N,
  key: K
): AddressBook[N][K] | undefined {
  return addresses[network]?.[key];
}

