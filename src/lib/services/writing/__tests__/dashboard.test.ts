import type { SavedAssessmentSnapshot } from '@/lib/domain';

import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';
import { buildAttemptComparison, buildDashboardSummary, buildStudyPlan } from '@/lib/services/writing/dashboard';

import { describe, expect, it } from 'vitest';

function makeAssessment(
  overrides: Partial<SavedAssessmentSnapshot> & {
    createdAt: string;
    submissionId: string;
    promptId?: string;
    taskType?: SavedAssessmentSnapshot['taskType'];
    overallBand: number;
    wordCount: number;
  },
): SavedAssessmentSnapshot {
  const promptId = overrides.promptId ?? samplePrompt.id;
  const taskType = overrides.taskType ?? samplePrompt.taskType;

  return {
    submissionId: overrides.submissionId,
    promptId,
    taskType,
    createdAt: overrides.createdAt,
    timeSpentMinutes: overrides.timeSpentMinutes ?? 32,
    wordCount: overrides.wordCount,
    report: {
      ...sampleAssessmentReport,
      promptId,
      taskType,
      overallBand: overrides.overallBand,
      overallBandRange: {
        lower: Math.max(4, overrides.overallBand - 0.5),
        upper: Math.min(9, overrides.overallBand),
      },
      estimatedWordCount: overrides.wordCount,
      evaluationTrace: {
        ...sampleAssessmentReport.evaluationTrace,
        scorerProvider: overrides.report?.evaluationTrace.scorerProvider ?? sampleAssessmentReport.evaluationTrace.scorerProvider,
        usedMockFallback:
          overrides.report?.evaluationTrace.usedMockFallback ??
          sampleAssessmentReport.evaluationTrace.usedMockFallback,
      },
      criterionScores:
        overrides.report?.criterionScores ??
        sampleAssessmentReport.criterionScores.map((score, index) => ({
          ...score,
          band: Math.max(4, overrides.overallBand - 0.5 + index * 0.1),
          bandRange: {
            lower: Math.max(4, overrides.overallBand - 0.5),
            upper: Math.min(9, overrides.overallBand),
          },
        })),
      nextSteps: overrides.report?.nextSteps ?? sampleAssessmentReport.nextSteps,
      summary: overrides.report?.summary ?? sampleAssessmentReport.summary,
    },
  };
}

describe('dashboard helpers', () => {
  it('aggregates saved assessments into dashboard metrics', () => {
    const assessments = [
      makeAssessment({
        submissionId: 'attempt-3',
        createdAt: '2026-03-26T12:00:00.000Z',
        overallBand: 7,
        wordCount: 278,
        report: {
          ...sampleAssessmentReport,
          evaluationTrace: {
            ...sampleAssessmentReport.evaluationTrace,
            scorerProvider: 'openrouter',
            usedMockFallback: false,
          },
        },
      }),
      makeAssessment({
        submissionId: 'attempt-2',
        createdAt: '2026-03-25T12:00:00.000Z',
        overallBand: 6.5,
        wordCount: 266,
        taskType: 'task-1',
        promptId: sampleTask1Prompt.id,
        report: {
          ...sampleAssessmentReport,
          criterionScores: sampleAssessmentReport.criterionScores.map((score, index) => ({
            ...score,
            band: score.criterion === 'Task Response' ? 5.5 : 6.5 + index * 0.1,
            bandRange: { lower: 6, upper: 6.5 },
          })),
          evaluationTrace: {
            ...sampleAssessmentReport.evaluationTrace,
            scorerProvider: 'openrouter',
            usedMockFallback: true,
          },
        },
      }),
      makeAssessment({
        submissionId: 'attempt-1',
        createdAt: '2026-03-24T12:00:00.000Z',
        overallBand: 6,
        wordCount: 252,
        report: {
          ...sampleAssessmentReport,
          evaluationTrace: {
            ...sampleAssessmentReport.evaluationTrace,
            scorerProvider: 'openrouter',
            usedMockFallback: false,
          },
        },
      }),
    ];

    const summary = buildDashboardSummary(assessments);

    expect(summary.totalAttempts).toBe(3);
    expect(summary.taskCounts).toEqual({ 'task-1': 1, 'task-2': 2 });
    expect(summary.bestBand).toBe(7);
    expect(summary.averageBand).toBe(6.5);
    expect(summary.averageWordCount).toBe(265);
    expect(summary.providerBreakdown[0]).toMatchObject({
      provider: 'Openrouter',
      count: 3,
      liveCount: 2,
      fallbackCount: 1,
    });
    expect(summary.criterionSummaries[0]).toMatchObject({
      criterion: 'Grammatical Range & Accuracy',
      latestBand: 7.5,
      previousBand: 6.8,
      delta: 0.7,
      trend: 'improving',
      recentBands: [6.8, 7.5],
    });
    expect(summary.weakestCriterion?.criterion).toBe('Task Response');
  });

  it('builds a saved-attempt comparison with shared criteria only', () => {
    const currentAttempt = makeAssessment({
      submissionId: 'attempt-3',
      createdAt: '2026-03-26T12:00:00.000Z',
      overallBand: 7,
      wordCount: 278,
      report: {
        ...sampleAssessmentReport,
        criterionScores: sampleAssessmentReport.criterionScores.map((score, index) => ({
          ...score,
          band: 6.5 + index * 0.2,
          bandRange: { lower: 6.5, upper: 7 },
        })),
      },
    });
    const comparedAttempt = makeAssessment({
      submissionId: 'attempt-2',
      createdAt: '2026-03-25T12:00:00.000Z',
      overallBand: 6.5,
      wordCount: 255,
      taskType: 'task-1',
      promptId: sampleTask1Prompt.id,
      report: {
        ...sampleAssessmentReport,
        criterionScores: sampleAssessmentReport.criterionScores
          .filter((score) => score.criterion !== 'Task Response')
          .map((score, index) => ({
            ...score,
            criterion: index === 0 ? 'Task Achievement' : score.criterion,
            band: 6 + index * 0.1,
            bandRange: { lower: 6, upper: 6.5 },
          })),
      },
    });

    const comparison = buildAttemptComparison(currentAttempt, comparedAttempt);

    expect(comparison.overallBandDelta).toBe(0.5);
    expect(comparison.wordCountDelta).toBe(23);
    expect(comparison.criterionComparisons.map((entry) => entry.criterion)).toEqual([
      'Lexical Resource',
      'Grammatical Range & Accuracy',
    ]);
    expect(comparison.taskSpecificCriterionOmitted).toBe(true);
  });

  it('builds a study plan from persisted attempts', () => {
    const assessments = [
      makeAssessment({
        submissionId: 'attempt-2',
        createdAt: '2026-03-26T12:00:00.000Z',
        overallBand: 6.5,
        wordCount: 265,
        report: {
          ...sampleAssessmentReport,
          nextSteps: [
            {
              title: 'Sharpen your position',
              description: 'State your opinion earlier and keep it explicit in each body paragraph.',
              impact: 'high',
              criterion: 'Task Response',
            },
          ],
          criterionScores: sampleAssessmentReport.criterionScores.map((score) => ({
            ...score,
            band: score.criterion === 'Task Response' ? 5.5 : 6.5,
            bandRange: { lower: 6, upper: 6.5 },
          })),
        },
      }),
      makeAssessment({
        submissionId: 'attempt-1',
        createdAt: '2026-03-25T12:00:00.000Z',
        overallBand: 6,
        wordCount: 248,
        taskType: 'task-1',
        promptId: sampleTask1Prompt.id,
      }),
    ];

    const plan = buildStudyPlan(assessments, writingPromptBank);

    expect(plan.basedOnSubmissionId).toBe('attempt-2');
    expect(plan.version).toBe(2);
    expect(plan.steps).toHaveLength(3);
    expect(plan.headline).toMatch(/Task Response/i);
    expect(plan.steps[0]?.detail).toMatch(/Sharpen your position/i);
    expect(plan.steps[0]?.actions[0]).toMatch(/Sharpen your position/i);
    expect(plan.steps[0]?.submissionId).toBe('attempt-2');
    expect(plan.steps[0]?.actionLabel).toMatch(/resume latest report/i);
    expect(plan.steps[1]?.title).toMatch(/Task 1|Task 2/i);
    expect(plan.carryForward.length).toBeGreaterThan(0);
  });
});
