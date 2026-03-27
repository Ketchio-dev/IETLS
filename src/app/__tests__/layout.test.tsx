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
});
