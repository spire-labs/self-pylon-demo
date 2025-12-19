"use client";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import SelfQR from './SelfQR';
import styles from './StepTwoQRCard.module.css';

type QRCodeDisplayProps = {
  address?: string;
  signature?: string;
  onProofVerified?: () => void;
};

// App download links from self.xyz/resources
const APP_STORE_LINK = 'https://apps.apple.com/in/app/self-zk/id6478563710';
const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.proofofpassportapp';

function QRCodeDisplayInner({ address, signature, onProofVerified }: QRCodeDisplayProps) {
  // Detect user's device to link to appropriate app store
  // Only redirect actual mobile devices; desktop/laptop users get resources page with both options
  const getAppStoreLink = () => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      // Check for actual mobile devices (not desktop browsers)
      // Exclude desktop browsers that might have "android" in user agent
      const isMobileDevice = 
        /iphone|ipad|ipod/.test(userAgent) || // iOS devices
        (/android/.test(userAgent) && !/linux|windows|macintosh/.test(userAgent) && /mobile/.test(userAgent)); // Android mobile (not desktop)
      
      if (isMobileDevice) {
        // For mobile devices, detect iOS vs Android
        if (/iphone|ipad|ipod/.test(userAgent)) {
          return APP_STORE_LINK;
        } else if (/android/.test(userAgent)) {
          return PLAY_STORE_LINK;
        }
      }
    }
    // For desktop/laptop or unknown devices, link to main site
    return 'https://self.xyz/';
  };

  return (
    <div className={styles.qrWrapper}>
      <SelfQR address={address} signature={signature} onProofVerified={onProofVerified} />
      <div className={styles.qrText}>Use only Self app to scan</div>
      <a
        href={getAppStoreLink()}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.logoLink}
        aria-label="Download Self app"
      >
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/attestation/self-logo.svg`}
          alt="self-logo"
          width={192}
          height={72}
          className={styles.selfLogo}
        />
        <svg
          className={styles.downloadIcon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 2V10M8 10L5 7M8 10L11 7M2 12H14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}

// Ensure no SSR for this component
const QRCodeDisplay = dynamic(async () => QRCodeDisplayInner, { ssr: false });
export default QRCodeDisplay;



