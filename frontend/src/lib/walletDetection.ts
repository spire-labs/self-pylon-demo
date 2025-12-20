import type { PublicClient } from 'viem';

export type WalletType = 'metamask' | 'coinbase' | 'trust' | 'unknown';

export interface WalletInfo {
  walletType: WalletType;
  isMobileWallet: boolean;
  shouldSetCallback: boolean;
  callbackUrlBuilder?: (appUrl: string) => string;
  userAgent?: string;
}

export interface WalletCompatibilityInfo {
  isCompatible: boolean;
  errorMessage: string;
  isSmartWallet: boolean;
}

/**
 * Detects if we're running in a mobile wallet browser and which one
 */
export function detectWalletBrowser(): WalletInfo {
  if (typeof window === 'undefined') {
    return {
      walletType: 'unknown',
      isMobileWallet: false,
      shouldSetCallback: false
    };
  }

  const ua = navigator.userAgent || navigator.vendor || '';
  const isLikelyMobile = /android|iphone|ipad|ipod|iemobile|mobile/i.test(ua) ||
                         window.matchMedia?.('(pointer:coarse)')?.matches ||
                         window.innerWidth < 900;

  // Check for MetaMask Mobile
  if (window.ethereum && window.ethereum.isMetaMask) {
    return {
      walletType: 'metamask',
      isMobileWallet: isLikelyMobile,
      shouldSetCallback: isLikelyMobile,
      callbackUrlBuilder: (appUrl: string) => {
        // Just open MetaMask browser without specifying a URL to avoid new tab warnings
        return `https://link.metamask.io/`;
      },
      userAgent: ua
    };
  }

  // Check for Coinbase Wallet
  if (window.ethereum && window.ethereum.isCoinbaseWallet) {
    return {
      walletType: 'coinbase',
      isMobileWallet: isLikelyMobile,
      shouldSetCallback: isLikelyMobile,
      callbackUrlBuilder: (appUrl: string) => {
        const encodedUrl = encodeURIComponent(appUrl);
        return `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`;
      },
      userAgent: ua
    };
  }

  // Check for Trust Wallet
  const hasTrustFlag = window.ethereum?.isTrust ||
                      window.ethereum?.providers?.find((p: any) => p.isTrust) ||
                      (window as any).trustwallet;

  if (hasTrustFlag) {
    return {
      walletType: 'trust',
      isMobileWallet: isLikelyMobile,
      shouldSetCallback: isLikelyMobile,
      callbackUrlBuilder: (appUrl: string) => {
        const encodedUrl = encodeURIComponent(appUrl);
        return `https://link.trustwallet.com/open_url?url=${encodedUrl}`;
      },
      userAgent: ua
    };
  }

  // Unknown wallet or desktop browser
  return {
    walletType: 'unknown',
    isMobileWallet: false,
    shouldSetCallback: false,
    userAgent: ua
  };
}

/**
 * Builds the appropriate callback URL for returning to the wallet app browser
 * Only returns a URL if we're in a recognized mobile wallet browser
 */
export function buildWalletCallbackUrl(appUrl: string): string | undefined {
  const walletInfo = detectWalletBrowser();
  if (walletInfo.shouldSetCallback && walletInfo.callbackUrlBuilder) {
    return walletInfo.callbackUrlBuilder(appUrl);
  }
  return undefined;
}

/**
 * Detects if an address is a smart wallet by checking for contract bytecode
 * @param address The address to check
 * @param publicClient The viem PublicClient instance
 * @returns true if the address has contract bytecode (smart wallet indicator)
 */
export async function detectSmartWallet(
  address: string | undefined,
  publicClient: PublicClient | undefined
): Promise<boolean> {
  if (!address || !publicClient) {
    return false;
  }

  try {
    const bytecode = await publicClient.getBytecode({ address: address as `0x${string}` });
    // If bytecode exists and is not empty, it's a contract (smart wallet)
    return bytecode !== undefined && bytecode !== '0x' && bytecode.length > 2;
  } catch (error) {
    console.error('[walletDetection] Error checking bytecode:', error);
    // If we can't check, assume it's not a smart wallet to avoid false positives
    return false;
  }
}

/**
 * Gets wallet compatibility information and user-friendly error messages
 * @param address The wallet address
 * @param publicClient The viem PublicClient instance
 * @returns Compatibility info with error message if incompatible
 */
export async function getWalletCompatibilityInfo(
  address: string | undefined,
  publicClient: PublicClient | undefined
): Promise<WalletCompatibilityInfo> {
  if (!address || !publicClient) {
    return {
      isCompatible: false,
      errorMessage: 'Wallet address or client not available',
      isSmartWallet: false
    };
  }

  const isSmartWallet = await detectSmartWallet(address, publicClient);
  
  if (isSmartWallet) {
    return {
      isCompatible: false,
      errorMessage: 'The wallet did not generate a valid signature. Please use a standard EOA wallet (like MetaMask, regular Coinbase Wallet, or Trust Wallet) for best results.',
      isSmartWallet: true
    };
  }

  // If not a smart wallet, it might be a general EIP-191 compatibility issue
  return {
    isCompatible: true,
    errorMessage: '',
    isSmartWallet: false
  };
}

/**
 * Determines if universal links should be disabled based on wallet browser
 * Currently checks for feature flag and can be extended with problematic wallet types
 * @returns true if universal links should be disabled
 */
export function shouldDisableUniversalLinks(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for feature flag (can be set via environment variable or localStorage)
  const featureFlag = process.env.NEXT_PUBLIC_DISABLE_UNIVERSAL_LINKS === 'true' ||
                      (typeof window !== 'undefined' && 
                       window.localStorage?.getItem('disableUniversalLinks') === 'true');
  
  if (featureFlag) {
    return true;
  }

  // Can be extended to check for specific problematic wallet types
  // For example, if certain wallets have unreliable universal link support
  const walletInfo = detectWalletBrowser();
  
  // Example: disable for unknown wallets if needed
  // if (walletInfo.walletType === 'unknown') {
  //   return true;
  // }

  return false;
}
