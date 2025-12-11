"use client";
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './page.module.css';
import { HumanNFTABI } from '@self-pylon-demo/abis';
import {
  cleanRevertMessage,
  extractErrorMessage,
  isNullifierUsedError,
  simulateMint,
  getRevertReasonFromSimulate
} from '../../lib/contractUtils';

export default function SuccessPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [currentNetwork, setCurrentNetwork] = useState<'celo' | 'pylon'>('pylon');
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient();
  const [mintStatus, setMintStatus] = useState('');
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);

  const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
  const simulateMintCall = () => simulateMint(publicClient, address as `0x${string}`, nftAddr);

  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);

  const handleMintAnother = async () => {
    if (!address) return;
    
    const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
    if (!nftAddr || nftAddr === '0x0000000000000000000000000000000000000000') {
      setMintStatus('Error: HumanNFT contract address not configured');
      return;
    }
    
    if (!publicClient) {
      setMintStatus('Error: Public client not available');
      return;
    }
    
    try {
      setMintStatus('Estimating gas...');
      // Estimate gas and multiply by 2 for safety margin
      const estimatedGas = await publicClient.estimateContractGas({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: [],
        account: address as `0x${string}`
      });
      const gasWithMargin = estimatedGas * BigInt(2); // Multiply by 2

      setMintStatus('Minting...');
      const txHash = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: [],
        gas: gasWithMargin
      });
      
      setMintStatus(`Submitted: ${txHash}\n⏳ Waiting for confirmation...`);
      setIsWaitingForReceipt(true);
      
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        setIsWaitingForReceipt(false);
        
        if (receipt.status === 'reverted') {
          const revertReason =
            (await getRevertReasonFromSimulate(publicClient, address as `0x${string}`, nftAddr, receipt.blockNumber)) ??
            (await simulateMintCall()) ??
            'Transaction reverted';
          
          if (isNullifierUsedError(revertReason)) {
            router.push('/fail');
          } else {
            setMintStatus(`Submitted: ${txHash}\n❌ ${revertReason}`);
          }
        } else {
          // Mint succeeded - show success message (we're already on /success page)
          setMintStatus(`✅ NFT minted successfully!\nTransaction: ${txHash}`);
        }
      } catch (e: any) {
        setIsWaitingForReceipt(false);
        let errorMessage = cleanRevertMessage(extractErrorMessage(e));
        
        // Try to get revert reason from transaction if error is generic
        if (errorMessage.includes('internal error') || errorMessage.includes('reverted')) {
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
            if (receipt.status === 'reverted') {
              const revertReason = await getRevertReasonFromSimulate(
                publicClient,
                address as `0x${string}`,
                nftAddr,
                receipt.blockNumber
              );
              if (revertReason) {
                errorMessage = revertReason;
              }
            }
          } catch (receiptError) {
            // Ignore receipt errors, use original error message
          }
        }
        
        if (isNullifierUsedError(errorMessage)) {
          router.push('/fail');
        } else {
          setMintStatus(`Submitted: ${txHash}\n❌ ${errorMessage}`);
        }
      }
    } catch (e: any) {
      console.error('Mint error:', e);
      setIsWaitingForReceipt(false);
      
      // Try to get the actual revert reason via simulation
      const revertReason = await simulateMintCall();
      const errorMessage = revertReason ?? cleanRevertMessage(extractErrorMessage(e));
      
      if (isNullifierUsedError(errorMessage)) {
        router.push('/fail');
      } else {
        setMintStatus(`❌ ${errorMessage}`);
      }
    }
  };

  if (!address) {
    return null;
  }

  return (
    <>
      <Header variant="change" currentNetwork={currentNetwork} onNetworkChange={setCurrentNetwork} />
      <main className={styles.page}>
        <div className={styles.content}>
          <section className={styles.card}>
            <div className={styles.topText}>
              <h1 className={styles.title}>
                <p className={styles.desktopText}>
                  Success!
                  <br />
                  &quot;I am human&quot;
                </p>
                <p className={styles.mobileText}>Success! &quot;I am human&quot;</p>
                <p>NFT is minted!</p>
              </h1>
              <p className={styles.subtitle}>
                It will take a few minutes for the NFT <br /> to mint and appear
                in your wallet
              </p>
            </div>

            <div className={styles.verifiedBanner}>
              <div className={styles.verified}>
                <span>Your identity has been verified using Self</span>
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/mint/green_icon.svg`}
                  alt="green_icon"
                  width={16.19999885559082}
                  height={16.19999885559082}
                  className={styles.shieldIcon}
                  priority
                />
              </div>

              <button
                className={styles.primaryButton}
                onClick={handleMintAnother}
                disabled={isWritePending || isWaitingForReceipt}
              >
                {isWritePending ? 'Minting...' : isWaitingForReceipt ? 'Waiting for confirmation...' : 'Try to mint another to see Human NFT\'s Sybil resistance in action'}
              </button>
              
              {mintStatus && (
                <div style={{ 
                  marginTop: '4px',
                  padding: '12px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '4px',
                  fontFamily: '"Work Sans", sans-serif',
                  fontSize: '14px',
                  color: '#374151',
                  whiteSpace: 'pre-line'
                }}>
                  {mintStatus}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

