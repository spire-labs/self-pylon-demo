"use client";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Verify from '../../../components/Verify';
import styles from './page.module.css';

export default function VerifyFailPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [currentNetwork, setCurrentNetwork] = useState<'celo' | 'pylon'>('pylon');

  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);

  if (!address) {
    return null;
  }

  return (
    <>
      <Header 
        variant="change" 
        currentNetwork={currentNetwork} 
        onNetworkChange={setCurrentNetwork}
        address={address}
      />
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <h1 className={styles.title}>
              Claim your Human NFT
            </h1>
            <p className={styles.subtitle}>
              Mint your &quot;I am human&quot; NFT on Human appchain
            </p>
          </div>

          <Verify address={address} initialState="error" />
        </div>
      </main>
    </>
  );
}

