import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleAssessmentReport, samplePrompt } from '@/lib/fixtures/writing';

import { WritingPracticeShell } from '../writing-practice-shell';

describe('WritingPracticeShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the prompt and submits for a refreshed report', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        report: {
          ...sampleAssessmentReport,
          overallBand: 7,
          summary: 'Updated report summary',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(createElement(WritingPracticeShell, {
      initialReport: sampleAssessmentReport,
      prompt: samplePrompt,
    }));

    expect(screen.getByText(samplePrompt.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generate mock report/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/writing/assessment',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByText('Updated report summary')).toBeInTheDocument();
  });
});
