import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'MAKEEN Energy India — Facility Management', template: '%s · MAKEEN FM' },
  description: 'Facility Management Portal for MAKEEN Energy India LPG plants.',
  robots: { index: false, follow: false },
  icons: { icon: '/images/logo-mark.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D2B45',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Every page is rendered per request so the CSP nonce from proxy.ts can be applied.
  await connection();
  return (
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
