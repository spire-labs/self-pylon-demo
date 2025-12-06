"use client";
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useSwitchChain, usePublicClient, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import stepOneStyles from './VerifyStepOneCard.module.css';
import successStyles from './VerifySuccessCard.module.css';
import errorStyles from './VerifyErrorCard.module.css';
import buttonStyles from './ui/Button.module.css';
import { pylon } from '../chains/pylon';
import { HumanNFTABI, ProofOfHumanABI } from '@self-pylon-demo/abis';

// TEMPORARY: Switch verification checks to Celo while Pylon CORS issues are resolved
// To switch back to Pylon: set USE_CELO_FOR_VERIFICATION to false
const USE_CELO_FOR_VERIFICATION = true;

type VerifyState = 'step1' | 'success' | 'error';

interface VerifyProps {
  address?: string;
  onMintSuccess?: () => void;
  initialState?: VerifyState;
}

export default function Verify({ address, onMintSuccess, initialState }: VerifyProps) {
  const { address: connectedAddress, chainId } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>(initialState || 'step1');
  const [mintStatus, setMintStatus] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);

  const effectiveAddress = address || connectedAddress;

  // Check verification status function - called manually when user clicks button
  // TEMPORARY: Using Celo + ProofOfHuman while Pylon CORS issues are resolved
  // When Pylon CORS is fixed, switch back by setting USE_CELO_FOR_VERIFICATION to false
  const checkVerification = async () => {
    if (!effectiveAddress) return;

    setIsCheckingVerification(true);
    setMintStatus('Checking verification status...');
    
    try {
      const { createPublicClient, http } = await import('viem');
      
      if (USE_CELO_FOR_VERIFICATION) {
        // TEMPORARY: Use Celo + ProofOfHuman directly (bypasses Pylon CORS issues)
        const celoClient = createPublicClient({
          transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || ''),
          chain: {
            id: Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || 42220),
            name: 'Celo',
            nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
            rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || ''] } }
          }
        });

        const proofOfHumanAddr = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS as `0x${string}`;
        if (proofOfHumanAddr && proofOfHumanAddr !== '0x0000000000000000000000000000000000000000') {
          const verified = await celoClient.readContract({
            address: proofOfHumanAddr,
            abi: ProofOfHumanABI,
            functionName: 'isVerified',
            args: [effectiveAddress as `0x${string}`]
          });
          
          if (verified) {
            setIsVerified(true);
            setMintStatus('');
            setState('success');
          } else {
            setIsVerified(false);
            setMintStatus('');
            // User is not verified, redirect to attestation
            router.push('/attestation/one');
          }
        }
      } else {
        // PYLON PATH: Use HumanNFT contract on Pylon to check verification (via SettlementForwardingProxy)
        // This avoids duplicate Celo RPC calls and uses the same mechanism as mint()
        const pylonClient = createPublicClient({
          transport: http(process.env.NEXT_PUBLIC_PYLON_RPC_URL || ''),
          chain: {
            id: Number(process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 2139),
            name: 'Pylon',
            nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
            rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || ''] } }
          }
        });

        const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
        if (nftAddr && nftAddr !== '0x0000000000000000000000000000000000000000') {
          // Use HumanNFT's getNullifierForAddress - returns 0 if not verified, non-zero if verified
          // This internally calls ProofOfHuman through SettlementForwardingProxy on Pylon
          const nullifier = await pylonClient.readContract({
            address: nftAddr,
            abi: HumanNFTABI,
            functionName: 'getNullifierForAddress',
            args: [effectiveAddress as `0x${string}`]
          });
          
          const verified = nullifier !== BigInt(0);
          if (verified) {
            setIsVerified(true);
            setMintStatus('');
            setState('success');
          } else {
            setIsVerified(false);
            setMintStatus('');
            // User is not verified, redirect to attestation
            router.push('/attestation/one');
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking verification:', error);
      // Extract error message for display
      let errorMessage = 'Error checking verification status';
      if (error?.shortMessage) {
        errorMessage = error.shortMessage;
        if (errorMessage.includes('execution reverted: ')) {
          errorMessage = errorMessage.replace('execution reverted: ', '');
        }
      } else if (error?.message) {
        errorMessage = error.message;
        if (errorMessage.includes('execution reverted: ')) {
          errorMessage = errorMessage.replace('execution reverted: ', '');
        }
      } else if (error?.cause?.reason) {
        errorMessage = error.cause.reason;
      }
      setMintStatus(errorMessage);
      setState('error');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Auto-switch to Pylon when on success state
  useEffect(() => {
    if (state === 'success' && chainId && chainId !== pylon.id) {
      switchChain({ chainId: pylon.id });
    }
  }, [state, chainId, switchChain]);

  const handleVerify = async () => {
    // Check verification status when user clicks the button
    await checkVerification();
  };

  const waitForReceipt = async (txHash: `0x${string}`) => {
    if (!publicClient) return;
    
    setIsWaitingForReceipt(true);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      
      if (receipt.status === 'reverted') {
        // Get the transaction to retrieve revert reason via static call at the exact block
        let revertReason = 'Transaction reverted';
        try {
          const tx = await publicClient.getTransaction({ hash: txHash });
          // Static call at the exact block - read-only, uses exact same state and inputs
          // This is deterministic and gives us the revert reason from the actual failed transaction
          await publicClient.call({
            to: tx.to,
            data: tx.input,
            account: tx.from,
            blockNumber: receipt.blockNumber,
          });
          // Should not reach here if transaction reverted
        } catch (callError: any) {
          // Extract revert reason from the call error - this is the actual revert message
          if (callError?.shortMessage) {
            revertReason = callError.shortMessage;
            // Clean up common prefixes
            if (revertReason.includes('execution reverted: ')) {
              revertReason = revertReason.replace('execution reverted: ', '');
            } else if (revertReason.includes('execution reverted')) {
              revertReason = revertReason.replace('execution reverted', '').trim();
            }
          } else if (callError?.message) {
            revertReason = callError.message;
            if (revertReason.includes('execution reverted: ')) {
              revertReason = revertReason.replace('execution reverted: ', '');
            } else if (revertReason.includes('execution reverted')) {
              revertReason = revertReason.replace('execution reverted', '').trim();
            }
          } else if (callError?.cause?.reason) {
            revertReason = callError.cause.reason;
          } else if (callError?.cause?.data) {
            // Try to decode if it's ABI-encoded revert data
            revertReason = `Revert data: ${callError.cause.data}`;
          }
        }
        
        if (revertReason.includes('Nullifier already used') || revertReason.includes('already been used')) {
          setIsWaitingForReceipt(false);
          router.push('/fail');
        } else {
          setMintStatus(`Submitted: ${txHash}\n❌ ${revertReason}`);
          setState('error');
          setIsWaitingForReceipt(false);
        }
      } else {
        setIsWaitingForReceipt(false);
        if (onMintSuccess) {
          onMintSuccess();
        } else {
          router.push('/success');
        }
      }
    } catch (e: any) {
      console.error('Error waiting for receipt:', e);
      let errorMessage = 'Transaction reverted';
      
      if (e?.shortMessage) {
        errorMessage = e.shortMessage;
      } else if (e?.message) {
        errorMessage = e.message;
        if (errorMessage.includes('execution reverted: ')) {
          errorMessage = errorMessage.replace('execution reverted: ', '');
        }
      } else if (e?.cause?.reason) {
        errorMessage = e.cause.reason;
      }
      
      setMintStatus(`Submitted: ${txHash}\n❌ ${errorMessage}`);
      setState('error');
      setIsWaitingForReceipt(false);
    }
  };

  const handleMint = async () => {
    if (!effectiveAddress) return;
    
    try {
      const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
      if (!nftAddr || nftAddr === '0x0000000000000000000000000000000000000000') {
        setMintStatus('Error: HumanNFT contract address not configured');
        setState('error');
        return;
      }
      
      if (!publicClient) {
        setMintStatus('Error: Public client not available');
        setState('error');
        return;
      }
      
      setMintStatus('Minting...');
      const txHash = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: []
      });
      
      setMintStatus(`Submitted: ${txHash}\n⏳ Waiting for confirmation...`);
      waitForReceipt(txHash);
    } catch (e: any) {
      console.error('Mint error:', e);
      
      // Check if this is a "User rejected" error - might be masking a revert
      const isUserRejected = 
        e?.shortMessage?.includes('User rejected') ||
        e?.message?.includes('User rejected') ||
        e?.cause?.message?.includes('User rejected') ||
        e?.name === 'UserRejectedRequestError';
      
      let errorMessage = 'Transaction failed';
      const error = e;
      
      // Always try to call the contract to get the actual revert reason
      // This works for both "User rejected" errors (which might mask reverts) and other errors
      // Create a separate client like we do for verification check (to avoid CORS issues)
      if (effectiveAddress) {
        try {
          const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
          if (nftAddr && nftAddr !== '0x0000000000000000000000000000000000000000') {
            // Create a client to call the contract (same approach as verification check)
            const { createPublicClient, http, encodeFunctionData } = await import('viem');
            const pylonClient = createPublicClient({
              transport: http(process.env.NEXT_PUBLIC_PYLON_RPC_URL || ''),
              chain: {
                id: Number(process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 2139),
                name: 'Pylon',
                nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_PYLON_RPC_URL || ''] } }
              }
            });
            
            const data = encodeFunctionData({
              abi: HumanNFTABI,
              functionName: 'mint',
              args: []
            });
            
            // Call the contract to check if it would revert (using separate client like verification check)
            await pylonClient.call({
              to: nftAddr,
              data: data as `0x${string}`,
              account: effectiveAddress as `0x${string}`
            });
            // If call succeeds and it was a user rejection, it's a genuine user rejection
            if (isUserRejected) {
              errorMessage = 'Transaction was rejected by user';
            } else {
              // Call succeeded but we got an error - use the original error message
              if (error?.shortMessage) {
                errorMessage = error.shortMessage;
                if (errorMessage.includes('execution reverted: ')) {
                  errorMessage = errorMessage.replace('execution reverted: ', '');
                }
              } else if (error?.message) {
                errorMessage = error.message;
                if (errorMessage.includes('execution reverted: ')) {
                  errorMessage = errorMessage.replace('execution reverted: ', '');
                }
              } else if (error?.cause?.data) {
                errorMessage = `Transaction failed: ${error.cause.data}`;
              } else if (error?.cause?.reason) {
                errorMessage = `Transaction failed: ${error.cause.reason}`;
              } else if (error?.data?.message) {
                errorMessage = error.data.message;
              }
            }
          }
        } catch (callError: any) {
          // Call failed - extract the actual revert reason (this is the real error)
          console.error('[Mint Error Extraction] Call failed:', callError);
          console.error('[Mint Error Extraction] Error details:', {
            shortMessage: callError?.shortMessage,
            message: callError?.message,
            cause: callError?.cause,
            name: callError?.name,
            stack: callError?.stack
          });
          
          // Check if this is a CORS/network error vs a contract revert
          const isNetworkError = 
            callError?.message?.includes('CORS') ||
            callError?.message?.includes('Failed to fetch') ||
            callError?.message?.includes('NetworkError') ||
            callError?.name === 'TypeError';
          
          if (isNetworkError) {
            console.warn('[Mint Error Extraction] Network/CORS error detected, falling back to original error message');
            // If it's a network error, use the original error message instead
            if (error?.shortMessage) {
              errorMessage = error.shortMessage;
              if (errorMessage.includes('execution reverted: ')) {
                errorMessage = errorMessage.replace('execution reverted: ', '');
              }
            } else if (error?.message) {
              errorMessage = error.message;
              if (errorMessage.includes('execution reverted: ')) {
                errorMessage = errorMessage.replace('execution reverted: ', '');
              }
            } else if (error?.cause?.data) {
              errorMessage = `Transaction failed: ${error.cause.data}`;
            } else if (error?.cause?.reason) {
              errorMessage = `Transaction failed: ${error.cause.reason}`;
            } else if (error?.data?.message) {
              errorMessage = error.data.message;
            }
          } else if (callError?.shortMessage) {
            errorMessage = callError.shortMessage;
            if (errorMessage.includes('execution reverted: ')) {
              errorMessage = errorMessage.replace('execution reverted: ', '');
            } else if (errorMessage.includes('execution reverted')) {
              errorMessage = errorMessage.replace('execution reverted', '').trim();
            }
          } else if (callError?.message) {
            errorMessage = callError.message;
            if (errorMessage.includes('execution reverted: ')) {
              errorMessage = errorMessage.replace('execution reverted: ', '');
            } else if (errorMessage.includes('execution reverted')) {
              errorMessage = errorMessage.replace('execution reverted', '').trim();
            }
          } else if (callError?.cause?.reason) {
            errorMessage = callError.cause.reason;
          } else if (callError?.cause?.data) {
            errorMessage = `Revert data: ${callError.cause.data}`;
          }
        }
      } else {
        // Fallback to extracting from original error if we can't make the call
        if (error?.shortMessage) {
          errorMessage = error.shortMessage;
          if (errorMessage.includes('execution reverted: ')) {
            errorMessage = errorMessage.replace('execution reverted: ', '');
          }
        } else if (error?.message) {
          errorMessage = error.message;
          if (errorMessage.includes('execution reverted: ')) {
            errorMessage = errorMessage.replace('execution reverted: ', '');
          }
        } else if (error?.cause?.data) {
          errorMessage = `Transaction failed: ${error.cause.data}`;
        } else if (error?.cause?.reason) {
          errorMessage = `Transaction failed: ${error.cause.reason}`;
        } else if (error?.data?.message) {
          errorMessage = error.data.message;
        }
      }
      
      // Check for nullifier already used errors
      if (errorMessage.includes('Nullifier already used') || 
          errorMessage.includes('already been used') ||
          (errorMessage.toLowerCase().includes('nullifier') && errorMessage.toLowerCase().includes('used'))) {
        router.push('/fail');
      } else {
        setMintStatus(`❌ ${errorMessage}`);
        setState('error');
      }
    }
  };

  const handleDisconnect = () => {
    wagmiDisconnect();
  };

  const handleRetry = () => {
    router.push('/attestation/one');
  };

  // Render based on state
  if (state === 'step1') {
    return (
      <section className={stepOneStyles.card}>
        <div className={stepOneStyles.cardBorder}>
          <div className={stepOneStyles.cardSection}>
            <Image
              src="/verify/check.svg"
              alt="check"
              width={25.08}
              height={27.58}
              className={stepOneStyles.logo}
              priority
            />
            <div className={stepOneStyles.cardText}>
              <h2 className={stepOneStyles.cardTitle}>
                This NFT can only be claimed by verified humans
              </h2>
              <p className={stepOneStyles.cardSubtitleCustom}>
                The contract will automatically verify your attestation status on Celo L2 and check for any duplicate claims
              </p>
            </div>
          </div>
          <div className={stepOneStyles.buttonWrapper}>
            <button
              onClick={handleVerify}
              disabled={isCheckingVerification}
              className={buttonStyles.button}
              style={{ 
                width: '100%',
                opacity: isCheckingVerification ? 0.7 : 1,
                cursor: isCheckingVerification ? 'not-allowed' : 'pointer'
              }}
            >
              {isCheckingVerification ? 'Checking...' : 'Verify your humanity'}
            </button>
          </div>
        </div>

        {mintStatus && state === 'step1' && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '4px',
            fontFamily: '"Work Sans", sans-serif',
            fontSize: '14px',
            color: '#374151',
            whiteSpace: 'pre-line',
            textAlign: 'center'
          }}>
            {mintStatus}
          </div>
        )}

        <div className={stepOneStyles.walletCard}>
          <div className={stepOneStyles.walletRow}>
            <span className={stepOneStyles.walletLabel}>Connected Wallet</span>
            <button className={stepOneStyles.disconnect} onClick={handleDisconnect}>Disconnect</button>
          </div>
          <div className={stepOneStyles.walletAddress}>
            {effectiveAddress}
          </div>
        </div>
      </section>
    );
  }

  if (state === 'success') {
    return (
      <div className={successStyles.card}>
        <section className={successStyles.cardBorder}>
          <div className={successStyles.cardSection}>
            <Image
              src="/verify/check_success.svg"
              alt="check"
              width={25.08}
              height={27.58}
              className={successStyles.logo}
              priority
            />

            <div className={successStyles.cardText}>
              <h2 className={successStyles.cardTitle}>
                You&apos;ve verified you&apos;re human!
              </h2>
              <p className={successStyles.cardSubtitle}>
                The contract will automatically verify your attestation status on Celo L2 and check for any duplicate claims
              </p>
            </div>
          </div>

          <div className={successStyles.buttonWrapper} style={{ flexDirection: 'column', padding: '0 16px 16px 16px' }}>
            <button
              onClick={handleMint}
              disabled={isWritePending || isWaitingForReceipt || chainId !== pylon.id}
              className={buttonStyles.button}
              style={{ 
                width: '100%',
                opacity: (isWritePending || isWaitingForReceipt || chainId !== pylon.id) ? 0.7 : 1,
                cursor: (isWritePending || isWaitingForReceipt || chainId !== pylon.id) ? 'not-allowed' : 'pointer'
              }}
            >
              {isWritePending ? 'Minting...' : isWaitingForReceipt ? 'Waiting for confirmation...' : 'Mint Human NFT'}
            </button>
            <div style={{ 
              marginTop: '12px', 
              textAlign: 'center',
              fontFamily: '"Work Sans", sans-serif',
              fontSize: '12px',
              color: '#0b1b47',
              opacity: 0.6
            }}>
              Need test tokens for gas?{' '}
              <a 
                href="https://celo-faucet.onrender.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#0b1b47',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Get CELO from faucet
              </a>
            </div>
          </div>
        </section>

        {mintStatus && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '4px',
            fontFamily: '"Work Sans", sans-serif',
            fontSize: '14px',
            color: '#374151',
            whiteSpace: 'pre-line',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
            maxWidth: '100%'
          }}>
            {mintStatus}
          </div>
        )}

        <div className={successStyles.walletCard}>
          <div className={successStyles.walletRow}>
            <span className={successStyles.walletLabel}>Connected Wallet</span>
            <button className={successStyles.disconnect} onClick={handleDisconnect}>Disconnect</button>
          </div>
          <div className={successStyles.walletAddress}>
            {effectiveAddress}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <section className={errorStyles.wrapper}>
      <div className={errorStyles.alert}>
        <div className={errorStyles.alertBlock}>
          <div className={errorStyles.alertHeader}>
            <Image
              src="/verify/check_fail.svg"
              alt="error"
              width={10.18}
              height={10.18}
              className={errorStyles.logo}
              priority
            />
            <span className={errorStyles.alertTitle}>
              Error checking verification status
            </span>
          </div>
          <p className={errorStyles.alertText}>
            {mintStatus || 'Error checking verification status. Please verify your identity first with Self.'}
          </p>
        </div>
 
        <button
          onClick={handleRetry}
          className={buttonStyles.button}
          style={{ width: '100%' }}
        >
          Verify your identity first with Self
        </button>
      </div>

      <div className={errorStyles.walletCard}>
        <div className={errorStyles.walletRow}>
          <span className={errorStyles.walletLabel}>Connected Wallet</span>
          <button className={errorStyles.disconnect} onClick={handleDisconnect}>Disconnect</button>
        </div>
        <div className={errorStyles.walletAddress}>
          {effectiveAddress}
        </div>
      </div>
    </section>
  );
}

