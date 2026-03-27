import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import RootLayout, { metadata } from '../layout';

describe('RootLayout', () => {
  it('exports metadata centered on reading and writing', () => {
    expect(metadata.title).toBe('IELTS Reading & Writing Hub');
    expect(metadata.description).toBe(
      'IELTS Academic reading and writing practice hub with secondary speaking alpha and listening placeholder routes.',
    );
  });

  it('renders navigation with reading and writing first', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('IELTS Reading + Writing');
    expect(html).toContain('Reading');
    expect(html).toContain('Writing');
    expect(html).toContain('Speaking alpha');
    expect(html).toContain('Listening placeholder');
    expect(html.indexOf('Reading')).toBeLessThan(html.indexOf('Writing'));
    expect(html.indexOf('Writing')).toBeLessThan(html.indexOf('Speaking alpha'));
    expect(html.indexOf('Speaking alpha')).toBeLessThan(html.indexOf('Listening placeholder'));
  });

  it('renders nav dots with module-specific color classes', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('site-nav-dot--reading');
    expect(html).toContain('site-nav-dot--writing');
    expect(html).toContain('site-nav-dot--speaking');
    expect(html).toContain('site-nav-dot--listening');
  });

  it('labels speaking and listening as secondary in navigation text', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    // Speaking is labeled as alpha
    expect(html).toContain('Speaking alpha');
    // Listening is labeled as placeholder
    expect(html).toContain('Listening placeholder');
    // Reading and Writing have no qualifier suffix — their link text is just the skill name
    expect(html).toContain('>Reading<');
    expect(html).toContain('>Writing<');
  });

  it('uses reading + writing branding in the nav brand', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('site-nav-brand');
    expect(html).toContain('IELTS Reading + Writing');
  });

  it('applies primary styling to reading/writing nav links and secondary to speaking/listening', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    // Reading and Writing links use primary class (no --secondary modifier)
    // Speaking and Listening links use the secondary modifier class
    expect(html).toContain('site-nav-link--secondary');

    // Count occurrences of the secondary modifier — should be exactly 2 (speaking + listening)
    const secondaryMatches = html.match(/site-nav-link--secondary/g);
    expect(secondaryMatches).toHaveLength(2);
  });

  it('renders exactly four navigation links in reading, writing, speaking, listening order', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    // Extract all href values from nav links
    const hrefPattern = /href="(\/(?:reading|writing|speaking|listening))"/g;
    const hrefs: string[] = [];
    let match;
    while ((match = hrefPattern.exec(html)) !== null) {
      hrefs.push(match[1]!);
    }

    expect(hrefs).toEqual(['/reading', '/writing', '/speaking', '/listening']);
  });

  it('renders a dashboard link in the navigation', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('site-nav-link--dashboard');
    expect(html).toContain('href="/reading/dashboard"');
    expect(html).toContain('Dashboards');
  });

  it('renders the IELTS Academic kicker above the brand name', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('site-nav-brand-kicker');
    // The kicker span with "IELTS Academic" appears inside the brand anchor, before the brand text span
    // Both are inside .site-nav-brand — verify the kicker class comes before the brand text within that element
    const brandAnchorStart = html.indexOf('site-nav-brand"');
    const kickerIdx = html.indexOf('site-nav-brand-kicker', brandAnchorStart);
    const brandTextIdx = html.indexOf('Reading + Writing', kickerIdx);
    expect(kickerIdx).toBeGreaterThan(-1);
    expect(brandTextIdx).toBeGreaterThan(-1);
    expect(kickerIdx).toBeLessThan(brandTextIdx);
  });
});
