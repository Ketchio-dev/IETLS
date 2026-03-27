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
    // Reading and Writing have no qualifier suffix
    expect(html).toMatch(/href="\/reading"[^>]*>.*?Reading/s);
    expect(html).toMatch(/href="\/writing"[^>]*>.*?Writing/s);
  });

  it('uses reading + writing branding in the nav brand', () => {
    const html = renderToStaticMarkup(RootLayout({ children: React.createElement('main', null, 'Child') }));

    expect(html).toContain('site-nav-brand');
    expect(html).toContain('IELTS Reading + Writing');
  });
});
