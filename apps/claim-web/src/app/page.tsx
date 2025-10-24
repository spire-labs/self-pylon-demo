"use client";
import { useAccount, useConnect, useDisconnect, useWriteContract, useSwitchChain } from 'wagmi';
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

  const handleMint = async () => {
    if (!address) return;
    
    try {
      const nftAddr = process.env.NEXT_PUBLIC_HUMAN_NFT_ADDRESS as `0x${string}`;
      if (!nftAddr || nftAddr === '0x0000000000000000000000000000000000000000') {
        setMintStatus('Error: HumanNFT contract address not configured');
        return;
      }
      
      setMintStatus('Minting...');
      const tx = await writeContractAsync({
        address: nftAddr,
        abi: HumanNFTABI,
        functionName: 'mint',
        args: []
      });
      setMintStatus(`Submitted: ${tx}`);
    } catch (e: any) {
      console.error('Mint error:', e);
      setMintStatus(e?.message || 'Mint failed');
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
                        <p className="text-sm text-neutral-700">{mintStatus}</p>
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

