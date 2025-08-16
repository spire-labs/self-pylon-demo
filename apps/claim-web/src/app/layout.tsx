import type { Metadata } from 'next';
import Providers from '../components/Providers';

export const metadata: Metadata = {
  title: 'Pylon Claim',
  description: 'Verify Self attestation on Celo and mint on Pylon'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

