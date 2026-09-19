'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer
      style={{
        background: "linear-gradient(110deg, var(--brand-primary-dark) 0%, var(--brand-primary) 40%, var(--brand-blue) 75%, var(--brand-orange) 100%)",
        borderTop: "2px solid var(--brand-orange)",
      }}
      className="py-3"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-1">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            &copy; 2026 AMP Shopping. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            Made by AMP Technology with ❤️
          </p>
        </div>
      </div>
    </footer>
  );
}