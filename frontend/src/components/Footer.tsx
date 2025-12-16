"use client";
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <div className={styles.container}>
      <span className={styles.footerText}>
        This appchain synchronously reads proof from Celo via Spire&apos;s Pylon
      </span>
    </div>
  );
}



