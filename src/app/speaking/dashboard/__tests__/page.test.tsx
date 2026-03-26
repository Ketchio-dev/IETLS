import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import type { SpeakingDashboardPageData } from '@/lib/services/speaking/types';
import { sampleSpeakingSavedSessions, speakingPromptBank } from '@/lib/fixtures/speaking';

const mocks = vi.hoisted(() => ({
  loadAssessmentDashboardPageData: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentDashboardPageData: mocks.loadAssessmentDashboardPageData,
}));

vi.mock('@/components/speaking/speaking-dashboard', () => ({
  SpeakingDashboard: (props: unknown) => {
    mocks.dashboardSpy(props);
    return null;
  },
}));

import SpeakingDashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpeakingDashboardPage', () => {
  it('keeps the route thin by delegating to the shared assessment workspace', async () => {
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
        partBreakdown: { 'part-1': 1, 'part-2': 1, 'part-3': 1 },
      },
      studyFocus: ['Repeat the latest prompt with one better example.'],
    };
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await SpeakingDashboardPage());

    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });
});
