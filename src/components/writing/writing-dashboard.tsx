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
      label: 'Full-test estimate',
      value: summary.latestFullTestEstimateBand?.toFixed(1) ?? 'Need Task 1 + Task 2',
      detail:
        summary.latestFullTestEstimateBand == null
          ? 'Save your latest Task 1 and Task 2 reports to unlock an IELTS-style 1:2 weighted full-test estimate built from overall bands.'
          : `Built from the latest saved Task 1 ${summary.latestFullTestTask1Band?.toFixed(1)} and Task 2 ${summary.latestFullTestTask2Band?.toFixed(1)} overall estimates with IELTS-style 1:2 weighting. Public calibration currently adjusts overall bands only, not criterion bands.`,
      eyebrow: 'Task weighting',
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
      detail: 'Measured across your persisted drafts.',
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

  return (
    <main className="app-shell">
      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">IELTS Academic • Dashboard</p>
          <h1>Track writing momentum across every saved assessment</h1>
          <p className="hero-copy">
            Review score movement, task coverage, and a persisted study plan built from your latest
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
            description="Your saved Task 1 and Task 2 attempts condensed into one snapshot."
            metrics={dashboardMetrics}
            aside={<span className="band-chip">{formatTaskCoverage(summary.taskCounts)}</span>}
          />

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
                <p className="eyebrow">Scoring pipeline</p>
                <h2>Saved scorer usage</h2>
              </div>
            </div>
            {summary.providerBreakdown.length === 0 ? (
              <p className="summary-copy">No persisted scoring metadata yet.</p>
            ) : (
              <div className="history-list dashboard-provider-list">
                {summary.providerBreakdown.map((provider) => (
                  <article className="history-card" key={provider.provider}>
                    <div className="history-card-header">
                      <strong>{provider.provider}</strong>
                      <span>{provider.count} attempts</span>
                    </div>
                    <div className="history-meta">
                      <span>Live: {provider.liveCount}</span>
                      <span>Fallback: {provider.fallbackCount}</span>
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
