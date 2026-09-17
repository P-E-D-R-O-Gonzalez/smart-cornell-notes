'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BurnoutCar from './BurnoutCar';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="no-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#d9d9d9',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '24px 0 12px 0',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* Left Side: Logo & Muscle Car */}
        {/* Muscle Car Decal */}
        {pathname === '/' ? <BurnoutCar /> : <Link href="/">
          <img
          src="/car.png"
          alt="Pitstop Muscle Car"
            style={{
              width: '12rem',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Link>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '3rem',
              color: '#111827',
              fontFamily: 'var(--font-outfit)',
            }}
          >
            Pitstop Notes
          </Link>
        </div>

        {/* Right Side: Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            paddingTop: '6px',
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontSize: '1.2rem',
              color: '#111827',
              fontWeight: 600,
              fontFamily: 'var(--font-inter)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Dashboard
          </Link>

          <Show when="signed-out">
            <SignInButton>
              <button
                type="button"
                style={{
                  fontSize: '1.1rem',
                  color: '#111827',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type="button"
                style={{
                  fontSize: '1.05rem',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontFamily: 'var(--font-inter)',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  padding: '10px 16px',
                }}
              >
                Sign up
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>

        </div>
      </div>
    </header>
  );
}
