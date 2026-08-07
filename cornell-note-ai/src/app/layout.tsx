import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';

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
  title: 'Cornell Note AI - AI-Powered Study Guide Generator',
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
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Navigation Bar */}
        <header
          className="no-print"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            borderBottom: '1px solid var(--panel-border)',
            padding: '16px 0',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '1.2rem',
                color: 'var(--text-primary)',
              }}
            >
              <BookOpen size={20} color="var(--primary)" />
              <span
                style={{
                  background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Cornell Note AI
              </span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link
                href="/"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                className="nav-link"
              >
                Dashboard
              </Link>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--secondary)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '20px',
                }}
              >
                <Sparkles size={10} />
                <span>AI Vision Enabled</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </body>
    </html>
  );
}
