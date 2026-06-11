import { buildPracticeWorkspaceHref, writingAssessmentWorkspace } from '@/lib/assessment-modules/workspace';
import type { DashboardMetricCard, DashboardStudyPlan } from '@/components/dashboard/dashboard-types';
import type {
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  WritingDashboardSummary,
  WritingPrompt,
  WritingTaskType,
} from '@/lib/domain';
import { getWritingToReadingCrossTraining } from '@/lib/services/cross-training';
import {
  buildReportCriterionCoachingPlan,
  type CriterionCoachingPlan,
} from '@/lib/services/writing/feedback-generator';
import {
  buildPromptRecommendations,
  type PromptRecommendation,
} from '@/lib/services/writing/prompt-recommendations';
import { getPromptTheme } from '@/lib/services/writing/prompt-taxonomy';

import { formatDateTime } from '@/components/dashboard/dashboard-formatting';

export interface ThemeCoverageEntry {
  theme: string;
  promptCount: number;
  attemptCount: number;
  latestAttemptAt: string | null;
}

export interface WritingThemeCoverageModel {
  entries: ThemeCoverageEntry[];
  weakestTheme: ThemeCoverageEntry | null;
  strongestTheme: ThemeCoverageEntry | null;
}

export interface WritingNextActionModel {
  recommendedPrompt: PromptRecommendation | null;
  alternatePrompt: PromptRecommendation | null;
  criterionCoaching: CriterionCoachingPlan | null;
  crossTraining: ReturnType<typeof getWritingToReadingCrossTraining>;
  primaryHref: string | null;
  primaryLabel: string;
  alternateHref: string | null;
}

function buildStudyPlanHref(step: StudyPlanSnapshot['steps'][number]) {
  if (!step.promptId) {
    return undefined;
  }

  return buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
    promptId: step.promptId,
    attemptId: step.submissionId ?? undefined,
  });
}

function getLatestAssessment(savedAttempts: SavedAssessmentSnapshot[]) {
  return savedAttempts.reduce<SavedAssessmentSnapshot | null>(
    (latest, attempt) => (!latest || attempt.createdAt > latest.createdAt ? attempt : latest),
    null,
  );
}

export function buildWritingDashboardMetrics(
  summary: WritingDashboardSummary,
  progress: ProgressSummary,
): DashboardMetricCard[] {
  return [
    {
      id: 'trend',
      label: 'Trend',
      value: progress.label,
      detail: progress.detail,
      eyebrow: 'Momentum',
    },
    {
      id: 'full-test-weighted-band',
      label: 'Overall writing estimate',
      value: summary.latestFullTestEstimateBand?.toFixed(1) ?? 'Need Task 1 + Task 2',
      detail:
        summary.latestFullTestEstimateBand == null
          ? 'Save one recent Task 1 and one recent Task 2 report to unlock an overall writing estimate.'
          : `Based on your latest Task 1 ${summary.latestFullTestTask1Band?.toFixed(1)} and Task 2 ${summary.latestFullTestTask2Band?.toFixed(1)} scores.`,
      eyebrow: 'Latest saved tasks',
    },
    {
      id: 'average-band',
      label: 'Average band',
      value: summary.averageBand?.toFixed(1) ?? '—',
      detail: `Across ${summary.totalAttempts} saved attempt(s).`,
      eyebrow: 'Consistency',
    },
    {
      id: 'average-words',
      label: 'Average words',
      value: String(summary.averageWordCount),
      detail: 'Measured across your saved drafts.',
      eyebrow: 'Output',
    },
    {
      id: 'active-days',
      label: 'Active practice days',
      value: String(summary.activeDays),
      detail: `Last attempt: ${formatDateTime(summary.latestAttemptAt)}`,
      eyebrow: 'Recency',
    },
  ];
}

export function buildDashboardStudyPlanModel(plan: StudyPlanSnapshot): DashboardStudyPlan {
  return {
    summary: plan.focus,
    horizonLabel:
      plan.horizonLabel ??
      `${plan.attemptsConsidered} saved attempt${plan.attemptsConsidered === 1 ? '' : 's'}`,
    recommendedSessionLabel:
      plan.recommendedSessionLabel ??
      (plan.basedOnSubmissionId ? 'Use the latest saved report first' : undefined),
    steps: plan.steps.map((step, index) => {
      const taskTypes: WritingTaskType[] =
        step.taskType === 'either' ? ['task-1', 'task-2'] : [step.taskType];

      return {
        id: step.id,
        title: step.title,
        detail: step.detail,
        actions: step.actions,
        criterion: step.criterion,
        taskTypes,
        sessionLabel: step.sessionLabel ?? `Step ${index + 1}`,
        targetRange: step.targetRange ?? null,
        actionHref: step.actionHref ?? buildStudyPlanHref(step),
        actionLabel: step.actionLabel,
        phase: step.phase,
        status: step.status,
        completionSignal: step.completionSignal,
        completedAt: step.completedAt,
        moduleLabel: step.moduleLabel,
      };
    }),
    carryForward:
      plan.carryForward.length > 0
        ? plan.carryForward
        : plan.basedOnSubmissionId
          ? ['Re-open the latest saved report before drafting the next response.']
          : undefined,
  };
}

export function describeTrendVisual(entry: WritingDashboardSummary['criterionSummaries'][number]) {
  return `Recent ${entry.criterion} bands: ${entry.recentBands.map((band) => band.toFixed(1)).join(', ')}`;
}

export function buildWritingThemeCoverage(
  prompts: WritingPrompt[],
  savedAttempts: SavedAssessmentSnapshot[],
): ThemeCoverageEntry[] {
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt] as const));
  const counts = new Map<string, ThemeCoverageEntry>();

  for (const prompt of prompts) {
    const theme = getPromptTheme(prompt);
    const current = counts.get(theme) ?? { theme, promptCount: 0, attemptCount: 0, latestAttemptAt: null };
    current.promptCount += 1;
    counts.set(theme, current);
  }

  for (const attempt of savedAttempts) {
    const prompt = promptById.get(attempt.promptId);
    if (!prompt) {
      continue;
    }

    const theme = getPromptTheme(prompt);
    const current = counts.get(theme) ?? { theme, promptCount: 0, attemptCount: 0, latestAttemptAt: null };
    current.attemptCount += 1;
    if (!current.latestAttemptAt || attempt.createdAt > current.latestAttemptAt) {
      current.latestAttemptAt = attempt.createdAt;
    }
    counts.set(theme, current);
  }

  return [...counts.values()].sort(
    (a, b) =>
      a.attemptCount - b.attemptCount ||
      b.promptCount - a.promptCount ||
      a.theme.localeCompare(b.theme),
  );
}

export function buildWritingThemeCoverageModel(
  prompts: WritingPrompt[],
  savedAttempts: SavedAssessmentSnapshot[],
): WritingThemeCoverageModel {
  const entries = buildWritingThemeCoverage(prompts, savedAttempts);
  const strongestTheme = entries.reduce<ThemeCoverageEntry | null>((strongest, entry) => {
    if (!strongest) {
      return entry;
    }

    return entry.attemptCount > strongest.attemptCount ||
      (entry.attemptCount === strongest.attemptCount && entry.theme.localeCompare(strongest.theme) < 0)
      ? entry
      : strongest;
  }, null);

  return {
    entries,
    weakestTheme: entries[0] ?? null,
    strongestTheme,
  };
}

export function buildWritingNextActionModel({
  prompts,
  recentSavedAttempts,
  summary,
}: {
  prompts: WritingPrompt[];
  recentSavedAttempts: SavedAssessmentSnapshot[];
  summary: WritingDashboardSummary;
}): WritingNextActionModel {
  const promptRecommendations = buildPromptRecommendations({
    prompts,
    savedAttempts: recentSavedAttempts,
  }, 2);
  const recommendedPrompt = promptRecommendations[0] ?? null;
  const alternatePrompt = promptRecommendations[1] ?? null;
  const latestAssessment = getLatestAssessment(recentSavedAttempts);
  const weakestCriterion = summary.weakestCriterion?.criterion;
  const criterionCoaching = latestAssessment
    ? buildReportCriterionCoachingPlan(latestAssessment.report, weakestCriterion)
    : null;

  return {
    recommendedPrompt,
    alternatePrompt,
    criterionCoaching,
    crossTraining: getWritingToReadingCrossTraining(summary),
    primaryHref: recommendedPrompt
      ? buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
          promptId: recommendedPrompt.prompt.id,
        })
      : null,
    primaryLabel: criterionCoaching ? `Train ${criterionCoaching.criterion} next` : 'Open revision target',
    alternateHref: alternatePrompt
      ? buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
          promptId: alternatePrompt.prompt.id,
        })
      : null,
  };
}
