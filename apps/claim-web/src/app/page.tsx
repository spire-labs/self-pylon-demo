"use client";
import { useAccount, useConnect, useDisconnect, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';
import { HumanNFTABI } from '@self-pylon-demo/abis';
import Status from '../components/Status';

export default function Page() {
  const { isConnected, address } = useAccount();
  const { connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mintStatus, setMintStatus] = useState('');
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const handleMint = async () => {
    if (!address) return;
    
    try {
      const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
      if (!nftAddr || nftAddr === '0x0000000000000000000000000000000000000000') {
        setMintStatus('Error: HumanNFT contract address not configured');
        return;
      }
      
      setMintStatus('Minting...');
      const tx = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: []
      });
      setMintStatus(`Submitted: ${tx}`);
    } catch (e: any) {
      console.error('Mint error:', e);
      setMintStatus(e?.message || 'Mint failed');
    }
  };

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
        <h2>Claim Your Human NFT</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          This NFT can only be claimed by verified humans. The contract will automatically verify your attestation status 
          on Celo L2 and check for any duplicate claims. No need to worry about the verification details - just click mint!
        </p>
        <Status label="HumanNFT Contract" value={process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS || 'Not set'} />
        <Status label="Pylon RPC" value={process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'Not set'} />
        <Status label="Pylon Chain ID" value={process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 'Not set'} />
      </section>

      <section>
        <button
          disabled={!isConnected || isWritePending}
          onClick={handleMint}
          style={{ padding: 12 }}
        >
          Mint Human NFT
        </button>
        <div style={{ fontSize: 12, color: '#666' }}>{mintStatus}</div>
      </section>
    </main>
  );
}

