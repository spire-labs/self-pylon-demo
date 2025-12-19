"use client";
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <div className={styles.container}>
      <span className={styles.footerText}>
        This appchain synchronously reads proof from Celo via{' '}
        <a
          href="https://docs.spire.dev/pylon/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Spire&apos;s Pylon
        </a>
        .{' '}
        <a
          href="https://github.com/spire-labs/self-pylon-demo"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Find out how here!
        </a>
      </span>
    </div>
  );
}



