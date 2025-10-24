"use client";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';
import SelfQR from '../components/SelfQR';
import Status from '../components/Status';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Page() {
  const { isConnected, address } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50">
      {/* Hero Section */}
      <div className="hero-gradient animate-gradient">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Self Attestation
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 animate-slide-up">
              Verify your humanity on Celo L2 with Self Protocol
            </p>
            <div className="flex justify-center">
              <Badge variant="info" size="lg" className="bg-white/20 text-white border-white/30">
                🔗 Celo L2 Network
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
                  Connect your wallet to start the attestation process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={() => connect({ connector: injected() })}
                  disabled={isPending}
                  size="lg"
                  className="w-full"
                >
                  {isPending ? 'Connecting...' : 'Connect Wallet'}
                </Button>
                <div className="status-info p-4 rounded-lg">
                  <p className="text-sm">
                    🔒 Connect your wallet to start the attestation process
                  </p>
                </div>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Generate Address Proof</CardTitle>
                  <CardDescription>
                    Scan the QR code with the Self app to generate your proof
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SelfQR address={address} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Contract Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Status label="Contract Address" value={process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS} />
                  <p className="text-sm text-neutral-600">
                    After generating a proof in Self, it will be automatically submitted on-chain to verify your humanity.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

