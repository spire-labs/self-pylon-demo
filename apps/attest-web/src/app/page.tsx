"use client";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';
import SelfQR from '../components/SelfQR';
import Status from '../components/Status';

export default function Page() {
  const { isConnected, address } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1>Self Attestation (Celo L2)</h1>

      {!isConnected ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            style={{ padding: 12 }}
          >
            Connect Wallet
          </button>
          <div style={{ 
            padding: 16, 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#6c757d' }}>
              🔒 Connect your wallet to start the attestation process
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>Connected: {address}</span>
            <button onClick={() => disconnect()} style={{ padding: 8 }}>Disconnect</button>
          </div>

          <section style={{ display: 'grid', gap: 8 }}>
            <h2>Generate Address Proof & Scan with Self app</h2>
            <SelfQR address={address} />
          </section>

          <section>
            <p>After generating a proof in Self, it will be automatically submitted on-chain to verify your humanity.</p>
            <Status label="Contract Address" value={process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS} />
          </section>
        </div>
      )}
    </main>
  );
}

