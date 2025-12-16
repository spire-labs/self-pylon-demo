"use client";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Attestation from '../../../components/Attestation';
import FooterAttestation from '../../../components/FooterAttestation';
import styles from './page.module.css';

export default function AttestationOnePage() {
  const { address } = useAccount();
  const router = useRouter();
  const [currentNetwork, setCurrentNetwork] = useState<'celo' | 'pylon'>('celo');

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
              Self Attestation
            </h1>
            <p className={styles.subtitle}>
              Verify your humanity on Celo with Self Protocol
            </p>
          </div>

          <Attestation address={address} initialState="step1" />
        </div>
        <div className={styles.footer}>
          <FooterAttestation />
        </div>
      </main>
    </>
  );
}
