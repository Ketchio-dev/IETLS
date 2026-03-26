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

  it('renders the prompt and updates the saved history after a submission', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        report: {
          ...sampleAssessmentReport,
          overallBand: 7,
          summary: 'Updated report summary',
        },
        recentAttempts: [
          {
            submissionId: 'attempt-1',
            promptId: samplePrompt.id,
            overallBand: 7,
            overallBandRange: { lower: 6.5, upper: 7.0 },
            confidence: 'medium',
            estimatedWordCount: 270,
            summary: 'Updated report summary',
            createdAt: '2026-03-26T16:00:00.000Z',
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(createElement(WritingPracticeShell, {
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      prompt: samplePrompt,
    }));

    expect(screen.getByText(samplePrompt.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generate practice estimate/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/writing/assessment',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const summaryMatches = await screen.findAllByText('Updated report summary');
    expect(summaryMatches.length).toBeGreaterThan(0);
    expect(await screen.findByText(/1 saved/i)).toBeInTheDocument();
    expect(await screen.findByText(/First benchmark saved/i)).toBeInTheDocument();
  });
});
