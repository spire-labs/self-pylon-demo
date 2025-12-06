"use client";
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GradientBackground from '../../components/GradientBackground';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function FailPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [currentNetwork, setCurrentNetwork] = useState<'celo' | 'pylon'>('pylon');

  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);

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
                background: 'linear-gradient(rgba(255, 213, 224, 0.3) -16.5%, rgba(255, 255, 255, 0.3) 75.77%), linear-gradient(rgba(255, 213, 224, 0.2) 50%, rgba(255, 80, 120, 0.15))',
                borderRadius: '4px',
                padding: '16px'
              }}
            >
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <svg className="w-8 h-8 flex-shrink-0" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <h1 
                      className="font-medium text-[#0B1B47] mb-2" 
                      style={{ 
                        fontFamily: '"Concrette S TRIAL", sans-serif', 
                        fontSize: '24px',
                        lineHeight: '24px',
                        fontWeight: 500
                      }}
                    >
                      Failed. Your Self passport has already<br />
                      been used to get this NFT!
                    </h1>
                    <p className="text-gray-600" style={{ fontFamily: '"Work Sans", sans-serif' }}>
                      Sybil resistance prevents duplicate mints. One person = one NFT.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setCurrentNetwork('pylon');
                    router.push('/verify/one');
                  }}
                  size="lg"
                  className="w-full"
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
                    padding: '16px 18px'
                  }}
                >
                  Back to Human Appchain
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="mt-8"
              style={{
                background: 'linear-gradient(rgba(189, 194, 247, 0.7) -16.5%, rgba(255, 255, 255, 0.3) 75.77%), linear-gradient(rgba(255, 213, 224, 0.2) 50%, rgba(255, 80, 120, 0.15))',
                borderRadius: '4px',
                padding: '16px'
              }}
            >
              <CardContent>
                <h2 
                  className="text-2xl font-medium text-[#0B1B47]" 
                  style={{ 
                    fontFamily: '"Concrette S TRIAL", sans-serif',
                    fontSize: '24px',
                    lineHeight: '24px',
                    padding: '18px',
                    marginBottom: 0,
                    fontWeight: 500
                  }}
                >
                  FAQ
                </h2>
                <div className="space-y-6" style={{ paddingTop: '8px' }}>
                  <div>
                    <p className="font-semibold text-[#0B1B47] mb-2" style={{ fontFamily: '"Work Sans", sans-serif' }}>
                      Can I associate my Self passport with another public wallet address?
                    </p>
                    <p className="text-gray-600" style={{ fontFamily: '"Work Sans", sans-serif' }}>
                      No. Our sybil-resistance protocol ensures one passport can only be used once, preventing any wallet switching to gain multiple NFTs.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#0B1B47] mb-2" style={{ fontFamily: '"Work Sans", sans-serif' }}>
                      Can I mint another NFT?
                    </p>
                    <p className="text-gray-600" style={{ fontFamily: '"Work Sans", sans-serif' }}>
                      No. Your Self passport grants the right to only one NFT in this collection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

