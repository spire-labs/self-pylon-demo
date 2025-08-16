"use client";
import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { fromSuccessEvent } from '@self-pylon-demo/self-adapter';

// Import Self QR components (package must be installed in the app workspace)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SelfQRcodeWrapper, SelfAppBuilder } from '@selfxyz/qrcode';

type Props = {
  address?: string;
};

function Inner({ address }: Props) {
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [status, setStatus] = useState<string>('Scan QR code with Self app');
  const [proofData, setProofData] = useState<any>(null);
  const [signature, setSignature] = useState<string>('');

  // Function to generate signature proving address ownership
  const generateSignature = async (userAddress: string): Promise<string> => {
    if (!userAddress) return '';
    
    try {
      // Create message to sign
      const message = `I confirm that both this passport and public address ${userAddress} are owned by me`;
      console.log('[SelfQR] Message to sign:', message);
      
      // Prompt user to sign with their wallet
      const signature = await signMessageAsync({ message });
      
      console.log('[SelfQR] Signature generated:', signature);
      setSignature(signature);
      setStatus('✅ Signature generated! You can now scan the QR code.');
      return signature;
    } catch (error) {
      console.error('[SelfQR] Error generating signature:', error);
      setStatus('❌ Failed to generate signature. Please try again.');
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
    
    return new SelfAppBuilder({
      version: 2,
      appName: 'Self ↔ Pylon Demo',
      scope: scopeSeed,
      endpoint,
      userId: address ?? '0x0000000000000000000000000000000000000000',
      endpointType: 'celo', // Use Celo for on-chain validation
      userIdType: 'hex',
      userDefinedData: signatureToUse, // Pass the real signature here
      disclosures: {
        minimumAge: 18,
        ofac: true,
      }
    }).build();
  }, [address, signature]);

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
          // Check if the user is now verified on-chain
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

    try {
      // Create a client to read from the contract
      const { createPublicClient, http } = await import('viem');
      const celoClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || ''),
        chain: {
          id: Number(process.env.NEXT_PUBLIC_CELO_L2_CHAIN_ID || 42220),
          name: 'Celo L2',
          nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
          rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_CELO_L2_RPC_URL || ''] } }
        }
      });

      const hubRootAddr = (process.env.NEXT_PUBLIC_HUB_ROOT_ADDRESS || process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS) as `0x${string}`;
      
      if (hubRootAddr && hubRootAddr !== '0x0000000000000000000000000000000000000000') {
        const verified = await celoClient.readContract({
          address: hubRootAddr,
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
          setStatus('✅ Verification successful! You are now attested as human on-chain.');
          setProofData({ verified: true, address });
        } else {
          setStatus('❌ Verification failed or pending. Please try again.');
        }
      } else {
        setStatus('❌ Contract address not configured. Cannot verify status.');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setStatus('❌ Error checking verification status. Please try again.');
    }
  };

  return (
    <div>
      {!signature && address && (
        <div style={{ 
          marginBottom: 16, 
          padding: '12px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '4px' 
        }}>
          <p style={{ margin: 0, color: '#856404' }}>
            ⚠️ You must generate a signature before scanning the QR code. The QR code below will not work without proof of address ownership.
          </p>
        </div>
      )}
      
      {signature ? (
        <div style={{ marginBottom: 16 }}>
          {selfApp && (
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={() => {
                console.log('Self success event received');
                setStatus('Self verification completed! Checking on-chain status...');
                // Check verification status on-chain
                checkVerificationStatus();
              }}
              onError={(error: any) => {
                console.error('Self error:', error);
                setStatus(`Error: ${error.message || 'Unknown error'}`);
              }}
            />
          )}
          <div style={{ 
            marginTop: 16, 
            padding: '12px', 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '4px' 
          }}>
            <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
              ✅ QR Code Ready! Scan with Self app to generate your proof.
            </p>
          </div>
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
      
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
        <strong>Status:</strong> {status}
        {proofData && (
          <div style={{ marginTop: 8 }}>
            <strong>Verification Data:</strong>
            <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(proofData, null, 2)}</pre>
          </div>
        )}
        {address && (
          <div style={{ marginTop: 16 }}>
            {!signature ? (
              <div style={{ marginBottom: 16 }}>
                <button 
                  onClick={() => generateSignature(address)}
                  disabled={isSigning}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {isSigning ? 'Signing...' : 'Generate Address Proof Signature'}
                </button>
                <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                  You must sign a message to prove you own this address before scanning the QR code
                </p>
              </div>
            ) : (
              <div style={{ 
                marginBottom: 16, 
                padding: '12px', 
                backgroundColor: '#d4edda', 
                border: '1px solid #c3e6cb', 
                borderRadius: '4px' 
              }}>
                <p style={{ margin: 0, color: '#155724' }}>
                  ✅ Signature generated! You can now scan the QR code with Self app.
                </p>
                <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0 0' }}>
                  Signature: {signature.substring(0, 20)}...{signature.substring(signature.length - 10)}
                </p>
              </div>
            )}
            
            <button 
              onClick={checkVerificationStatus}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Check Verification Status
            </button>
            
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Use these buttons to generate address proof and check verification status
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Ensure no SSR for this component
const SelfQR = dynamic(async () => Inner, { ssr: false });
export default SelfQR;


