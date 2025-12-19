"use client";
import styles from './FooterAttestation.module.css';

interface FooterAttestationProps {
  contractAddress?: string;
}

export default function FooterAttestation({ contractAddress }: FooterAttestationProps) {
  const address = contractAddress || process.env.NEXT_PUBLIC_PROOF_OF_HUMAN_ADDRESS || '0x505a5CC..f711a8';
  const displayAddress = address.length > 20 ? `${address.slice(0, 11)}...${address.slice(-6)}` : address;
  const sourcifyUrl = address && address.length > 20 ? `https://sourcify.dev/#/lookup/${address}` : '#';

  return (
    <div className={styles.container}>
      <div className={styles.desktopText}>
        <div className={styles.left}>
          Contract Address:{' '}
          <a
            href={sourcifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
            onClick={(e) => {
              if (address.length <= 20) {
                e.preventDefault();
              }
            }}
          >
            {displayAddress}
          </a>
        </div>
        <div className={styles.center}>
          After generating a proof in Self, it will be automatically submitted
          on-chain to verify your humanity.
        </div>
        <div className={styles.right}>
          <a
            href="https://github.com/spire-labs/self-pylon-demo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
          >
            View source code
          </a>
        </div>
      </div>

      <div className={styles.mobileText}>
        <div className={styles.mobile}>
          Contract Address:{' '}
          <a
            href={sourcifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
            onClick={(e) => {
              if (address.length <= 20) {
                e.preventDefault();
              }
            }}
          >
            {displayAddress}
          </a>
        </div>
        <div className={styles.mobile}>
          After generating a proof in Self, it will be automatically submitted
          on-chain to verify your humanity.
        </div>
        <div className={styles.mobile}>
          <a
            href="https://github.com/spire-labs/self-pylon-demo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
          >
            View source code
          </a>
        </div>
      </div>
    </div>
  );
}

