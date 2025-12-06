"use client";
import Lottie from 'lottie-react';
import Image from 'next/image';
import diamondAnimation from '../assets/diamond-lottie.json';
import styles from './HeaderMain.module.css';

// Animated spinning diamond logo using Lottie
export default function Logo() {
  return (
    <>
      <Lottie
        animationData={diamondAnimation}
        loop={true}
        autoplay={true}
        className={styles.lottie}
        style={{ width: 36, height: 36.19 }}
      />
      <Image
        src="/logo_spire.svg"
        alt="logo"
        width={72.54}
        height={28.68}
        className={styles.logo}
        priority
      />
    </>
  );
}
