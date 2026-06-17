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
    href: '/curriculum',
    label: 'Today',
    dotClassName: 'site-nav-dot site-nav-dot--curriculum',
    tier: 'primary',
  },
  {
    href: '/reading',
    label: 'Reading',
    dotClassName: 'site-nav-dot site-nav-dot--reading',
    tier: 'primary',
  },
  {
    href: '/writing',
    label: 'Writing',
    dotClassName: 'site-nav-dot site-nav-dot--writing',
    tier: 'primary',
  },
  {
    href: '/review',
    label: 'Review',
    dotClassName: 'site-nav-dot site-nav-dot--review',
    tier: 'primary',
  },
  {
    href: '/vocab',
    label: 'Vocab',
    dotClassName: 'site-nav-dot site-nav-dot--vocab',
    tier: 'primary',
  },
  {
    href: '/speaking',
    label: 'Speaking',
    dotClassName: 'site-nav-dot site-nav-dot--speaking',
    tier: 'secondary',
    badge: 'Alpha',
  },
  {
    href: '/listening',
    label: 'Listening',
    dotClassName: 'site-nav-dot site-nav-dot--listening',
    tier: 'secondary',
    badge: 'Soon',
  },
] as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav" aria-label="Main navigation">
          <div className="site-nav-inner">
            <Link href="/" className="site-nav-brand" aria-label="IELTS Reading + Writing">
              <span className="site-nav-brand-kicker">IELTS Academic</span>
              <span>Reading + Writing</span>
            </Link>
            <div className="site-nav-links">
              {navLinks.map((link) => (
                <Link
                  href={link.href}
                  className={link.tier === 'primary' ? 'site-nav-link' : 'site-nav-link site-nav-link--secondary'}
                  key={link.href}
                >
                  <span className={link.dotClassName} aria-hidden="true" />
                  {link.label}
                  {'badge' in link && link.badge ? (
                    <span className="site-nav-exp-badge">{link.badge}</span>
                  ) : null}
                </Link>
              ))}
            </div>
            <div className="site-nav-dashboard-group">
              <Link href="/reading/dashboard" className="site-nav-link site-nav-link--dashboard">
                <span className="site-nav-dot site-nav-dot--reading" aria-hidden="true" />
                Reading stats
              </Link>
              <Link href="/dashboard" className="site-nav-link site-nav-link--dashboard">
                <span className="site-nav-dot site-nav-dot--writing" aria-hidden="true" />
                Writing stats
              </Link>
              <Link href="/review/dashboard" className="site-nav-link site-nav-link--dashboard">
                <span className="site-nav-dot site-nav-dot--review" aria-hidden="true" />
                Review stats
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
