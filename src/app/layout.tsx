import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'IELTS Academic Platform',
  description: 'Multi-module IELTS Academic practice hub for writing, reading, speaking, and listening.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav" aria-label="Main navigation">
          <div className="site-nav-inner">
            <Link href="/" className="site-nav-brand">
              IELTS Academic
            </Link>
            <div className="site-nav-links">
              <Link href="/writing" className="site-nav-link">
                <span className="site-nav-dot" style={{ backgroundColor: '#1865f2' }} aria-hidden="true" />
                Writing
              </Link>
              <Link href="/reading" className="site-nav-link">
                <span className="site-nav-dot" style={{ backgroundColor: '#14bf96' }} aria-hidden="true" />
                Reading
              </Link>
              <Link href="/speaking" className="site-nav-link">
                <span className="site-nav-dot" style={{ backgroundColor: '#ff914d' }} aria-hidden="true" />
                Speaking
              </Link>
              <Link href="/listening" className="site-nav-link">
                <span className="site-nav-dot" style={{ backgroundColor: '#7c3aed' }} aria-hidden="true" />
                Listening
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
