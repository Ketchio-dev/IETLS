import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { sampleAssessmentReport, writingPromptBank } from '@/lib/fixtures/writing';
import type { WritingDashboardPageData } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadWritingDashboardPageData: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/services/writing/application-service', () => ({
  loadWritingDashboardPageData: mocks.loadWritingDashboardPageData,
}));

vi.mock('@/components/writing/writing-dashboard', () => ({
  WritingDashboard: (props: unknown) => {
    mocks.dashboardSpy(props);
    return null;
  },
}));

import DashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('keeps the dashboard route thin by delegating to the application boundary', async () => {
    const prompts = writingPromptBank;
    const savedAssessments = Array.from({ length: 8 }, (_, index) => ({
      submissionId: `saved-${index + 1}`,
      promptId: writingPromptBank[index % writingPromptBank.length]!.id,
      taskType: writingPromptBank[index % writingPromptBank.length]!.taskType,
      createdAt: `2026-03-${String(20 - index).padStart(2, '0')}T15:00:00.000Z`,
      timeSpentMinutes: 20 + index,
      wordCount: 180 + index * 10,
      report: {
        ...sampleAssessmentReport,
        promptId: writingPromptBank[index % writingPromptBank.length]!.id,
        taskType: writingPromptBank[index % writingPromptBank.length]!.taskType,
        summary: `Saved summary ${index + 1}`,
      },
    }));
    const summary: WritingDashboardSummary = {
      totalAttempts: 8,
      taskCounts: { 'task-1': 2, 'task-2': 6 },
      latestRange: { lower: 6.5, upper: 7 },
      bestBand: 7,
      averageBand: 6.6,
      averageWordCount: 248,
      totalPracticeMinutes: 220,
      activeDays: 6,
      latestAttemptAt: savedAssessments[0]!.createdAt,
      providerBreakdown: [],
      criterionSummaries: [],
      strongestCriterion: null,
      weakestCriterion: null,
    };
    const progress: ProgressSummary = {
      direction: 'improving',
      label: 'Improving',
      detail: 'Recent attempts are trending up.',
      delta: 0.5,
      latestRange: { lower: 6.5, upper: 7 },
      attemptsConsidered: 3,
      averageWordCount: 270,
    };
    const studyPlan: StudyPlanSnapshot = {
      version: 2,
      generatedAt: '2026-03-26T17:05:00.000Z',
      basedOnSubmissionId: savedAssessments[0]!.submissionId,
      attemptsConsidered: savedAssessments.length,
      headline: 'Prioritise Task Response next',
      focus: 'Resume the latest essay and repair the weakest body paragraph first.',
      horizonLabel: 'Next 3 practice blocks',
      recommendedSessionLabel: '38 min from latest attempt',
      steps: [],
      carryForward: [],
    };
    const pageData: WritingDashboardPageData = {
      prompts,
      recentSavedAttempts: savedAssessments.slice(0, 6),
      summary,
      progress,
      studyPlan,
    };

    mocks.loadWritingDashboardPageData.mockResolvedValue(pageData);

    render(await DashboardPage());

    expect(mocks.loadWritingDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });
});
