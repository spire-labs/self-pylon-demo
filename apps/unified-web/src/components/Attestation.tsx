"use client";
import { useState, useEffect } from 'react';
import { useAccount, useSignMessage, usePublicClient, useSwitchChain } from 'wagmi';
import { useRouter } from 'next/navigation';
import { celo } from '../chains/celo';
import Image from 'next/image';
import stepOneStyles from './StepOneCard.module.css';
import stepTwoStyles from './StepTwoQRCard.module.css';
import successStyles from './SuccessCard.module.css';
import errorStyles from './ErrorCard.module.css';
import buttonStyles from './ui/Button.module.css';
import QRCodeDisplay from './QRCodeDisplay';

type AttestationState = 'step1' | 'step2' | 'success' | 'error';

interface AttestationProps {
  address?: string;
  onSuccess?: () => void;
  initialState?: AttestationState;
}

export default function Attestation({ address, onSuccess, initialState }: AttestationProps) {
  const { address: connectedAddress, chainId } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [state, setState] = useState<AttestationState>(initialState || 'step1');
  const [signature, setSignature] = useState<string>('');
  const [shouldPoll, setShouldPoll] = useState(false);

  const effectiveAddress = address || connectedAddress;

  // Load signature from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSig = localStorage.getItem('attestation_signature');
      if (storedSig) {
        setSignature(storedSig);
        // If signature exists, we're on step 2
        if (state === 'step1') {
          setState('step2');
        }
      }
    }
  }, [state]);

  // Handle proof verified signal from Self QR code
  const handleProofVerified = () => {
    console.log('[Attestation] Proof verified signal received, starting polling...');
    setShouldPoll(true);
  };

  // Poll verification status only after receiving proof_verified signal from Self
  useEffect(() => {
    if (shouldPoll && state === 'step2' && effectiveAddress) {
      let pollCount = 0;
      const maxPolls = 20; // Poll for up to 60 seconds (20 * 3s)
      
      const checkVerification = async () => {
        // Ensure we're on Celo before making the call
        if (chainId && chainId !== celo.id) {
          try {
            await switchChain({ chainId: celo.id });
            // Wait a moment for the chain switch to complete
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error('[Attestation] Failed to switch to Celo:', error);
            setState('error');
            return;
          }
        }
        
        try {
          const proofOfHumanAddr = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS as `0x${string}`;
          if (proofOfHumanAddr && publicClient) {
            // Use wagmi's publicClient (configured to use wallet provider, avoiding CORS)
            const verified = await publicClient.readContract({
              address: proofOfHumanAddr,
              abi: [{ 
                name: 'isVerified', 
                type: 'function', 
                inputs: [{ name: 'user', type: 'address' }], 
                outputs: [{ name: '', type: 'bool' }], 
                stateMutability: 'view' 
              }],
              functionName: 'isVerified',
              args: [effectiveAddress as `0x${string}`]
            });
            
            if (verified) {
              // Success! Verification confirmed on-chain
              if (typeof window !== 'undefined') {
                localStorage.removeItem('attestation_signature');
              }
              setShouldPoll(false);
              setState('success');
              if (onSuccess) {
                onSuccess();
              }
            } else {
              // Not verified yet, continue polling
              pollCount++;
              if (pollCount >= maxPolls) {
                // Max polls reached, show error
                console.error('[Attestation] Max polling attempts reached, verification not found on-chain');
                setShouldPoll(false);
                setState('error');
              }
            }
          }
        } catch (error) {
          console.error('Error checking verification:', error);
          // On error, stop polling and show error state
          setShouldPoll(false);
          setState('error');
        }
      };

      // Start polling immediately, then every 3 seconds
      checkVerification();
      const interval = setInterval(checkVerification, 3000);
      return () => clearInterval(interval);
    }
  }, [shouldPoll, state, effectiveAddress, onSuccess, publicClient, chainId, switchChain]);

  const generateSignature = async () => {
    if (!effectiveAddress) return;
    
    try {
      const message = `I confirm that both this passport and public address ${effectiveAddress.toLowerCase()} are owned by me`;
      const sig = await signMessageAsync({ message });
      setSignature(sig);
      if (typeof window !== 'undefined') {
        localStorage.setItem('attestation_signature', sig);
      }
      setState('step2');
    } catch (error) {
      console.error('Error generating signature:', error);
    }
  };

  const handleContinue = () => {
    router.push('/verify/one');
  };

  const handleRetry = () => {
    setState('step2');
  };

  // Render based on state
  if (state === 'step1') {
    return (
      <div className={stepOneStyles.card}>
        <h2 className={stepOneStyles.title}>Generate Address Proof</h2>

        <div className={stepOneStyles.step}>
          <div className={stepOneStyles.stepContainer}>
            <div className={stepOneStyles.stepBlock}>
              <div className={stepOneStyles.stepNumber}>Step 1.</div>
              <div className={stepOneStyles.stepNumberStrong}>Generate a Signature</div>
            </div>
            <div className={stepOneStyles.stepSub}>
              You must sign a message to prove you own this address
            </div>
          </div>
          <button
            onClick={generateSignature}
            disabled={isSigning}
            className={buttonStyles.button}
            style={{ opacity: isSigning ? 0.7 : 1, cursor: isSigning ? 'not-allowed' : 'pointer' }}
          >
            {isSigning ? 'Signing...' : 'Generate Address Proof Signature'}
          </button>
        </div>

        <div className={stepOneStyles.stepContainer}>
          <div className={stepOneStyles.stepBlock}>
            <div className={stepOneStyles.stepLast}>Step 2.</div>
            <div className={stepOneStyles.stepLastStrong}>Scan QR with Self app</div>
          </div>
        </div>

        <div className={stepOneStyles.stepContainer}>
          <div className={stepOneStyles.stepBlock}>
            <div className={stepOneStyles.stepLast}>Step 3.</div>
            <div className={stepOneStyles.stepLastStrong}>Check Verification Status</div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'step2') {
    return (
      <div className={stepTwoStyles.card}>
        <h2 className={stepTwoStyles.title}>Generate Address Proof</h2>

        <div className={stepTwoStyles.successPadding}>
          <div className={stepTwoStyles.successBanner}>
            <div className={stepTwoStyles.successTitle}>
              <Image
                src="/verify/check_success.svg"
                alt="check"
                width={9.4}
                height={10.3}
                priority
              />
              <div>EIP-191 Signature generated!</div>
            </div>
            <div className={stepTwoStyles.signatureHash}>
              Signature: {signature ? `${signature.slice(0, 20)}...${signature.slice(-10)}` : '0x7208653b7dbc280814...071d89241c'}
            </div>
          </div>
        </div>

        <div className={stepTwoStyles.successPaddingQr}>
          <div className={stepTwoStyles.stepBlock}>
            <div className={stepTwoStyles.stepNumber}>Step 2.</div>
            <div className={stepTwoStyles.stepNumberStrong}>Scan QR with Self app</div>
          </div>

          <QRCodeDisplay address={effectiveAddress} signature={signature} onProofVerified={handleProofVerified} />

          <div style={{
            marginTop: '16px',
            padding: '12px',
            fontFamily: '"Work Sans", sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#0b1b47',
            textAlign: 'center'
          }}>
            Download the Self app if needed. Follow the in-app instructions to complete verification.
          </div>
        </div>

        <div className={stepTwoStyles.stepContainer}>
          <div className={stepTwoStyles.stepBlockQr}>
            <div className={stepTwoStyles.stepLast}>Step 3.</div>
            <div className={stepTwoStyles.stepLastStrong}>Check Verification Status</div>
          </div>
        </div>
      </div>
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
                Continue to the NFT claim app on the Human appchain
              </p>
            </div>
          </div>

          <div className={successStyles.buttonWrapper}>
            <button
              onClick={handleContinue}
              className={buttonStyles.button}
              style={{ width: '100%' }}
            >
              Go to Human Appchain
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Error state
  return (
    <div className={errorStyles.card}>
      <h2 className={errorStyles.title}>Generate Address Proof</h2>

      <div className={errorStyles.successPadding}>
        <div className={errorStyles.successBanner}>
          <div className={errorStyles.successTitle}>
            <Image
              src="/verify/check_success.svg"
              alt="check"
              width={9.4}
              height={10.3}
              priority
            />
            <div>EIP-191 Signature generated!</div>
          </div>
        </div>
      </div>

      <div className={errorStyles.successPaddingQr}>
        <div className={errorStyles.stepBlock}>
          <div className={errorStyles.stepNumber}>Step 2.</div>
          <div className={errorStyles.stepNumberStrong}>Scan QR with Self app</div>
        </div>

        <QRCodeDisplay address={effectiveAddress} signature={signature} />
      </div>

      <div className={errorStyles.successPadding}>
        <div className={errorStyles.errorPadding}>
          <div className={errorStyles.alertHeader}>
            <Image
              src="/verify/check_fail.svg"
              alt="error"
              width={10.18}
              height={10.18}
              priority
            />
            <span className={errorStyles.alertTitle}>
              Error checking verification status. Please, scan and verify again.
            </span>
          </div>
          <button
            onClick={handleRetry}
            className={buttonStyles.button}
            style={{ width: '100%' }}
          >
            Check your Verification Status
          </button>
        </div>
      </div>
    </div>
  );
}

