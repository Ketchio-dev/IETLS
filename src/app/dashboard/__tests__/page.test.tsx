import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { sampleAssessmentReport, samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';

const mocks = vi.hoisted(() => ({
  seedPrompts: vi.fn(),
  listPrompts: vi.fn(),
  listRecentAttempts: vi.fn(),
  listSavedAssessments: vi.fn(),
  getDashboardStudyPlan: vi.fn(),
  buildDashboardSummary: vi.fn(),
  buildProgressSummary: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/server/writing-assessment-repository', () => ({
  seedPrompts: mocks.seedPrompts,
  listPrompts: mocks.listPrompts,
  listRecentAttempts: mocks.listRecentAttempts,
  listSavedAssessments: mocks.listSavedAssessments,
  getDashboardStudyPlan: mocks.getDashboardStudyPlan,
}));

vi.mock('@/lib/services/writing/dashboard', () => ({
  buildDashboardSummary: mocks.buildDashboardSummary,
}));

vi.mock('@/lib/services/writing/progress-summary', () => ({
  buildProgressSummary: mocks.buildProgressSummary,
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
  it('keeps the dashboard route thin by wiring the persisted loaders into the summary builders', async () => {
    const prompts = writingPromptBank;
    const recentAttempts = Array.from({ length: 3 }, (_, index) => ({
      submissionId: `recent-${index + 1}`,
      promptId: writingPromptBank[index + 2]?.id ?? samplePrompt.id,
      taskType: 'task-2' as const,
      overallBand: 6.5 + index * 0.5,
      overallBandRange: { lower: 6 + index * 0.5, upper: 6.5 + index * 0.5 },
      confidence: 'medium' as const,
      estimatedWordCount: 260 + index * 10,
      summary: `Recent summary ${index + 1}`,
      createdAt: `2026-03-2${index}T15:00:00.000Z`,
    }));
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

    mocks.seedPrompts.mockResolvedValue(prompts);
    mocks.listPrompts.mockResolvedValue(prompts);
    mocks.listRecentAttempts.mockResolvedValue(recentAttempts);
    mocks.listSavedAssessments.mockResolvedValue(savedAssessments);
    mocks.getDashboardStudyPlan.mockResolvedValue(studyPlan);
    mocks.buildDashboardSummary.mockReturnValue(summary);
    mocks.buildProgressSummary.mockReturnValue(progress);

    render(await DashboardPage());

    expect(mocks.seedPrompts).toHaveBeenCalledWith(writingPromptBank);
    expect(mocks.listPrompts).toHaveBeenCalledWith();
    expect(mocks.listRecentAttempts).toHaveBeenCalledWith(12);
    expect(mocks.listSavedAssessments).toHaveBeenCalledWith(50);
    expect(mocks.buildDashboardSummary).toHaveBeenCalledWith(savedAssessments);
    expect(mocks.buildProgressSummary).toHaveBeenCalledWith(recentAttempts);
    expect(mocks.getDashboardStudyPlan).toHaveBeenCalledWith(prompts, savedAssessments);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        progress,
        prompts,
        recentSavedAttempts: savedAssessments.slice(0, 6),
        studyPlan,
        summary,
      }),
    );
  });
});
