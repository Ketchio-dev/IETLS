import Link from 'next/link';

import { buildPracticeWorkspaceHref, writingAssessmentWorkspace } from '@/lib/assessment-modules/workspace';
import type {
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  WritingTaskType,
  WritingDashboardSummary,
  WritingPrompt,
} from '@/lib/domain';
import { DashboardMetricGrid, StudyPlanPanel } from '@/components/dashboard';
import {
  formatCriterionTaskCoverage,
  formatDateTime,
  formatSignedBandDelta,
  formatTaskCoverage,
  formatTrendLabel,
} from '@/components/dashboard/dashboard-formatting';
import { DashboardRecentAttemptsPanel } from '@/components/dashboard/dashboard-recent-attempts-panel';
import { buildPromptRecommendations } from '@/lib/services/writing/prompt-recommendations';
import { getPromptTheme } from '@/lib/services/writing/prompt-taxonomy';

interface ThemeCoverageEntry {
  theme: string;
  promptCount: number;
  attemptCount: number;
  latestAttemptAt: string | null;
}

interface Props {
  prompts: WritingPrompt[];
  recentSavedAttempts: SavedAssessmentSnapshot[];
  summary: WritingDashboardSummary;
  progress: ProgressSummary;
  studyPlan: StudyPlanSnapshot;
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

function buildDashboardMetrics(summary: WritingDashboardSummary, progress: ProgressSummary) {
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

function toDashboardStudyPlan(plan: StudyPlanSnapshot) {
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
        actionHref: buildStudyPlanHref(step),
        actionLabel: step.actionLabel,
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

function describeTrendVisual(entry: WritingDashboardSummary['criterionSummaries'][number]) {
  return `Recent ${entry.criterion} bands: ${entry.recentBands.map((band) => band.toFixed(1)).join(', ')}`;
}

function buildThemeCoverage(prompts: WritingPrompt[], savedAttempts: SavedAssessmentSnapshot[]) {
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

function TrendMiniBars({ entry }: { entry: WritingDashboardSummary['criterionSummaries'][number] }) {
  return (
    <div className="dashboard-trend-visual">
      <span className="dashboard-trend-caption">Older</span>
      <div
        aria-label={describeTrendVisual(entry)}
        className="dashboard-trend-bars"
        role="img"
      >
        {entry.recentBands.map((band, index) => {
          const height = `${Math.max(24, Math.round((band / 9) * 100))}%`;

          return (
            <span
              aria-hidden="true"
              className="dashboard-trend-bar"
              key={`${entry.criterion}-${index}-${band}`}
              style={{ height }}
            />
          );
        })}
      </div>
      <span className="dashboard-trend-caption">Latest</span>
    </div>
  );
}

export function WritingDashboard({ prompts, recentSavedAttempts, summary, progress, studyPlan }: Props) {
  const dashboardMetrics = buildDashboardMetrics(summary, progress);
  const presentationPlan = toDashboardStudyPlan(studyPlan);
  const themeCoverage = buildThemeCoverage(prompts, recentSavedAttempts);
  const weakestTheme = themeCoverage[0] ?? null;
  const strongestTheme = [...themeCoverage].sort((a, b) => b.attemptCount - a.attemptCount || a.theme.localeCompare(b.theme))[0] ?? null;
  const promptRecommendations = buildPromptRecommendations({
    prompts,
    savedAttempts: recentSavedAttempts,
  }, 2);
  const recommendedPrompt = promptRecommendations[0] ?? null;
  const alternatePrompt = promptRecommendations[1] ?? null;

  return (
    <main className="app-shell">
      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">IELTS Academic • Dashboard</p>
          <h1>Track writing momentum across every saved assessment</h1>
          <p className="hero-copy">
            Review score movement, task coverage, and a saved study plan built from your latest
            assessment history.
          </p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href={writingAssessmentWorkspace.practicePath}>
              Return to practice shell
            </Link>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Total attempts</span>
            <strong>{summary.totalAttempts}</strong>
          </div>
          <div className="metric-card">
            <span>Latest range</span>
            <strong>
              {summary.latestRange
                ? `Band ${summary.latestRange.lower.toFixed(1)}-${summary.latestRange.upper.toFixed(1)}`
                : 'No data yet'}
            </strong>
          </div>
          <div className="metric-card">
            <span>Best band</span>
            <strong>{summary.bestBand?.toFixed(1) ?? '—'}</strong>
          </div>
          <div className="metric-card">
            <span>Practice time</span>
            <strong>{summary.totalPracticeMinutes.toFixed(1)} min</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <DashboardMetricGrid
            title="Aggregated writing metrics"
            description="Saved Task 1 and Task 2 reports condensed into one snapshot so you can see whether your practice is actually moving."
            metrics={dashboardMetrics}
            aside={<span className="band-chip">{formatTaskCoverage(summary.taskCounts)}</span>}
          />

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Next revision target</p>
                <h2>Fix this next</h2>
              </div>
            </div>
            {recommendedPrompt ? (
              <article className="history-card inspection-card">
                <div className="history-card-header">
                  <strong>{recommendedPrompt.prompt.title}</strong>
                  <span>{recommendedPrompt.reason}</span>
                </div>
                <p className="summary-copy">
                  {summary.weakestCriterion
                    ? `Train the weakest criterion first: ${summary.weakestCriterion.criterion}.`
                    : 'Use this as the next best prompt when you want one clear follow-up choice.'}
                </p>
                <p>{recommendedPrompt.prompt.prompt}</p>
                <div className="history-meta">
                  <span>{recommendedPrompt.theme}</span>
                  <span>{recommendedPrompt.difficulty}</span>
                  <span>{recommendedPrompt.prompt.taskType === 'task-1' ? 'Task 1' : 'Task 2'}</span>
                </div>
                <div className="history-meta">
                  <span>{recommendedPrompt.promptAttemptCount} prompt attempts so far</span>
                  <span>{recommendedPrompt.themeAttemptCount} attempts in this theme</span>
                </div>
                <div className="hero-actions">
                  <Link
                    className="secondary-link-button"
                    href={buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
                      promptId: recommendedPrompt.prompt.id,
                    })}
                  >
                    Open revision target
                  </Link>
                  {alternatePrompt ? (
                    <Link
                      className="secondary-link-button"
                      href={buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
                        promptId: alternatePrompt.prompt.id,
                      })}
                    >
                      Compare another prompt
                    </Link>
                  ) : null}
                </div>
              </article>
            ) : (
              <p className="summary-copy">Add prompts or save attempts to unlock the next-prompt recommendation.</p>
            )}
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Theme coverage</p>
                <h2>Prompt bank coverage by theme</h2>
              </div>
            </div>
            <div className="dashboard-insight-grid">
              <div className="history-card">
                <div className="history-card-header">
                  <strong>{weakestTheme?.theme ?? 'No theme data yet'}</strong>
                  <span>{weakestTheme ? `${weakestTheme.attemptCount} attempts` : 'Waiting for attempts'}</span>
                </div>
                <p>
                  {weakestTheme
                    ? `Next gap to close. ${weakestTheme.promptCount} prompts are available here, so this is the easiest theme to rebalance next.`
                    : 'Save a few attempts to unlock theme coverage guidance.'}
                </p>
              </div>
              <div className="history-card">
                <div className="history-card-header">
                  <strong>{strongestTheme?.theme ?? 'No theme data yet'}</strong>
                  <span>{strongestTheme ? `${strongestTheme.attemptCount} attempts` : 'Waiting for attempts'}</span>
                </div>
                <p>
                  {strongestTheme
                    ? 'This is the most-practised theme in your saved history so far.'
                    : 'The dashboard will highlight your most-practised theme after your first saved response.'}
                </p>
              </div>
            </div>
            {themeCoverage.length > 0 ? (
              <div className="dashboard-criterion-list">
                {themeCoverage.map((entry) => (
                  <article className="history-card" key={entry.theme}>
                    <div className="history-card-header">
                      <strong>{entry.theme}</strong>
                      <span>{entry.attemptCount} attempts</span>
                    </div>
                    <div className="history-meta">
                      <span>{entry.promptCount} prompts in bank</span>
                      <span>{entry.latestAttemptAt ? `Latest: ${formatDateTime(entry.latestAttemptAt)}` : 'No saved attempt yet'}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Criteria</p>
                <h2>Criterion trend summaries</h2>
              </div>
            </div>
            <div className="dashboard-insight-grid">
              <div className="history-card">
                <div className="history-card-header">
                  <strong>{summary.strongestCriterion?.criterion ?? 'No criterion data yet'}</strong>
                  <span>
                    {summary.strongestCriterion
                      ? `Avg ${summary.strongestCriterion.averageBand.toFixed(1)}`
                      : 'Waiting for scores'}
                  </span>
                </div>
                <p>
                  {summary.strongestCriterion
                    ? 'This is the most reliable scoring area in your saved history right now.'
                    : 'Complete a scored response to unlock criterion comparisons.'}
                </p>
              </div>
              <div className="history-card">
                <div className="history-card-header">
                  <strong>{summary.weakestCriterion?.criterion ?? 'No criterion data yet'}</strong>
                  <span>
                    {summary.weakestCriterion
                      ? `Avg ${summary.weakestCriterion.averageBand.toFixed(1)}`
                      : 'Waiting for scores'}
                  </span>
                </div>
                <p>
                  {summary.weakestCriterion
                    ? 'Use the study plan below to turn this weaker criterion into the next revision target.'
                    : 'The dashboard will recommend a weak-area repair step after your first scored attempt.'}
                </p>
              </div>
            </div>

            {summary.criterionSummaries.length > 0 ? (
              <div className="dashboard-criterion-list">
                {summary.criterionSummaries.map((entry) => (
                  <article className="history-card" key={entry.criterion}>
                    <div className="history-card-header">
                      <strong>{entry.criterion}</strong>
                      <span>{entry.averageBand.toFixed(1)} average</span>
                    </div>
                    <TrendMiniBars entry={entry} />
                    <div className="history-meta">
                      <span>{formatTrendLabel(entry.trend)}</span>
                      <span>{formatSignedBandDelta(entry.delta)}</span>
                    </div>
                    <div className="history-meta">
                      <span>Latest: {entry.latestBand.toFixed(1)}</span>
                      <span>{formatCriterionTaskCoverage(entry.taskTypes)}</span>
                      <span>{entry.attemptsConsidered} scored attempts</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        </div>

        <div className="workspace-column right-column">
          <DashboardRecentAttemptsPanel attempts={recentSavedAttempts} prompts={prompts} />

          <section className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Saved reports</p>
                <h2>Scoring history</h2>
              </div>
            </div>
            <p className="summary-copy">
              Use saved reports to compare broad scoring trends and keep an eye on which scoring path handled each report.
            </p>
            {summary.providerBreakdown.length === 0 ? (
              <p className="summary-copy">Score source details will appear after your first saved report.</p>
            ) : (
              <div className="history-list dashboard-provider-list">
                {summary.providerBreakdown.map((provider) => (
                  <article className="history-card" key={provider.provider}>
                    <div className="history-card-header">
                      <strong>{provider.count} saved attempt{provider.count === 1 ? '' : 's'}</strong>
                      <span>{provider.provider}</span>
                    </div>
                    <div className="history-meta">
                      <span>{provider.liveCount} primary scoring path{provider.liveCount === 1 ? '' : 's'}</span>
                      <span>{provider.fallbackCount} backup scoring path{provider.fallbackCount === 1 ? '' : 's'}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <StudyPlanPanel plan={presentationPlan} title={studyPlan.headline} />
        </div>
      </section>
    </main>
  );
}
