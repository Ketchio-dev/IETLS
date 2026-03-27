import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'IELTS Reading & Writing Hub',
  description:
    'IELTS Academic reading and writing practice hub with secondary speaking alpha and listening placeholder routes.',
};

const navLinks = [
  {
    href: '/reading',
    label: 'Reading',
    dotClassName: 'site-nav-dot site-nav-dot--reading',
  },
  {
    href: '/writing',
    label: 'Writing',
    dotClassName: 'site-nav-dot site-nav-dot--writing',
  },
  {
    href: '/speaking',
    label: 'Speaking alpha',
    dotClassName: 'site-nav-dot site-nav-dot--speaking',
  },
  {
    href: '/listening',
    label: 'Listening placeholder',
    dotClassName: 'site-nav-dot site-nav-dot--listening',
  },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav" aria-label="Main navigation">
          <div className="site-nav-inner">
            <Link href="/" className="site-nav-brand">
              IELTS Reading + Writing
            </Link>
            <div className="site-nav-links">
              {navLinks.map((link) => (
                <Link href={link.href} className="site-nav-link" key={link.href}>
                  <span className={link.dotClassName} aria-hidden="true" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
