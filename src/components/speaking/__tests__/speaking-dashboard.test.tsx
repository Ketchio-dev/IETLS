import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleSpeakingSavedSessions, speakingPromptBank } from '@/lib/fixtures/speaking';
import type { SpeakingDashboardPageData } from '@/lib/services/speaking/types';

import { SpeakingDashboard } from '../speaking-dashboard';

describe('SpeakingDashboard', () => {
  it('renders summary metrics, study focus, and resume links', () => {
    const pageData: SpeakingDashboardPageData = {
      prompts: speakingPromptBank,
      recentSessions: sampleSpeakingSavedSessions,
      summary: {
        totalSessions: 3,
        averageBand: 6.5,
        bestBand: 6.5,
        latestRange: { lower: 6, upper: 6.5 },
        averageDurationSeconds: 78,
        latestAttemptAt: sampleSpeakingSavedSessions[0]!.createdAt,
        lowConfidenceCount: 1,
        sessionsWithAudio: 1,
        partBreakdown: { 'part-1': 1, 'part-2': 1, 'part-3': 1 },
      },
      studyFocus: ['Repeat the latest prompt with one better example.'],
    };

    render(<SpeakingDashboard {...pageData} />);

    expect(
      screen.getByRole('heading', { name: /track part coverage, confidence, and transcript-first audio readiness/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /speaking alpha metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /latest practice snapshots/i })).toBeInTheDocument();
    expect(screen.getByText(/metadata only for now; raw audio and pronunciation features are not persisted yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to speaking practice/i })).toHaveAttribute('href', '/speaking');
    const resumeLinks = screen.getAllByRole('link', { name: /resume in practice shell/i });
    expect(resumeLinks[0]).toHaveAttribute(
      'href',
      `/speaking?promptId=${sampleSpeakingSavedSessions[0]!.promptId}&sessionId=${sampleSpeakingSavedSessions[0]!.sessionId}`,
    );
  });
});
