export type Network = 'celoL2' | 'pylon';

export type AddressBook = {
  celoL2: {
    registry?: `0x${string}`;
    verifier?: `0x${string}`;
  };
  pylon: {
    humanNft?: `0x${string}`;
  };
};

export const addresses: AddressBook = {
  celoL2: {
    registry: '0x0000000000000000000000000000000000000000',
    verifier: '0x0000000000000000000000000000000000000000'
  },
  pylon: {
    humanNft: '0x0000000000000000000000000000000000000000'
  }
};

export function getAddress<N extends Network, K extends keyof AddressBook[N]>(
  network: N,
  key: K
): AddressBook[N][K] | undefined {
  return addresses[network]?.[key];
}

