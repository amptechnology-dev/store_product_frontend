'use client';

import React from 'react';

export default function VortexLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

        {/* Outermost slow sweep */}
        <div className="absolute rounded-full" style={{
          width: 180, height: 180,
          border: '2px solid transparent',
          borderTop: '2px solid #f97316',
          borderBottom: '2px solid #1a3a6b',
          animation: 'amp-spin 3s linear infinite',
          opacity: 0.5,
        }} />

        {/* Outer ring */}
        <div className="absolute rounded-full" style={{
          width: 158, height: 158,
          border: '3px solid transparent',
          borderTop: '3px solid #2196d3',
          borderRight: '3px solid #1a3a6b',
          animation: 'amp-spin 1.2s linear infinite',
        }} />

        {/* Middle reverse ring */}
        <div className="absolute rounded-full" style={{
          width: 132, height: 132,
          border: '2.5px solid transparent',
          borderTop: '2.5px solid #f97316',
          borderLeft: '2.5px solid #2196d3',
          animation: 'amp-spin-reverse 1.8s linear infinite',
        }} />

        {/* Inner accent ring */}
        <div className="absolute rounded-full" style={{
          width: 108, height: 108,
          border: '2px solid transparent',
          borderTop: '2px solid #1a3a6b',
          borderRight: '2px solid #f97316',
          animation: 'amp-spin 2.4s linear infinite',
          opacity: 0.7,
        }} />

        {/* Glow backdrop */}
        <div className="absolute rounded-full" style={{
          width: 90, height: 90,
          background: 'radial-gradient(circle, rgba(33,150,211,0.22) 0%, rgba(26,58,107,0.10) 60%, transparent 100%)',
          animation: 'amp-pulse 1.8s ease-in-out infinite',
        }} />

        {/* Logo container with shadow */}
        <div className="relative flex items-center justify-center rounded-2xl" style={{
          width: 80, height: 80,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 0 0 6px rgba(33,150,211,0.10), 0 8px 32px rgba(26,58,107,0.15)',
          zIndex: 10,
          animation: 'amp-pulse 1.8s ease-in-out infinite',
        }}>
          <img
            src="/img/photos/amp-logo.png"
            alt="AMP"
            style={{
              width: 64,
              height: 64,
              objectFit: 'contain',
              borderRadius: 10,
            }}
          />
        </div>
      </div>

      {/* Brand text */}
      <div className="mt-6 flex flex-col items-center gap-1">
        <p className="text-base font-black tracking-tight" style={{ color: '#1a3a6b' }}>
          AMP <span style={{ color: '#f97316' }}>Shopping</span>
        </p>
        {/* Animated dots */}
        <div className="flex items-center gap-1.5 mt-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-full" style={{
              width: 6, height: 6,
              background: i === 1 ? '#f97316' : '#2196d3',
              animation: `amp-dot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes amp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes amp-spin-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes amp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(0.96); }
        }
        @keyframes amp-dot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
          40%            { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}