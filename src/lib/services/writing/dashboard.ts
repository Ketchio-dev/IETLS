import type {
  DashboardAttemptComparison,
  CriterionName,
  DashboardCriterionSummary,
  DashboardProviderSummary,
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  StudyPlanStep,
  WritingDashboardSummary,
  WritingPrompt,
  WritingTaskType,
} from '@/lib/domain';

import { buildProgressSummary } from './progress-summary';

const EMPTY_TASK_COUNTS: Record<WritingTaskType, number> = {
  'task-1': 0,
  'task-2': 0,
};
const STUDY_PLAN_VERSION = 2;

function sortAssessmentsDescending(savedAssessments: SavedAssessmentSnapshot[]) {
  return [...savedAssessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function formatTaskLabel(taskType: WritingTaskType | 'either') {
  if (taskType === 'either') {
    return 'either task';
  }

  return taskType === 'task-1' ? 'Task 1' : 'Task 2';
}

function formatProviderLabel(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function roundBand(value: number) {
  return Number(value.toFixed(1));
}

function buildCriterionTrend(delta: number | null): DashboardCriterionSummary['trend'] {
  if (delta === null) {
    return 'insufficient-data';
  }

  if (delta >= 0.25) {
    return 'improving';
  }

  if (delta <= -0.25) {
    return 'slipping';
  }

  return 'steady';
}

function summarizeCriterionBands(savedAssessments: SavedAssessmentSnapshot[]) {
  const totals = new Map<CriterionName, { total: number; count: number; attempts: Array<{ band: number; taskType: WritingTaskType }> }>();

  for (const assessment of savedAssessments) {
    for (const score of assessment.report.criterionScores) {
      const current = totals.get(score.criterion) ?? { total: 0, count: 0, attempts: [] };
      current.total += score.band;
      current.count += 1;
      current.attempts.push({ band: score.band, taskType: assessment.taskType });
      totals.set(score.criterion, current);
    }
  }

  return [...totals.entries()]
    .map(([criterion, value]) => {
      const latest = value.attempts[0] ?? null;
      const previous = value.attempts[1] ?? null;
      const delta = latest && previous ? roundBand(latest.band - previous.band) : null;

      return {
        criterion,
        averageBand: roundBand(value.total / value.count),
        latestBand: latest?.band ?? 0,
        previousBand: previous?.band ?? null,
        delta,
        trend: buildCriterionTrend(delta),
        attemptsConsidered: value.count,
        recentBands: value.attempts
          .slice(0, 4)
          .map((attempt) => attempt.band)
          .reverse(),
        taskTypes: Array.from(new Set(value.attempts.map((attempt) => attempt.taskType))).sort(),
      };
    })
    .sort((a, b) => b.averageBand - a.averageBand);
}

function buildCriterionSummary(
  entries: DashboardCriterionSummary[],
  index: number,
): DashboardCriterionSummary | null {
  return entries[index] ?? null;
}

function buildProviderBreakdown(savedAssessments: SavedAssessmentSnapshot[]): DashboardProviderSummary[] {
  const providers = new Map<string, DashboardProviderSummary>();

  for (const assessment of savedAssessments) {
    const trace = assessment.report.evaluationTrace;
    const provider = trace.scorerProvider || 'unknown';
    const entry = providers.get(provider) ?? {
      provider: formatProviderLabel(provider),
      count: 0,
      liveCount: 0,
      fallbackCount: 0,
    };

    entry.count += 1;
    if (trace.usedMockFallback) {
      entry.fallbackCount += 1;
    } else {
      entry.liveCount += 1;
    }

    providers.set(provider, entry);
  }

  return [...providers.values()].sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider));
}

export function buildDashboardSummary(savedAssessments: SavedAssessmentSnapshot[]): WritingDashboardSummary {
  if (savedAssessments.length === 0) {
    return {
      totalAttempts: 0,
      taskCounts: { ...EMPTY_TASK_COUNTS },
      latestRange: null,
      bestBand: null,
      averageBand: null,
      averageWordCount: 0,
      totalPracticeMinutes: 0,
      activeDays: 0,
      latestAttemptAt: null,
      providerBreakdown: [],
      criterionSummaries: [],
      strongestCriterion: null,
      weakestCriterion: null,
    };
  }

  const ordered = sortAssessmentsDescending(savedAssessments);
  const latestAssessment = ordered[0];
  const taskCounts = ordered.reduce<Record<WritingTaskType, number>>(
    (counts, attempt) => {
      counts[attempt.taskType] += 1;
      return counts;
    },
    { ...EMPTY_TASK_COUNTS },
  );
  const criterionBands = summarizeCriterionBands(ordered);
  const averageBand = roundBand(ordered.reduce((sum, attempt) => sum + attempt.report.overallBand, 0) / ordered.length);

  return {
    totalAttempts: ordered.length,
    taskCounts,
    latestRange: latestAssessment.report.overallBandRange,
    bestBand: roundBand(Math.max(...ordered.map((attempt) => attempt.report.overallBand))),
    averageBand,
    averageWordCount: Math.round(
      ordered.reduce((sum, attempt) => sum + attempt.wordCount, 0) / ordered.length,
    ),
    totalPracticeMinutes: Number(
      ordered.reduce((sum, attempt) => sum + attempt.timeSpentMinutes, 0).toFixed(1),
    ),
    activeDays: new Set(ordered.map((attempt) => attempt.createdAt.slice(0, 10))).size,
    latestAttemptAt: latestAssessment.createdAt,
    providerBreakdown: buildProviderBreakdown(ordered),
    criterionSummaries: criterionBands,
    strongestCriterion: buildCriterionSummary(criterionBands, 0),
    weakestCriterion: buildCriterionSummary(criterionBands, criterionBands.length - 1),
  };
}

export function buildAttemptComparison(
  currentAttempt: SavedAssessmentSnapshot,
  comparedAttempt: SavedAssessmentSnapshot,
): DashboardAttemptComparison {
  const comparedScores = new Map(
    comparedAttempt.report.criterionScores.map((score) => [score.criterion, score.band]),
  );
  const criterionComparisons = currentAttempt.report.criterionScores
    .filter((score) => comparedScores.has(score.criterion))
    .map((score) => {
      const comparedBand = comparedScores.get(score.criterion)!;

      return {
        criterion: score.criterion,
        currentBand: score.band,
        comparedBand,
        delta: roundBand(score.band - comparedBand),
      };
    });
  const taskSpecificCriterionOmitted =
    currentAttempt.report.criterionScores.length !== criterionComparisons.length ||
    comparedAttempt.report.criterionScores.length !== criterionComparisons.length;

  return {
    currentSubmissionId: currentAttempt.submissionId,
    comparedSubmissionId: comparedAttempt.submissionId,
    currentTaskType: currentAttempt.taskType,
    comparedTaskType: comparedAttempt.taskType,
    currentOverallBand: currentAttempt.report.overallBand,
    comparedOverallBand: comparedAttempt.report.overallBand,
    overallBandDelta: roundBand(currentAttempt.report.overallBand - comparedAttempt.report.overallBand),
    currentWordCount: currentAttempt.wordCount,
    comparedWordCount: comparedAttempt.wordCount,
    wordCountDelta: currentAttempt.wordCount - comparedAttempt.wordCount,
    currentTimeSpentMinutes: currentAttempt.timeSpentMinutes,
    comparedTimeSpentMinutes: comparedAttempt.timeSpentMinutes,
    timeSpentDelta: roundBand(currentAttempt.timeSpentMinutes - comparedAttempt.timeSpentMinutes),
    criterionComparisons,
    taskSpecificCriterionOmitted,
  };
}

function buildEmptyStudyPlan(prompts: WritingPrompt[]): StudyPlanSnapshot {
  const task1Prompt = prompts.find((prompt) => prompt.taskType === 'task-1');
  const task2Prompt = prompts.find((prompt) => prompt.taskType === 'task-2');

  return {
    version: STUDY_PLAN_VERSION,
    generatedAt: new Date().toISOString(),
    basedOnSubmissionId: null,
    attemptsConsidered: 0,
    headline: 'Build one scored benchmark for each task before chasing trends.',
    focus: 'Start with one Task 1 response and one Task 2 response so the dashboard can compare your habits.',
    horizonLabel: 'First 2 sessions',
    recommendedSessionLabel: '1 x Task 1 + 1 x Task 2',
    steps: [
      {
        id: 'seed-task-1',
        title: 'Complete a first Task 1 benchmark',
        detail: task1Prompt
          ? `Start with “${task1Prompt.title}” and aim for ${task1Prompt.suggestedWordCount}+ words in ${task1Prompt.recommendedMinutes} minutes.`
          : 'Submit a full Task 1 response under timed conditions.',
        actions: [
          'Draft a one-sentence overview before the body paragraphs.',
          'Highlight the biggest comparison before you start writing.',
        ],
        criterion: 'Overall',
        taskType: 'task-1',
        targetRange: null,
        promptId: task1Prompt?.id ?? null,
        submissionId: null,
        actionLabel: task1Prompt ? 'Open Task 1 prompt' : undefined,
        sessionLabel: 'Session 1',
      },
      {
        id: 'seed-task-2',
        title: 'Add a Task 2 benchmark next',
        detail: task2Prompt
          ? `Then write “${task2Prompt.title}” to compare Task 1 and Task 2 scoring patterns.`
          : 'Follow your Task 1 benchmark with one Task 2 response.',
        actions: [
          'State your position clearly in the introduction.',
          'Keep one body paragraph focused on each main reason.',
        ],
        criterion: 'Overall',
        taskType: 'task-2',
        targetRange: null,
        promptId: task2Prompt?.id ?? null,
        submissionId: null,
        actionLabel: task2Prompt ? 'Open Task 2 prompt' : undefined,
        sessionLabel: 'Session 2',
      },
      {
        id: 'review-first-report',
        title: 'Review feedback before rewriting',
        detail: 'Use the saved report strengths, risks, and next steps to plan your first redraft instead of starting from scratch.',
        actions: [
          'Pick one high-impact next step and apply it before drafting again.',
          'Keep one strength from the report stable while you revise.',
        ],
        criterion: 'Overall',
        taskType: 'either',
        targetRange: null,
        promptId: null,
        submissionId: null,
        actionLabel: undefined,
        sessionLabel: 'Review',
      },
    ],
    carryForward: ['Treat saved reports as coaching notes, not one-off scores.'],
  };
}

function pickUnderpracticedTask(summary: WritingDashboardSummary): WritingTaskType {
  return summary.taskCounts['task-1'] <= summary.taskCounts['task-2'] ? 'task-1' : 'task-2';
}

function buildTaskCoverageStep(taskType: WritingTaskType, prompts: WritingPrompt[]): StudyPlanStep {
  const suggestedPrompt = prompts.find((prompt) => prompt.taskType === taskType);

  return {
    id: 'balance-task-coverage',
    title: `Book one focused ${formatTaskLabel(taskType)} session`,
    detail: suggestedPrompt
      ? `Use “${suggestedPrompt.title}” next so your saved history covers both tasks more evenly.`
      : `Schedule one timed ${formatTaskLabel(taskType)} attempt to balance your saved history.`,
    actions: suggestedPrompt
      ? [
          `Aim for ${suggestedPrompt.suggestedWordCount}+ words in ${suggestedPrompt.recommendedMinutes} minutes.`,
          suggestedPrompt.planningHints[0] ?? 'Keep the next response timed and complete.',
        ]
      : ['Complete one full timed response before comparing task trends again.'],
    criterion: 'Overall',
    taskType,
    targetRange: null,
    promptId: suggestedPrompt?.id ?? null,
    submissionId: null,
    actionLabel: suggestedPrompt ? `Open ${formatTaskLabel(taskType)} prompt` : undefined,
    sessionLabel: 'Session 2',
  };
}

function buildPacingStep(
  latestAssessment: SavedAssessmentSnapshot,
  prompts: WritingPrompt[],
  recentAssessments: SavedAssessmentSnapshot[],
): StudyPlanStep {
  const prompt = prompts.find((item) => item.id === latestAssessment.promptId);
  const averageWords = Math.round(
    recentAssessments.reduce((sum, attempt) => sum + attempt.wordCount, 0) / recentAssessments.length,
  );
  const averageMinutes = Number(
    (recentAssessments.reduce((sum, attempt) => sum + attempt.timeSpentMinutes, 0) / recentAssessments.length).toFixed(1),
  );

  return {
    id: 'protect-pacing',
    title: 'Protect pacing and minimum length',
    detail: prompt
      ? `For ${formatTaskLabel(prompt.taskType)}, aim for ${prompt.suggestedWordCount}+ words in ${prompt.recommendedMinutes} minutes. Your recent average is ${averageWords} words across ${averageMinutes} minutes.`
      : `Repeat one timed attempt and compare your word count and pacing against the latest saved report.`,
    actions: prompt
      ? [
          `Set a ${prompt.recommendedMinutes}-minute timer before you start.`,
          `Do not finish below ${prompt.suggestedWordCount} words unless accuracy collapses.`,
        ]
      : ['Repeat one timed response and log the final word count beside the saved report.'],
    criterion: 'Overall',
    taskType: 'either',
    targetRange: latestAssessment.report.overallBandRange,
    promptId: latestAssessment.promptId,
    submissionId: latestAssessment.submissionId,
    actionLabel: 'Reopen timed attempt',
    sessionLabel: 'Session 3',
  };
}

function buildWeaknessRepairStep(
  latestAssessment: SavedAssessmentSnapshot,
  weakestCriterion: DashboardCriterionSummary | null,
): StudyPlanStep {
  const matchingCriterionScore = weakestCriterion
    ? latestAssessment.report.criterionScores.find((score) => score.criterion === weakestCriterion.criterion)
    : null;
  const relatedAction = weakestCriterion
    ? latestAssessment.report.nextSteps.find((step) => step.criterion === weakestCriterion.criterion)
    : latestAssessment.report.nextSteps[0];
  const supportingActions = latestAssessment.report.nextSteps
    .filter((step) => !weakestCriterion || step.criterion === weakestCriterion.criterion)
    .slice(0, 2)
    .map((step) => `${step.title}: ${step.description}`);

  return {
    id: 'repair-weakest-criterion',
    title: weakestCriterion
      ? `Lift ${weakestCriterion.criterion}`
      : 'Revise the biggest weakness from your latest report',
    detail: relatedAction
      ? `${relatedAction.title}: ${relatedAction.description}`
      : 'Rewrite your latest response using the saved next-step feedback as a checklist.',
    actions:
      supportingActions.length > 0
        ? supportingActions
        : ['Rewrite the latest response with one clear improvement target before scoring again.'],
    criterion: weakestCriterion?.criterion ?? relatedAction?.criterion ?? 'Overall',
    taskType: latestAssessment.taskType,
    targetRange: matchingCriterionScore?.bandRange ?? latestAssessment.report.overallBandRange,
    promptId: latestAssessment.promptId,
    submissionId: latestAssessment.submissionId,
    actionLabel: 'Resume latest report',
    sessionLabel: 'Session 1',
  };
}

export function buildStudyPlan(
  savedAssessments: SavedAssessmentSnapshot[],
  prompts: WritingPrompt[],
): StudyPlanSnapshot {
  if (savedAssessments.length === 0) {
    return buildEmptyStudyPlan(prompts);
  }

  const ordered = sortAssessmentsDescending(savedAssessments);
  const recentAssessments = ordered.slice(0, 3);
  const summary = buildDashboardSummary(ordered);
  const latestAssessment = ordered[0];
  const progress = buildProgressSummary(
    recentAssessments.map((assessment) => ({
      submissionId: assessment.submissionId,
      promptId: assessment.promptId,
      taskType: assessment.taskType,
      overallBand: assessment.report.overallBand,
      overallBandRange: assessment.report.overallBandRange,
      confidence: assessment.report.confidence,
      estimatedWordCount: assessment.report.estimatedWordCount,
      summary: assessment.report.summary,
      createdAt: assessment.createdAt,
    })),
  );
  const underpracticedTask = pickUnderpracticedTask(summary);
  const headline = summary.weakestCriterion
    ? `Focus this week: raise ${summary.weakestCriterion.criterion} without losing your stronger areas.`
    : 'Focus this week: convert feedback into one cleaner timed attempt.';

  return {
    version: STUDY_PLAN_VERSION,
    generatedAt: new Date().toISOString(),
    basedOnSubmissionId: latestAssessment.submissionId,
    attemptsConsidered: ordered.length,
    headline,
    focus: buildStudyPlanFocus(summary, progress),
    horizonLabel: `Next ${Math.min(3, ordered.length + 1)} practice block${ordered.length === 0 ? '' : 's'}`,
    recommendedSessionLabel: `${latestAssessment.timeSpentMinutes.toFixed(0)} min from latest attempt`,
    steps: [
      buildWeaknessRepairStep(latestAssessment, summary.weakestCriterion),
      buildTaskCoverageStep(underpracticedTask, prompts),
      buildPacingStep(latestAssessment, prompts, recentAssessments),
    ],
    carryForward:
      latestAssessment.report.strengths.length > 0
        ? latestAssessment.report.strengths.slice(0, 2)
        : ['Keep the clearest strength from the latest report stable while you revise.'],
  };
}

function buildStudyPlanFocus(summary: WritingDashboardSummary, progress: ProgressSummary) {
  const latestRange = summary.latestRange
    ? `Latest range: Band ${summary.latestRange.lower.toFixed(1)}-${summary.latestRange.upper.toFixed(1)}.`
    : 'No saved range yet.';

  return `${progress.label}. ${latestRange} ${progress.detail}`;
}
