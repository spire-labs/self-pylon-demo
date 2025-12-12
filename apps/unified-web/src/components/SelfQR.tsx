"use client";
import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';
import { useAccount, useSignMessage, usePublicClient, useSwitchChain } from 'wagmi';
import { celo } from '../chains/celo';
import { fromSuccessEvent } from '@self-pylon-demo/self-adapter';

// Import Self QR components (package must be installed in the app workspace)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode';
import { getUniversalLink, SelfApp } from '@selfxyz/common/utils/appType';

function isLikelyMobile() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  const coarse = window.matchMedia?.('(pointer:coarse)')?.matches;
  const smallScreen = window.innerWidth < 900;
  const mobileRegex = /android|iphone|ipad|ipod|iemobile|mobile/i;
  return mobileRegex.test(ua) || coarse || smallScreen;
}

type Props = {
  address?: string;
  onProofVerified?: () => void;
};

function Inner({ address, onProofVerified }: Props) {
  const { address: connectedAddress, chainId } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<string>('Scan QR code with Self app');
  const [proofData, setProofData] = useState<any>(null);
  const [signature, setSignature] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [useDeeplink, setUseDeeplink] = useState(false);
  const effectiveSignature = signature;

  // Detect mobile early for UX hints (no SSR)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMobile(isLikelyMobile());
  }, []);

  // Load signature from localStorage if available - check immediately on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSig = localStorage.getItem('attestation_signature');
      if (storedSig) {
        console.log('[SelfQR] Loaded signature from localStorage:', storedSig.substring(0, 20) + '...');
        setSignature(storedSig);
        setStatus('✅ Signature loaded. QR code ready to scan.');
      } else {
        console.log('[SelfQR] No signature found in localStorage');
        setStatus('⚠️ No signature found. Please generate a signature first.');
      }
    }
  }, []); // Run once on mount

  // Also reload if address changes (user reconnects)
  useEffect(() => {
    if (typeof window !== 'undefined' && address && !signature) {
      const storedSig = localStorage.getItem('attestation_signature');
      if (storedSig) {
        console.log('[SelfQR] Reloaded signature after address change:', storedSig.substring(0, 20) + '...');
        setSignature(storedSig);
      }
    }
  }, [address, signature]);

  // Function to generate signature proving address ownership
  const generateSignature = async (userAddress: string): Promise<string> => {
    if (!userAddress) return '';
    
    try {
      // Create message to sign
      const message = `I confirm that both this passport and public address ${userAddress.toLowerCase()} are owned by me`;
      console.log('[SelfQR] Message to sign:', message);
      
      // Use personal_sign to generate EIP-191 signature
      const signature = await signMessageAsync({ message });
      
      console.log('[SelfQR] EIP-191 signature generated:', signature);
      setSignature(signature);
      setStatus('✅ EIP-191 signature generated! You can now scan the QR code.');
      return signature;
    } catch (error) {
      console.error('[SelfQR] Error generating EIP-191 signature:', error);
      setStatus('❌ Failed to generate EIP-191 signature. Please try again.');
      return '';
    }
  };

  const selfApp = useMemo(() => {
    // For on-chain validation, Self SDK requires the contract address as endpoint
    const endpoint = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS;
    // Get the scope seed (short string) - this is what SelfAppBuilder expects
    const scopeSeed = process.env.NEXT_PUBLIC_SELF_SCOPE;
    console.log('[SelfQR] Building Self app with scope seed:', scopeSeed, 'endpoint:', endpoint);
    console.log('[SelfQR] Scope seed type:', typeof scopeSeed, 'Scope seed length:', scopeSeed?.length);
    
    if (!scopeSeed) {
      console.error('[SelfQR] No scope seed provided! Set NEXT_PUBLIC_SELF_SCOPE in .env.local');
      return null;
    }
    
    if (!endpoint) {
      console.error('[SelfQR] No endpoint provided! Set NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS in .env.local');
      return null;
    }

    // Use generated signature or placeholder if none available
    const signatureToUse = signature || '0x' + '0'.repeat(130);
    
    // The contract expects 129 bytes: 64 bytes prefix + 65 bytes signature
    // Create the userData array that matches what the contract expects
    // let userDefinedData = signature
    let userDefinedData;
    if (signature) {
      // Convert signature to hex string for userDefinedData
      // Remove '0x' prefix and convert hex string to bytes
      const signatureHex = signature.slice(2); // Remove '0x' prefix
      const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      userDefinedData = '0x' + Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('[SelfQR] userDefinedData length (hex chars):', userDefinedData.length - 2); // -2 for '0x'
      console.log('[SelfQR] userDefinedData first 100 chars:', userDefinedData.substring(0, 100));
      console.log('[SelfQR] userDefinedData last 100 chars:', userDefinedData.substring(userDefinedData.length - 100));
    } else {
      // Placeholder data
      userDefinedData = '0x' + '0'.repeat(258); // 129 bytes = 258 hex chars
    }
    
    return new SelfAppBuilder({
      version: 2,
      appName: 'Self ↔ Pylon Demo',
      scope: scopeSeed,
      endpoint,
      userId: address || connectedAddress || '0x0000000000000000000000000000000000000000',
      endpointType: 'celo', // Use Celo for on-chain validation
      userIdType: 'hex',
      userDefinedData: userDefinedData, // Pass the properly formatted data
      disclosures: {
        minimumAge: 18,
        ofac: true,
      }
    }).build();
  }, [address, connectedAddress, signature]);

  const universalLink = useMemo(() => {
    try {
      return selfApp ? getUniversalLink(selfApp as SelfApp) : '';
    } catch (err) {
      console.error('[SelfQR] Failed generating universal link:', err);
      return '';
    }
  }, [selfApp]);

  // Listen for WebSocket events from Self app
  useEffect(() => {
    // Listen for messages from Self SDK WebSocket
    const handleSelfMessage = (event: any) => {
      try {
        // Self WebSocket sends data directly as objects
        const data = event.data || event;
        console.log('[WebSocket] Raw mobile_status event received:', data);
        
        if (data.status === 'mobile_connected') {
          setStatus('Mobile device connected');
          console.log('[WebSocket] Mobile device connected. Emitting self_app event with payload:', data);
          if (selfApp && typeof (selfApp as any).emit === 'function') {
            (selfApp as any).emit('self_app', data);
          }
        } else if (data.status === 'mobile_disconnected') {
          setStatus('Mobile device disconnected');
          console.log('[WebSocket] Mobile device disconnected.');
        } else if (data.status === 'proof_generation_failed') {
          setStatus(`Proof generation failed: ${data.reason || 'Unknown error'}`);
          console.log('[WebSocket] Proof generation failed.');
        } else if (data.status === 'proof_generated' && data.proof) {
          setStatus('Proof generated successfully!');
          setProofData(data.proof);
          console.log('[WebSocket] Proof generated successfully:', data.proof);
        } else if (data.status === 'proof_verified') {
          setStatus('Proof verified on-chain! Checking verification status...');
          console.log('[WebSocket] Proof verified on-chain:', data);
          // Notify parent component that proof was verified, so it can start polling
          if (onProofVerified) {
            onProofVerified();
          }
          // Also check verification status locally
          checkVerificationStatus();
        }
      } catch (error) {
        console.error('Error handling Self WebSocket message:', error);
      }
    };

    // Listen to Self WebSocket events
    if (selfApp && typeof (selfApp as any).on === 'function') {
      (selfApp as any).on('mobile_status', handleSelfMessage);
      return () => {
        if (selfApp && typeof (selfApp as any).off === 'function') {
          (selfApp as any).off('mobile_status', handleSelfMessage);
        }
      };
    } else {
      // Fallback: listen to window messages but filter for Self events
      const handleWindowMessage = (event: MessageEvent) => {
        // Only process messages that look like Self WebSocket events
        if (event.data && typeof event.data === 'object' && event.data.status) {
          handleSelfMessage(event.data);
        }
      };
      
      window.addEventListener('message', handleWindowMessage);
      return () => window.removeEventListener('message', handleWindowMessage);
    }
  }, [selfApp]);

  // Function to check verification status on-chain
  const checkVerificationStatus = async () => {
    if (!address) {
      setStatus('No wallet address to check verification status');
      return;
    }

    // Ensure we're on Celo before making the call
    if (chainId && chainId !== celo.id) {
      try {
        await switchChain({ chainId: celo.id });
        // Wait a moment for the chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('[SelfQR] Failed to switch to Celo:', error);
        setStatus('❌ Please switch to Celo network to check verification status');
        return;
      }
    }

    try {
      const proofOfHumanAddr = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS as `0x${string}`;
      
      if (proofOfHumanAddr && proofOfHumanAddr !== '0x0000000000000000000000000000000000000000') {
        console.log('[SelfQR] Checking verification status for address:', address);
        console.log('[SelfQR] ProofOfHuman contract address:', proofOfHumanAddr);
        
        try {
          if (!publicClient) {
            throw new Error('Public client not available');
          }
          
          // Use wagmi's publicClient
          const isVerified = await publicClient.readContract({
            address: proofOfHumanAddr,
            abi: [{ 
              name: 'isVerified', 
              type: 'function', 
              inputs: [{ name: 'user', type: 'address' }], 
              outputs: [{ name: '', type: 'bool' }], 
              stateMutability: 'view' 
            }],
            functionName: 'isVerified',
            args: [address as `0x${string}`]
          });
          
          console.log('[SelfQR] Verification result:', isVerified);
          
          if (isVerified) {
            setStatus('✅ Verification successful! You are now attested as human on-chain.');
            setProofData({ verified: true, address });
          } else {
            setStatus('❌ Verification failed or pending. Please try again.');
          }
        } catch (contractError: any) {
          console.error('[SelfQR] Contract call error:', contractError);
          
          // Check if the contract exists and has code using wagmi's publicClient
          try {
            if (publicClient) {
              const code = await publicClient.getBytecode({ address: proofOfHumanAddr });
              if (!code || code === '0x') {
                setStatus('❌ Contract not deployed at this address. Please check your configuration.');
              } else {
                setStatus(`❌ Contract call failed: ${contractError.message || 'Unknown error'}. The contract might not be properly initialized.`);
              }
            } else {
              setStatus(`❌ Contract call failed: ${contractError.message || 'Unknown error'}.`);
            }
          } catch (codeError) {
            setStatus(`❌ Contract call failed: ${contractError.message || 'Unknown error'}.`);
          }
        }
      } else {
        setStatus('❌ ProofOfHuman contract address not configured. Cannot verify status.');
      }
    } catch (error: any) {
      console.error('Error checking verification status:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      setStatus(`❌ Error checking verification status: ${errorMessage}. Check the console for details.`);
    }
  };

  // When returning from Self app (deeplink flow), re-check verification as a safety net
  useEffect(() => {
    if (!useDeeplink) return;
    const handler = () => {
      // Only re-check if we have a signature and a built selfApp
      if (effectiveSignature && selfApp) {
        checkVerificationStatus();
      }
    };
    window.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, [useDeeplink, effectiveSignature, selfApp]);

  // Primary mechanism: Poll for verification status when deeplink flow is active
  // This starts when user clicks "Open in Self app" and continues until verified
  useEffect(() => {
    if (!useDeeplink || !effectiveSignature || !selfApp || !address) return;
    
    let interval: NodeJS.Timeout | null = null;
    let isCleanedUp = false;
    
    const pollVerification = async () => {
      if (isCleanedUp) return;
      
      try {
        // Ensure we're on Celo before checking
        if (chainId && chainId !== celo.id) {
          try {
            await switchChain({ chainId: celo.id });
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error('[SelfQR] Failed to switch to Celo for polling:', error);
            return;
          }
        }
        
        if (!publicClient) return;
        
        const proofOfHumanAddr = process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS as `0x${string}`;
        if (!proofOfHumanAddr || proofOfHumanAddr === '0x0000000000000000000000000000000000000000') {
          return;
        }
        
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
          args: [address as `0x${string}`]
        });
        
        if (verified) {
          // Success! Stop polling and notify
          console.log('[SelfQR] Verification detected via polling!');
          setStatus('✅ Verification successful! You are now attested as human on-chain.');
          setProofData({ verified: true, address });
          if (onProofVerified) {
            onProofVerified();
          }
          // Clean up polling
          if (interval) clearInterval(interval);
          interval = null;
        }
      } catch (error) {
        console.error('[SelfQR] Error during verification polling:', error);
        // Continue polling on error (might be transient)
      }
    };
    
    // Start polling immediately, then every 5 seconds
    pollVerification();
    interval = setInterval(pollVerification, 5000);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      isCleanedUp = true;
      if (interval) clearInterval(interval);
    };
  }, [useDeeplink, effectiveSignature, selfApp, address, chainId, switchChain, publicClient, onProofVerified]);

  return (
    <div>
      {effectiveSignature && selfApp ? (
        <div style={{ marginBottom: 16 }}>
          {isMobile && universalLink && (
            <div
              style={{
                marginBottom: 12,
                padding: '12px',
                borderRadius: 8,
                background:
                  'linear-gradient(180deg, rgba(197, 247, 227, 0.35) 0%, rgba(197, 247, 227, 0.1) 100%)',
                border: '1px solid rgba(11, 27, 71, 0.12)',
                color: '#0b1b47',
                fontFamily: '"Work Sans", sans-serif',
                fontSize: 12,
                lineHeight: '150%',
                letterSpacing: '-0.02em',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Mobile detected</div>
              <div style={{ opacity: 0.85, marginBottom: 8 }}>
                Tap the link below to send your signed message to Self if on mobile.
              </div>
              <a
                href={universalLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => setUseDeeplink(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  background:
                    'linear-gradient(180deg, rgba(11, 27, 71, 0.9) 0%, rgba(11, 27, 71, 0.78) 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  boxShadow: '0 8px 20px rgba(11, 27, 71, 0.25)',
                }}
              >
                Open in Self app
                <span aria-hidden style={{ opacity: 0.9 }}>↗</span>
              </a>
            </div>
          )}
          <SelfQRcodeWrapper
            selfApp={selfApp}
            type="websocket"
            onSuccess={() => {
              // Works for both websocket (QR) and deeplink (button) flows
              console.log('Self success event received');
              setStatus('Self verification completed! Checking on-chain status...');
              if (onProofVerified) {
                onProofVerified();
              }
              checkVerificationStatus();
            }}
            onError={(error: any) => {
              console.error('Self error:', error);
              setStatus(`Error: ${error.message || 'Unknown error'}`);
            }}
          />
        </div>
      ) : (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '2px dashed #dee2e6', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '16px' }}>
            🔒 Generate your address proof signature first to unlock the QR code
          </p>
        </div>
      )}
      
      {/* Status display - hidden in production, shown for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ccc', borderRadius: 4, fontSize: '12px' }}>
          <strong>Status:</strong> {status}
        </div>
      )}
    </div>
  );
}

// Ensure no SSR for this component
const SelfQR = dynamic(async () => Inner, { ssr: false });
export default SelfQR;

