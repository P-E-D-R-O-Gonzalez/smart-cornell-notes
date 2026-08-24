'use client';

import React, { useState, useEffect } from 'react';
import { Headphones, X, Music, Disc, ExternalLink, Radio } from 'lucide-react';

export default function LofiPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [playerType, setPlayerType] = useState<'loficafe' | 'youtube'>('loficafe');

  // Listen for global events to open the lofi player
  useEffect(() => {
    const handleToggleLofi = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('toggle-lofi-player', handleToggleLofi);
    return () => {
      -
        window.removeEventListener('toggle-lofi-player', handleToggleLofi);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={handleToggle}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        className="lofi-toggle-btn"
        title="Study Beats (Lofi.cafe)"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Headphones size={24} />
            <Disc
              size={12}
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                animation: 'spin 4s linear infinite',
              }}
            />
          </div>
        )}
      </button>

      {/* Slide-out Sidebar Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          backgroundColor: 'rgba(28, 28, 30, 0.92)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
          zIndex: 998,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header of Drawer */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >

        </div>

        {/* Iframe Content Area */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#000000', display: 'flex', flexDirection: 'column' }}>
          {playerType === 'loficafe' ? (
            <>
              <iframe
                src="https://loficafe.net/embed/studying"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Lofi Cafe"
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  padding: '10px 18px',
                  borderRadius: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  zIndex: 10,
                  textAlign: 'center',
                }}
              >
                <a
                  href="https://loficafe.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#ffffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Open Lofi Cafe directly <ExternalLink size={12} />
                </a>
              </div>
            </>
          ) : (
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1"
              title="Lofi Girl 24/7 Stream"
              style={{ border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      {/* Embedded CSS for animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}