"use client";
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GradientBackground from '../../components/GradientBackground';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HumanNFTABI } from '@self-pylon-demo/abis';
import {
  cleanRevertMessage,
  extractErrorMessage,
  isNullifierUsedError,
  simulateMint
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
      setMintStatus('Minting...');
      const txHash = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: []
      });
      
      setMintStatus(`Submitted: ${txHash}\n⏳ Waiting for confirmation...`);
      setIsWaitingForReceipt(true);
      
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        setIsWaitingForReceipt(false);
        
        if (receipt.status === 'reverted') {
          const revertReason = await simulateMintCall() ?? 'Transaction reverted';
          
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
        const errorMessage = cleanRevertMessage(extractErrorMessage(e));
        
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
    <div className="min-h-screen relative">
      <GradientBackground />
      <div className="relative z-10">
        <Header currentNetwork={currentNetwork} onNetworkChange={setCurrentNetwork} />
        
        <main className="container mx-auto px-6" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
          <div className="max-w-4xl mx-auto">
            <Card 
              style={{
                background: 'linear-gradient(rgba(197, 247, 227, 0.3) -16.5%, rgba(255, 255, 255, 0.3) 75.77%), linear-gradient(rgba(255, 213, 224, 0.2) 50%, rgba(255, 80, 120, 0.15))',
                borderRadius: '4px',
                padding: '16px'
              }}
            >
              <CardContent className="space-y-6 text-center">
                <h1 
                  className="font-medium text-[#0B1B47] text-center" 
                  style={{ 
                    fontFamily: '"Concrette S TRIAL", sans-serif', 
                    fontSize: '40px',
                    lineHeight: '36px',
                    letterSpacing: '-0.8px',
                    marginBottom: '12px'
                  }}
                >
                  Success!<br />&quot;I am human&quot;
                </h1>
                <p 
                  className="font-medium text-[#0B1B47] text-center" 
                  style={{ 
                    fontFamily: '"Concrette S TRIAL", sans-serif', 
                    fontSize: '24px',
                    lineHeight: '24px',
                    marginBottom: '8px'
                  }}
                >
                  NFT is minted!
                </p>
                <p className="text-gray-600" style={{ fontFamily: '"Work Sans", sans-serif', marginBottom: '16px' }}>
                  It will take a few minutes for the NFT<br />
                  to mint and appear in your wallet
                </p>
                
                <div 
                  className="flex items-center justify-center gap-2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontFamily: '"Work Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#000000',
                    marginBottom: '16px'
                  }}
                >
                  <span>Your identity has been verified using Self</span>
                  <svg className="w-5 h-5" style={{ color: '#22C55E' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                
                <Button
                  onClick={handleMintAnother}
                  disabled={isWritePending || isWaitingForReceipt}
                  size="lg"
                  className="w-full max-w-md mx-auto"
                  style={{
                    fontFamily: '"Work Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '17.5px',
                    letterSpacing: '-0.7px',
                    background: `
                      linear-gradient(rgba(197, 247, 227, 0.3) -78%, rgba(11, 27, 71, 0)),
                      linear-gradient(0deg, rgb(11, 27, 71), rgb(11, 27, 71))
                    `,
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    padding: '16px 18px',
                    opacity: (isWritePending || isWaitingForReceipt) ? 0.7 : 1,
                    cursor: (isWritePending || isWaitingForReceipt) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isWritePending ? 'Minting...' : isWaitingForReceipt ? 'Waiting for confirmation...' : 'Try to mint another to see Human NFT\'s Sybil resistance in action'}
                </Button>
                {mintStatus && (
                  <div style={{ 
                    marginTop: '16px', 
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
              </CardContent>
            </Card>
          </div>
        </main>
        
        <footer className="text-center py-8 text-sm text-gray-600">
          This appchain synchronously reads proof from Celo via Spire&apos;s Pylon
        </footer>
      </div>
    </div>
  );
}

