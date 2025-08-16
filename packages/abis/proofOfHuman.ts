export const ProofOfHumanABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'verifiedHumans',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'verifySelfProof',
    inputs: [
      { name: 'proofPayload', type: 'bytes' },
      { name: 'userContextData', type: 'bytes' }
    ],
    outputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getConfigId',
    inputs: [
      { name: '_destinationChainId', type: 'bytes32' },
      { name: '_userIdentifier', type: 'bytes32' },
      { name: '_userDefinedData', type: 'bytes' }
    ],
    outputs: [{ type: 'bytes32' }]
  }
] as const;

