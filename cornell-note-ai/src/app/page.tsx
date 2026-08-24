'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Gauge, Headphones, Repeat, BookOpen, ArrowRight } from 'lucide-react';
import '../app/globals.css';

export default function Home() {
  const router = useRouter();

  const handleLofiClick = () => {
    // Fire the custom event to open the Lofi Cafe drawer
    const event = new CustomEvent('toggle-lofi-player');
    window.dispatchEvent(event);
  };

  const features = [
    {
      text: 'Feynman\'s Technique',
      icon: <Brain size={18} color="#2563eb" />,
      onClick: () =>  window.open("https://www.goodnotes.com/blog/feynman-technique"),
    },
    {
      text: 'Built for performance',
      icon: <Gauge size={18} color="#2563eb" />,
      onClick: () => window.open("https://pmc.ncbi.nlm.nih.gov/articles/PMC8108503/"),
    },
    {
      text: 'Lofi Music',
      icon: <Headphones size={18} color="#2563eb" />,
      onClick: () => window.open("https://www.calm.com/blog/benefits-of-lofi-music"),
      badge: 'Live Radio',
    },
    {
      text: 'Spaced Repetition',
      icon: <Repeat size={18} color="#2563eb" />,
      onClick: () =>  window.open("https://www.khanacademy.org/science/learn-to-learn/x141050afa14cfed3:learn-to-learn/x141050afa14cfed3:spaced-repetition/a/l2l-spaced-repetition"),
    },
    {
      text: 'Cornell Note method',
      icon: <BookOpen size={18} color="#2563eb" />,
      onClick: () => window.open("https://lsc.cornell.edu/how-to-study/taking-notes/cornell-note-taking-system/"),
    },
  ];

  return (
    <div className="light-theme" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <main className="container" style={{ padding: '60px 24px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>

        {/* Center Logo Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div>
            <img
              src="/PitStopNotes.png"
              alt="Pitstop Notes Badge"
              style={{
                width: '160px',
                height: '160px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: 'white',
            marginBottom: '40px',
            fontFamily: 'var(--font-outfit)',
            letterSpacing: '-0.03em',
          }}
        >
          Supercharged Study Platform
        </h1>

        {/* CTA Button */}
        <div style={{ marginBottom: '60px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              padding: '16px 36px',
              fontSize: '1.15rem',
              fontWeight: 700,
              borderRadius: '9999px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(29, 78, 216, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e40af';
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
            }}
          >
            Enter the Pitstop <ArrowRight size={18} />
          </button>
        </div>

        {/* Features Layout Section */}
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              onClick={feature.onClick}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: '9999px',
                padding: '14px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.25s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
              }}
            >
              {feature.icon}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#111827',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                {feature.text}
              </span>
              {feature.badge && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    marginLeft: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {feature.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Floating animation */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
