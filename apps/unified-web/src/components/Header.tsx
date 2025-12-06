"use client";
import { useAccount, useDisconnect, useSwitchChain, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useRouter } from 'next/navigation';
import { celo } from '../chains/celo';
import { pylon } from '../chains/pylon';
import Logo from './Logo';
import NetworkToggle from './ui/NetworkToggle';
import buttonStyles from './ui/Button.module.css';
import mainStyles from './HeaderMain.module.css';
import changeStyles from './Header.module.css';

type NetworkView = 'celo' | 'pylon';

interface HeaderProps {
  variant?: 'main' | 'change';
  currentNetwork?: NetworkView;
  onNetworkChange?: (network: NetworkView) => void;
  address?: string;
  onDisconnect?: () => void;
  onConnectClick?: () => void;
}

export default function Header({ 
  variant = 'main',
  currentNetwork,
  onNetworkChange,
  address,
  onDisconnect,
  onConnectClick 
}: HeaderProps) {
  const { isConnected, address: connectedAddress, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { connect, isPending } = useConnect();
  const router = useRouter();

  const effectiveAddress = address || connectedAddress;
  const effectiveIsConnected = address ? true : isConnected;

  const handleNetworkSwitch = async (network: NetworkView) => {
    if (onNetworkChange) {
      onNetworkChange(network);
    }
    
    // Redirect to appropriate page based on network
    if (network === 'celo') {
      router.push('/attestation/one');
    } else if (network === 'pylon') {
      router.push('/verify/one');
    }
    
    // Optionally switch network if connected
    if (effectiveIsConnected && network === 'pylon' && chainId !== pylon.id) {
      try {
        await switchChain({ chainId: pylon.id });
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    } else if (effectiveIsConnected && network === 'celo' && chainId !== celo.id) {
      try {
        await switchChain({ chainId: celo.id });
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    }
  };

  const displayNetwork = currentNetwork || (chainId ? (chainId === pylon.id ? 'pylon' : 'celo') : 'celo');

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    } else {
      disconnect();
    }
  };

  if (variant === 'main') {
    return (
      <div className={mainStyles.container} style={{ cursor: 'pointer' }}>
        <div className={mainStyles.logoContainer} onClick={() => router.push('/')}>
          <Logo />
        </div>
        <button
          onClick={() => {
            if (onConnectClick) {
              onConnectClick();
            } else {
              connect({ connector: injected() });
            }
          }}
          disabled={isPending}
          className={buttonStyles.button}
          style={{
            width: 140,
            height: 42,
            fontFamily: 'Work Sans',
            fontWeight: 500,
            fontStyle: 'normal',
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: '-0.05em',
            textAlign: 'center',
          }}
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  // Change variant (with network toggle)
  return (
    <div className={changeStyles.container}>
      <div className={changeStyles.headerGrid}>
        <div className={changeStyles.logoContainer} onClick={() => router.push('/')}>
          <Logo />
        </div>

        {effectiveIsConnected && effectiveAddress && (
          <div className={changeStyles.toggleContainer}>
            <NetworkToggle value={displayNetwork} onChange={handleNetworkSwitch} />
          </div>
        )}

        <div className={changeStyles.buttonContainer}>
          {effectiveIsConnected && effectiveAddress ? (
            <button
              onClick={handleDisconnect}
              className={buttonStyles.connected}
              style={{ width: 270, height: 42 }}
            >
              <span className={buttonStyles.connectedText}>Connected Wallet</span>
              <span className={buttonStyles.address}>{effectiveAddress.slice(0, 6)}...{effectiveAddress.slice(-4)}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (onConnectClick) {
                  onConnectClick();
                } else {
                  connect({ connector: injected() });
                }
              }}
              disabled={isPending}
              className={buttonStyles.button}
              style={{
                width: 140,
                height: 42,
                fontFamily: 'Work Sans',
                fontWeight: 500,
                fontStyle: 'normal',
                fontSize: 14,
                lineHeight: 1.25,
                letterSpacing: '-0.05em',
                textAlign: 'center',
              }}
            >
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

