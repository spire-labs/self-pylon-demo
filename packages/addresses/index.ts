export type Network = 'celo' | 'pylon';

export type AddressBook = {
  // Celo mainnet - where attestations happen
  celo: {
    proofOfHuman?: `0x${string}`;  // ProofOfHuman contract deployed on Celo
  };
  // Pylon appchain - where claims happen
  pylon: {
    appchainPort?: `0x${string}`;          // AppchainPort (crosschain read/write preinstall) on Pylon
    proofOfHumanProxy?: `0x${string}`;     // SettlementForwardingProxy on Pylon
    humanNft?: `0x${string}`;              // HumanNFT contract on Pylon
  };
};

export const addresses: AddressBook = {
  celo: {
    proofOfHuman: '0x5E05a5CCf9fe3EC0a4b602A56381D685D0f711a8' // ProofOfHuman on Celo mainnet
  },
  pylon: {
    appchainPort: '0x0000000000000000000000000000000000000043', // Fixed address on modern Pylon chains
    proofOfHumanProxy: '0x165F103493963321596Aabf028EDB972Db724257', // SettlementForwardingProxy on Pylon (post-genesis)
    humanNft: '0x51AF8BA13f0954f62b60EbB4167164caD7621aAE' // HumanNFT on Pylon (post-genesis)
  }
};

export function getAddress<N extends Network, K extends keyof AddressBook[N]>(
  network: N,
  key: K
): AddressBook[N][K] | undefined {
  return addresses[network]?.[key];
}
