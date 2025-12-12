export type WalletType = 'metamask' | 'coinbase' | 'trust' | 'unknown';

export interface WalletInfo {
  walletType: WalletType;
  isMobileWallet: boolean;
  shouldSetCallback: boolean;
  callbackUrlBuilder?: (appUrl: string) => string;
  userAgent?: string;
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