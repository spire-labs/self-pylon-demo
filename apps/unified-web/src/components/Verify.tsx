"use client";
import { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useSwitchChain, usePublicClient, useDisconnect, useBalance } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import stepOneStyles from './VerifyStepOneCard.module.css';
import successStyles from './VerifySuccessCard.module.css';
import errorStyles from './VerifyErrorCard.module.css';
import buttonStyles from './ui/Button.module.css';
import { pylon } from '../chains/pylon';
import { HumanNFTABI } from '@self-pylon-demo/abis';
import {
  extractErrorMessage,
  cleanRevertMessage,
  isRpcError,
  isUserRejection,
  extractRevertReason,
  isNullifierUsedError,
  simulateMint,
  getRevertReasonFromSimulate
} from '../lib/contractUtils';

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
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  const effectiveAddress = address || connectedAddress;

  // Check user's balance on Pylon to determine if they need faucet funds
  const { data: pylonBalance } = useBalance({
    address: effectiveAddress as `0x${string}` | undefined,
    chainId: pylon.id,
  });
  
  // Consider user as having no funds if balance is 0 or undefined
  const hasNoFunds = !pylonBalance || pylonBalance.value === BigInt(0);

  // Check verification status function - called manually when user clicks button
  // Use HumanNFT contract on Pylon to check verification (via SettlementForwardingProxy)
  // This uses the same mechanism as mint() and reads from Celo synchronously through Pylon
  // Uses wallet provider through wagmi abstraction to avoid CORS issues
  // NOTE: This function assumes we're already on Pylon (chain switching happens in handleVerify)
  const checkVerification = async () => {
    if (!effectiveAddress) return;

    setIsCheckingVerification(true);
    setMintStatus('Checking verification status...');
    
    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
      if (nftAddr && nftAddr !== '0x0000000000000000000000000000000000000000') {
        // Use wagmi's publicClient (configured to use wallet provider, avoiding CORS)
        const nullifier = await publicClient.readContract({
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
    } catch (error: any) {
      console.error('Error checking verification:', error);
      const errorMessage = cleanRevertMessage(extractErrorMessage(error)) || 'Error checking verification status';
      setMintStatus(errorMessage);
      setState('error');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleVerify = async () => {
    // Switch to Pylon first if needed, then check verification
    // We need to be on Pylon to query the HumanNFT contract
    if (chainId && chainId !== pylon.id) {
      try {
        await switchChain({ chainId: pylon.id });
        // Wait a moment for the chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to switch to Pylon:', error);
        setMintStatus('Please switch to Human Appchain to verify your humanity');
        setState('error');
        return;
      }
    }
    
    // Check verification status after ensuring we're on Pylon
    await checkVerification();
  };

  // Helper to call simulateMint with current context
  const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
  const simulateMintCall = () => simulateMint(publicClient, effectiveAddress as `0x${string}`, nftAddr);

  const waitForReceipt = async (txHash: `0x${string}`) => {
    if (!publicClient || !effectiveAddress) return;
    
    setIsWaitingForReceipt(true);
    try {
      // Wait for receipt with timeout (5 seconds)
      // waitForTransactionReceipt will poll for the transaction, so we don't need to check if it exists first
      const receipt = await Promise.race([
        publicClient.waitForTransactionReceipt({
          hash: txHash,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Transaction receipt timeout - transaction may have been dropped or reverted'));
          }, 5000); // 5 second timeout
        })
      ]);
      
      if (receipt.status === 'reverted') {
        let revertReason = 'Transaction reverted';
        try {
          const simulatedRevert = await getRevertReasonFromSimulate(
            publicClient,
            effectiveAddress as `0x${string}`,
            nftAddr,
            receipt.blockNumber
          );
          if (simulatedRevert) {
            revertReason = simulatedRevert;
          }
        } catch (callError: any) {
          // If both methods fail, try to extract from the error
          const extractedReason = extractRevertReason(callError);
          if (extractedReason) {
            revertReason = extractedReason;
          }
        }
        
        if (isNullifierUsedError(revertReason)) {
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
      const isTimeout = e?.message?.includes('timeout') || e?.message?.includes('dropped');
      let errorMessage = cleanRevertMessage(extractErrorMessage(e));
      
      if (isRpcError(e) || isTimeout) {
        const revertReason = await simulateMintCall();
        if (revertReason) {
          errorMessage = revertReason;
          if (isNullifierUsedError(errorMessage)) {
            setIsWaitingForReceipt(false);
            router.push('/fail');
            return;
          }
        } else {
          errorMessage = isTimeout
            ? 'Transaction timed out or was dropped. Please try again.'
            : 'Transaction was rejected by the network. Please try again.';
        }
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

      setMintStatus('Estimating gas...');
      // Estimate gas and multiply by 2 for safety margin
      const estimatedGas = await publicClient.estimateContractGas({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: [],
        account: effectiveAddress as `0x${string}`
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
      waitForReceipt(txHash);
    } catch (e: any) {
      console.error('Mint error:', e);
      
      const userRejected = isUserRejection(e);
      let errorMessage = cleanRevertMessage(extractErrorMessage(e));
      
      // Check if error contains a transaction hash (transaction was submitted but error occurred)
      // This can happen when Pylon allows transactions to be submitted even if they revert
      // Check both error message and error object properties
      let txHashFromError: `0x${string}` | null = null;
      
      // Check error object properties first (more reliable)
      if (e?.hash && typeof e.hash === 'string' && e.hash.startsWith('0x')) {
        txHashFromError = e.hash as `0x${string}`;
      } else if (e?.transactionHash && typeof e.transactionHash === 'string' && e.transactionHash.startsWith('0x')) {
        txHashFromError = e.transactionHash as `0x${string}`;
      } else {
        // Fallback: try to extract from error message
        const txHashMatch = errorMessage.match(/0x[a-fA-F0-9]{64}/);
        txHashFromError = txHashMatch ? (txHashMatch[0] as `0x${string}`) : null;
      }
      
      // If we have a transaction hash in the error, wait for receipt to get actual revert reason
      if (txHashFromError && !userRejected) {
        setMintStatus(`Submitted: ${txHashFromError}\n⏳ Waiting for confirmation...`);
        waitForReceipt(txHashFromError);
        return;
      }
      
      // Check if error message is generic (like "An internal error was received")
      const isGenericError = 
        errorMessage.includes('An internal error was received') ||
        errorMessage.includes('internal error') ||
        (errorMessage.includes('reverted') && !errorMessage.includes('execution reverted:'));
      
      // Try to get actual revert reason if error is generic or doesn't have revert info
      const hasRevertInfo = errorMessage.includes('execution reverted:') || 
                           (errorMessage.includes('revert') && !isGenericError);
      
      if (!hasRevertInfo && !userRejected) {
        // Try simulation first
        const revertReason = await simulateMintCall();
        if (revertReason) {
          errorMessage = revertReason;
        } else if (isGenericError) {
          // For generic errors, try to get more info
          errorMessage = 'Transaction failed. Please check the transaction using cast cli or similar for details.';
        }
      } else if (userRejected) {
        errorMessage = 'Transaction was rejected by user';
      }
      
      // Check for nullifier already used errors
      if (isNullifierUsedError(errorMessage)) {
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
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/verify/check.svg`}
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
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/verify/check_success.svg`}
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
            <div className={successStyles.faucetContainer}>
              Need test tokens for gas?{' '}
              <a 
                href="https://celo-faucet.onrender.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={hasNoFunds ? successStyles.faucetLinkHighlight : successStyles.faucetLink}
              >
                Get Pylon test CELO from faucet
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
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/verify/check_fail.svg`}
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
          <div>
            <p className={isErrorExpanded ? errorStyles.alertText : errorStyles.alertTextCollapsed}>
              {mintStatus || 'Error checking verification status. Please verify your identity first with Self.'}
            </p>
            {mintStatus && (
              <button
                onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                className={errorStyles.expandButton}
              >
                {isErrorExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
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

