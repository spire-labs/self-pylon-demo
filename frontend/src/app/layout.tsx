import type { Metadata } from 'next';
import Providers from '../components/Providers';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://human.spire.dev';

export const metadata: Metadata = {
  title: 'Human NFT',
  description: 'Claim your Human NFT - Mint your "I am human" NFT on Pylon appchain',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Human NFT',
    description: 'Claim your Human NFT - Mint your "I am human" NFT on Pylon appchain',
    url: `${siteUrl}${basePath}`,
    siteName: 'Human NFT',
    images: [
      {
        url: `${basePath}/mountains.svg`,
        width: 1440,
        height: 800,
        alt: 'Human NFT - Claim your "I am human" NFT',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Human NFT',
    description: 'Claim your Human NFT - Mint your "I am human" NFT on Pylon appchain',
    images: [`${basePath}/mountains.svg`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts/ConcretteS-TRIAL-Medium.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts/ConcretteS-TRIAL-Medium.woff`}
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


