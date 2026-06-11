import { describe, expect, it } from 'vitest';

import type {
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  WritingDashboardSummary,
} from '@/lib/domain';
import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';
import { getPromptTheme } from '@/lib/services/writing/prompt-taxonomy';

import {
  buildDashboardStudyPlanModel,
  buildWritingDashboardMetrics,
  buildWritingNextActionModel,
  buildWritingThemeCoverageModel,
  describeTrendVisual,
} from '../writing-dashboard-model';

const taskResponseSummary = {
  criterion: 'Task Response',
  averageBand: 5.8,
  latestBand: 6,
  previousBand: 5.5,
  delta: 0.5,
  trend: 'improving',
  attemptsConsidered: 2,
  recentBands: [5.5, 6],
  taskTypes: ['task-2'],
} satisfies WritingDashboardSummary['criterionSummaries'][number];

const lexicalSummary = {
  criterion: 'Lexical Resource',
  averageBand: 6.8,
  latestBand: 7,
  previousBand: 6.5,
  delta: 0.5,
  trend: 'improving',
  attemptsConsidered: 2,
  recentBands: [6.5, 7],
  taskTypes: ['task-1', 'task-2'],
} satisfies WritingDashboardSummary['criterionSummaries'][number];

const summary: WritingDashboardSummary = {
  totalAttempts: 2,
  taskCounts: { 'task-1': 1, 'task-2': 1 },
  latestRange: { lower: 6, upper: 6.5 },
  latestFullTestEstimateBand: 6.5,
  latestFullTestTask1Band: 6,
  latestFullTestTask2Band: 6.5,
  bestBand: 6.5,
  averageBand: 6.3,
  averageWordCount: 258,
  totalPracticeMinutes: 55,
  activeDays: 2,
  latestAttemptAt: '2026-03-26T12:00:00.000Z',
  providerBreakdown: [],
  criterionSummaries: [lexicalSummary, taskResponseSummary],
  strongestCriterion: lexicalSummary,
  weakestCriterion: taskResponseSummary,
};

const progress: ProgressSummary = {
  direction: 'improving',
  label: 'Improving',
  detail: 'Recent work is moving upward.',
  delta: 0.5,
  latestRange: { lower: 6, upper: 6.5 },
  attemptsConsidered: 2,
  averageWordCount: 258,
};

function makeAttempt(overrides: Partial<SavedAssessmentSnapshot> = {}): SavedAssessmentSnapshot {
  const promptId = overrides.promptId ?? samplePrompt.id;
  const taskType = overrides.taskType ?? samplePrompt.taskType;

  return {
    submissionId: overrides.submissionId ?? 'attempt-1',
    promptId,
    taskType,
    createdAt: overrides.createdAt ?? '2026-03-26T12:00:00.000Z',
    timeSpentMinutes: overrides.timeSpentMinutes ?? 35,
    wordCount: overrides.wordCount ?? 286,
    report: {
      ...sampleAssessmentReport,
      promptId,
      taskType,
      overallBand: overrides.report?.overallBand ?? sampleAssessmentReport.overallBand,
      criterionScores:
        overrides.report?.criterionScores ??
        sampleAssessmentReport.criterionScores.map((score) => ({
          ...score,
          band: score.criterion === 'Task Response' ? 6 : score.band,
        })),
      nextSteps:
        overrides.report?.nextSteps ??
        [
          {
            title: 'Raise Task Response',
            criterion: 'Task Response',
            description: 'Add one more fully developed idea with a cause, consequence, and stakeholder impact.',
            impact: 'high',
          },
        ],
    },
  };
}

describe('writing dashboard model helpers', () => {
  it('builds dashboard metric cards without depending on the React component', () => {
    const metrics = buildWritingDashboardMetrics(summary, progress);

    expect(metrics.map((metric) => metric.id)).toEqual([
      'trend',
      'full-test-weighted-band',
      'average-band',
      'average-words',
      'active-days',
    ]);
    expect(metrics[1]).toMatchObject({
      value: '6.5',
      detail: 'Based on your latest Task 1 6.0 and Task 2 6.5 scores.',
    });
  });

  it('maps persisted study plans into dashboard links and task labels', () => {
    const plan: StudyPlanSnapshot = {
      version: 2,
      generatedAt: '2026-03-26T12:10:00.000Z',
      basedOnSubmissionId: 'attempt-1',
      attemptsConsidered: 2,
      headline: 'Repair Task Response',
      focus: 'Use the latest report before drafting again.',
      steps: [
        {
          id: 'repair-response',
          title: 'Repair the argument',
          detail: 'Rewrite one body paragraph.',
          actions: ['State the position clearly.'],
          criterion: 'Task Response',
          taskType: 'task-2',
          promptId: samplePrompt.id,
          submissionId: 'attempt-1',
          actionLabel: 'Resume latest report',
        },
        {
          id: 'compare-tasks',
          title: 'Compare both tasks',
          detail: 'Review coverage across tasks.',
          actions: [],
          criterion: 'Overall',
          taskType: 'either',
        },
      ],
      carryForward: [],
    };

    const model = buildDashboardStudyPlanModel(plan);

    expect(model.horizonLabel).toBe('2 saved attempts');
    expect(model.recommendedSessionLabel).toBe('Use the latest saved report first');
    expect(model.steps[0]?.actionHref).toBe(`/writing?promptId=${samplePrompt.id}&attemptId=attempt-1`);
    expect(model.steps[1]?.taskTypes).toEqual(['task-1', 'task-2']);
    expect(model.carryForward).toEqual(['Re-open the latest saved report before drafting the next response.']);
  });

  it('summarizes theme coverage and chooses weak and strong practice themes', () => {
    const attempts = [
      makeAttempt({ submissionId: 'attempt-1', promptId: samplePrompt.id, createdAt: '2026-03-25T12:00:00.000Z' }),
      makeAttempt({ submissionId: 'attempt-2', promptId: samplePrompt.id, createdAt: '2026-03-26T12:00:00.000Z' }),
      makeAttempt({ submissionId: 'attempt-3', promptId: sampleTask1Prompt.id, taskType: 'task-1' }),
    ];

    const model = buildWritingThemeCoverageModel(writingPromptBank, attempts);
    const sampleTheme = getPromptTheme(samplePrompt);

    expect(model.entries.length).toBeGreaterThan(0);
    expect(model.strongestTheme?.theme).toBe(sampleTheme);
    expect(model.strongestTheme?.attemptCount).toBe(2);
    expect(model.weakestTheme?.attemptCount).toBe(0);
  });

  it('builds the next-action coaching model from the latest saved attempt', () => {
    const olderAttempt = makeAttempt({
      submissionId: 'attempt-old',
      createdAt: '2026-03-25T12:00:00.000Z',
      report: {
        ...sampleAssessmentReport,
        criterionScores: sampleAssessmentReport.criterionScores.map((score) => ({
          ...score,
          band: score.criterion === 'Task Response' ? 5 : score.band,
        })),
      },
    });
    const latestAttempt = makeAttempt({
      submissionId: 'attempt-latest',
      createdAt: '2026-03-26T12:00:00.000Z',
    });

    const model = buildWritingNextActionModel({
      prompts: writingPromptBank,
      recentSavedAttempts: [olderAttempt, latestAttempt],
      summary,
    });

    expect(model.recommendedPrompt).not.toBeNull();
    expect(model.primaryHref).toBe(`/writing?promptId=${model.recommendedPrompt?.prompt.id}`);
    expect(model.primaryLabel).toBe('Train Task Response next');
    expect(model.criterionCoaching?.currentBand).toBe(6);
    expect(model.crossTraining.title).toBe('Switch to Reading for a quick argument reset');
  });

  it('describes trend mini-bars for accessible chart text', () => {
    expect(describeTrendVisual(lexicalSummary)).toBe('Recent Lexical Resource bands: 6.5, 7.0');
  });
});
