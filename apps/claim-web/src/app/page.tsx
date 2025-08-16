"use client";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { SelfAttestationRegistryABI, HumanNFTABI, ProofOfHumanABI } from '@self-pylon-demo/abis';
import { getAddress as getBookAddress } from '@self-pylon-demo/addresses';
import Status from '../components/Status';

export default function Page() {
  const { isConnected, address } = useAccount();
  const { connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [attested, setAttested] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  useEffect(() => {
    // Optionally auto-check on connect
    (async () => {
      if (!address) return;
      const celoClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || ''),
        chain: {
          id: Number(process.env.NEXT_PUBLIC_CELO_L2_CHAIN_ID || 0),
          name: 'Celo L2',
          nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
          rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || ''] } }
        }
      });
      try {
        const hubRootAddr = (process.env.NEXT_PUBLIC_HUB_ROOT_ADDRESS ||
          '0x0000000000000000000000000000000000000000') as `0x${string}`;
        const verified = await celoClient.readContract({
          address: hubRootAddr,
          abi: ProofOfHumanABI,
          functionName: 'verifiedHumans',
          args: [address]
        });
        setAttested(Boolean(verified));
      } catch (e) {
        setAttested(false);
      }
    })();
  }, [address]);

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Claim "I am human" NFT</h1>

      {!isConnected ? (
        <button onClick={() => connect({ connector: injected() })} disabled={isConnectPending} style={{ padding: 12 }}>
          Connect Wallet
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Connected: {address}</span>
          <button onClick={() => disconnect()} style={{ padding: 8 }}>Disconnect</button>
        </div>
      )}

      <section style={{ display: 'grid', gap: 8 }}>
        <h2>Verify attestation on Celo</h2>
        <div>Status: {attested ? 'Attested' : 'Not attested'}</div>
        <Status label="Registry" value={(process.env.NEXT_PUBLIC_SELF_REGISTRY_ADDRESS as string) || ''} />
      </section>

      <section>
        <button
          disabled={!attested || isWritePending}
          onClick={async () => {
            if (!address) return;
            try {
              const nftAddr = (
                process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS ||
                getBookAddress('pylon', 'humanNft') ||
                '0x0000000000000000000000000000000000000000'
              ) as `0x${string}`;
              setMintStatus('Minting...');
              const tx = await writeContractAsync({
                address: nftAddr,
                abi: HumanNFTABI,
                functionName: 'mint',
                args: []
              });
              setMintStatus(`Submitted: ${tx}`);
            } catch (e: any) {
              setMintStatus(e?.message || 'Mint failed');
            }
          }}
          style={{ padding: 12 }}
        >
          Mint NFT
        </button>
        <div style={{ fontSize: 12, color: '#666' }}>{mintStatus}</div>
      </section>
    </main>
  );
}

