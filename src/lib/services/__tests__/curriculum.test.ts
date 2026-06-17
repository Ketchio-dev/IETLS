import { describe, expect, it } from 'vitest';

import type { ReadingDashboardPageData } from '@/lib/services/reading/types';
import type { WritingDashboardPageData } from '@/lib/services/writing/application-service';
import type { StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { writingPromptBank } from '@/lib/fixtures/writing';
import { buildCurriculumPageData } from '@/lib/services/curriculum';

const writingSummary: WritingDashboardSummary = {
  totalAttempts: 1,
  taskCounts: { 'task-1': 0, 'task-2': 1 },
  latestRange: { lower: 6, upper: 6.5 },
  bestBand: 6.5,
  averageBand: 6.5,
  averageWordCount: 260,
  totalPracticeMinutes: 38,
  activeDays: 1,
  latestAttemptAt: '2026-03-26T17:00:00.000Z',
  providerBreakdown: [],
  criterionSummaries: [],
  strongestCriterion: null,
  weakestCriterion: null,
};

const writingStudyPlan: StudyPlanSnapshot = {
  version: 2,
  generatedAt: '2026-03-26T17:00:00.000Z',
  basedOnSubmissionId: 'attempt-1',
  attemptsConsidered: 1,
  headline: 'Focus this week: raise Task Response.',
  focus: 'Repair the latest weak criterion.',
  horizonLabel: 'Next 3 blocks',
  recommendedSessionLabel: '38 min from latest attempt',
  steps: [
    {
      id: 'repair-weakest-criterion',
      title: 'Lift Task Response',
      detail: 'Rewrite the weakest argument first.',
      actions: ['State the position earlier.'],
      phase: 'daily-session',
      status: 'current',
      completionSignal: 'Task Response improves by 0.5 band.',
      criterion: 'Task Response',
      taskType: 'task-2',
      promptId: writingPromptBank[0]!.id,
      actionLabel: 'Resume latest report',
      moduleLabel: 'Writing',
    },
  ],
  carryForward: ['Keep clear topic sentences.'],
};

const readingDashboard: ReadingDashboardPageData = {
  moduleId: 'reading',
  moduleLabel: 'IELTS Academic Reading',
  summary: 'Reading summary',
  routeBase: '/reading',
  importSummary: {
    sourceDir: 'data/private-reading-imports',
    importCommand: 'npm run reading:import-private',
    detectedSourceFiles: [],
    compiledSourceFiles: [],
    importedSetCount: 0,
    latestImportedAt: null,
    compiledOutputLabel: 'data/runtime/reading-private-imports.json',
    sets: [],
    warnings: [],
  },
  availableSets: [],
  recentAttempts: [],
  dashboardSummary: {
    totalAttempts: 0,
    averagePercentage: null,
    bestScoreLabel: null,
    latestAttemptAt: null,
    averageTimeSpentSeconds: 0,
    strongestType: null,
    weakestType: null,
  },
  studyFocus: ['Complete one Reading set.'],
  studyPlan: {
    summary: 'Complete one Reading set.',
    horizonLabel: 'First Reading block',
    steps: [
      {
        id: 'reading-first-benchmark',
        title: 'Complete your first Reading benchmark set',
        detail: 'Answer every question once.',
        actions: ['Finish before scoring.'],
        phase: 'benchmark',
        status: 'current',
        completionSignal: 'One scored Reading set is saved.',
        moduleLabel: 'Reading',
        actionHref: '/reading',
        actionLabel: 'Start first Reading set',
      },
    ],
    carryForward: [],
  },
};

const writingDashboard: WritingDashboardPageData = {
  prompts: writingPromptBank,
  recentSavedAttempts: [],
  summary: writingSummary,
  progress: {
    direction: 'insufficient-data',
    label: 'No trend yet',
    detail: 'Submit another draft.',
    delta: 0,
    latestRange: { lower: 6, upper: 6.5 },
    attemptsConsidered: 1,
    averageWordCount: 260,
  },
  studyPlan: writingStudyPlan,
};

describe('curriculum page model', () => {
  it('combines reading and writing current steps into a followable daily path', () => {
    const model = buildCurriculumPageData({
      reading: readingDashboard,
      writing: writingDashboard,
    });

    expect(model.todaySteps.map((step) => step.moduleLabel)).toEqual(['Reading', 'Writing']);
    expect(model.todaySteps[0]).toMatchObject({
      title: 'Complete your first Reading benchmark set',
      actionHref: '/reading',
      completionSignal: 'One scored Reading set is saved.',
    });
    expect(model.todaySteps[1]).toMatchObject({
      title: 'Lift Task Response',
      actionHref: `/writing?promptId=${writingPromptBank[0]!.id}`,
      completionSignal: 'Task Response improves by 0.5 band.',
    });
    expect(model.primaryModule.href).toBe('/reading');
  });

  it('prepends a spaced-review warm-up step when items are due', () => {
    const model = buildCurriculumPageData({
      reading: readingDashboard,
      writing: writingDashboard,
      review: { dueCount: 3, totalTracked: 5, nextDueAt: '2026-06-16T00:00:00.000Z' },
    });

    expect(model.todaySteps[0]).toMatchObject({
      moduleId: 'review',
      moduleLabel: 'Review',
      actionHref: '/review',
      title: 'Clear 3 spaced-review items',
    });
    expect(model.todaySteps.map((step) => step.moduleLabel)).toEqual(['Review', 'Reading', 'Writing']);
    expect(model.reviewSummary?.dueCount).toBe(3);
  });

  it('omits the review step when nothing is due', () => {
    const model = buildCurriculumPageData({
      reading: readingDashboard,
      writing: writingDashboard,
      review: { dueCount: 0, totalTracked: 4, nextDueAt: null },
    });

    expect(model.todaySteps.some((step) => step.moduleId === 'review')).toBe(false);
    expect(model.reviewSummary?.totalTracked).toBe(4);
  });
});
