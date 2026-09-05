import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import LofiPlayer from '@/components/LofiPlayer';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pitstop Notes',
  description:
    'Instantly transform lecture slides, textbooks, and handwritten notes into structured, printable Cornell notes using AI vision extraction.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#d9d9d9' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
        <LofiPlayer />
      </body>
    </html>
  );
}
