import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { sampleAssessmentReport, writingPromptBank } from '@/lib/fixtures/writing';
import type { WritingDashboardPageData } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadDefaultAssessmentDashboardPageData: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadDefaultAssessmentDashboardPageData: mocks.loadDefaultAssessmentDashboardPageData,
}));

vi.mock('@/components/writing/writing-dashboard', () => ({
  WritingDashboard: (props: unknown) => {
    mocks.dashboardSpy(props);
    return null;
  },
}));

import DashboardPage from '../page';

function buildDashboardPageData(): WritingDashboardPageData {
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

  return {
    prompts,
    recentSavedAttempts: savedAssessments.slice(0, 6),
    summary,
    progress,
    studyPlan,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('keeps the dashboard route thin by delegating to the shared assessment workspace', async () => {
    const pageData = buildDashboardPageData();

    mocks.loadDefaultAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await DashboardPage());

    expect(mocks.loadDefaultAssessmentDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });

  it('renders a dashboard breadcrumb and overview header with route actions', async () => {
    const pageData = buildDashboardPageData();
    mocks.loadDefaultAssessmentDashboardPageData.mockResolvedValue(pageData);

    const { container } = render(await DashboardPage());

    const breadcrumb = container.querySelector('nav.page-breadcrumb.page-breadcrumb--writing');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb!.querySelector('a.breadcrumb-link')?.getAttribute('href')).toBe('/');
    expect(breadcrumb!.querySelector('.breadcrumb-current')?.textContent).toBe('Writing dashboard');

    const header = container.querySelector('.dashboard-header-section');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('Writing dashboard');
    expect(header!.textContent).toContain('8 attempts tracked');
    expect(header!.textContent).toContain('Prioritise Task Response next');
    expect(header!.querySelector('a.dashboard-resume-cta')?.getAttribute('href')).toBe('/writing');
    expect(header!.textContent).toContain('Switch to reading');
  });
});
