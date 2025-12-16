"use client";
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from './page.module.css';
import buttonStyles from '../components/ui/Button.module.css';
import { useFaucetAutoRequest } from '../lib/useFaucetAutoRequest';

export default function LandingPage() {
  const { isConnected, address } = useAccount();
  const { connect, isPending, error: connectError } = useConnect();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Automatically request faucet funds when wallet is connected and has zero balance
  const { isRequestingFaucet } = useFaucetAutoRequest();

  // Navigate when connected
  useEffect(() => {
    if (isConnected && address) {
      router.push('/verify/one');
    }
  }, [isConnected, address, router]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      let message = 'Failed to connect wallet';
      const errorMsg = connectError.message || connectError.toString();
      if (errorMsg.includes('Provider not found') || errorMsg.includes('No Ethereum provider') || (typeof window !== 'undefined' && !window.ethereum)) {
        message = 'No wallet found. Please install MetaMask or another Web3 wallet.';
      } else if (errorMsg.includes('User rejected') || errorMsg.includes('rejected')) {
        message = 'Connection rejected. Please try again.';
      } else if (errorMsg.includes('already processing')) {
        message = 'Connection already in progress. Please wait.';
      } else {
        message = 'Unable to connect wallet. Please make sure you have a Web3 wallet installed.';
      }
      setErrorMessage(message);
    } else {
      setErrorMessage('');
    }
  }, [connectError]);

  const handleConnect = async () => {
    setErrorMessage('');
    
    if (typeof window === 'undefined' || !window.ethereum) {
      setErrorMessage('No wallet found. Please install MetaMask or another Web3 wallet.');
      return;
    }
    
    try {
      await connect({ connector: injected() });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      let message = 'Failed to connect wallet';
      const errorMsg = error?.message || error?.toString() || '';
      if (errorMsg.includes('Provider not found') || errorMsg.includes('No Ethereum provider')) {
        message = 'No wallet found. Please install MetaMask or another Web3 wallet.';
      } else if (errorMsg.includes('User rejected') || errorMsg.includes('rejected')) {
        message = 'Connection rejected. Please try again.';
      } else if (errorMsg.includes('already processing')) {
        message = 'Connection already in progress. Please wait.';
      } else {
        message = 'Unable to connect wallet. Please make sure you have a Web3 wallet installed.';
      }
      setErrorMessage(message);
    }
  };

  return (
    <>
      <Header variant="main" onConnectClick={handleConnect} />
      <div className={styles.container}>
        <div className={styles.contantBlock}>
          <div className={styles.titleBlock}>
            <div className={styles.title}>
              Claim your <br /> Human NFT
            </div>
            <div className={styles.subtitle}>
              Mint your &quot;I am human&quot; NFT on Human appchain
            </div>
          </div>
          {!isConnected && (
            <>
              <button
                onClick={handleConnect}
                disabled={isPending}
                className={buttonStyles.button}
                style={{ opacity: isPending ? 0.7 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
              >
                {isPending ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {errorMessage && (
                <p style={{ 
                  fontFamily: '"Work Sans", sans-serif',
                  fontSize: '14px',
                  color: '#EF4444',
                  textAlign: 'center',
                  marginTop: '8px'
                }}>
                  {errorMessage}
                </p>
              )}
            </>
          )}
        </div>
        <div className={styles.footer}>
          <Footer />
        </div>
      </div>
    </>
  );
}
