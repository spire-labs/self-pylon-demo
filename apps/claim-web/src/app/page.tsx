"use client";
import { useAccount, useConnect, useDisconnect, useWriteContract, useSwitchChain, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState, useEffect } from 'react';
import { HumanNFTABI } from '@self-pylon-demo/abis';
import { pylon } from '../chains/pylon';
import Status from '../components/Status';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Page() {
  const { isConnected, address, chainId } = useAccount();
  const { connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mintStatus, setMintStatus] = useState('');
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient();
  
  // Hydration safety - prevent server/client mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auto-switch to Pylon when connected to wrong chain
  useEffect(() => {
    if (isConnected && chainId && chainId !== pylon.id) {
      console.log(`Connected to chain ${chainId}, need to switch to Pylon (${pylon.id})`);
    }
  }, [isConnected, chainId]);

  const waitForReceipt = async (txHash: `0x${string}`) => {
    if (!publicClient) return;
    
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
        setMintStatus(`Submitted: ${txHash}\n❌ ${revertReason}`);
      } else {
        setMintStatus(`Submitted: ${txHash}\n✅ Success! Transaction confirmed.`);
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
    }
  };

  const handleMint = async () => {
    if (!address) return;
    
    try {
      const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
      if (!nftAddr || nftAddr === '0x0000000000000000000000000000000000000000') {
        setMintStatus('Error: HumanNFT contract address not configured');
        return;
      }
      
      if (!publicClient) {
        setMintStatus('Error: Public client not available');
        return;
      }
      
      setMintStatus('Minting...');
      const txHash = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: []
      });
      
      // Show transaction hash immediately with loading indicator
      setMintStatus(`Submitted: ${txHash}\n⏳ Waiting for confirmation...`);
      
      // Wait for receipt separately (fire and forget)
      waitForReceipt(txHash);
    } catch (e: any) {
      console.error('Mint error:', e);
      // Extract error message from various error formats
      let errorMessage = 'Transaction failed';
      const error = e;
      
      if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error?.message) {
        errorMessage = error.message;
        // Try to clean up common error prefixes
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
      
      setMintStatus(`❌ ${errorMessage}`);
    }
  };

  // Show loading state until hydrated to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-accent-50 flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="py-8">
            <h1 className="text-2xl font-bold mb-4">Claim "I am human" NFT</h1>
            <div>Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-accent-50">
      {/* Hero Section */}
      <div className="hero-gradient animate-gradient">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Claim Your Human NFT
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 animate-slide-up">
              Mint your "I am human" NFT on Pylon
            </p>
            <div className="flex justify-center space-x-4">
              <Badge variant="info" size="lg" className="bg-white/20 text-white border-white/30">
                🎨 NFT Collection
              </Badge>
              <Badge variant="info" size="lg" className="bg-white/20 text-white border-white/30">
                ⛓️ Pylon Network
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {!isConnected ? (
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
                <CardDescription>
                  Connect your wallet to claim your Human NFT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={() => connect({ connector: injected() })}
                  disabled={isConnectPending}
                  size="lg"
                  className="w-full"
                >
                  {isConnectPending ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Connected Wallet</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {address}
                      </CardDescription>
                    </div>
                    <Button onClick={() => disconnect()} variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {chainId && chainId !== pylon.id && (
                <Card className="status-warning">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      ⚠️ Wrong Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      You're connected to chain {chainId}, but this app requires Pylon (chain {pylon.id}).
                    </p>
                    <Button 
                      onClick={() => switchChain({ chainId: pylon.id })}
                      variant="primary"
                      size="sm"
                    >
                      Switch to Pylon
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Claim Your Human NFT</CardTitle>
                  <CardDescription>
                    This NFT can only be claimed by verified humans. The contract will automatically verify your attestation status 
                    on Celo L2 and check for any duplicate claims.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Status label="HumanNFT Contract" value={process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS || 'Not set'} />
                    <Status label="Pylon RPC" value={process.env.NEXT_PUBLIC_PYLON_RPC_URL || 'Not set'} />
                    <Status label="Pylon Chain ID" value={process.env.NEXT_PUBLIC_PYLON_CHAIN_ID || 'Not set'} />
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      disabled={!isConnected || isWritePending}
                      onClick={handleMint}
                      size="lg"
                      className="w-full"
                      variant="accent"
                    >
                      {isWritePending ? 'Minting...' : 'Mint Human NFT'}
                    </Button>
                    {mintStatus && (
                      <div className="mt-4 p-3 bg-neutral-100 rounded-lg">
                        <p className="text-sm text-neutral-700 whitespace-pre-line">{mintStatus}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

