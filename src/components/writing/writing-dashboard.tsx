import Link from 'next/link';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { DashboardMetricGrid, StudyPlanPanel } from '@/components/dashboard';

interface Props {
  summary: WritingDashboardSummary;
  progress: ProgressSummary;
  studyPlan: StudyPlanSnapshot;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'No saved attempt yet';
  }

  return new Date(value).toLocaleString();
}

function formatTaskCoverage(taskCounts: WritingDashboardSummary['taskCounts']) {
  return `${taskCounts['task-1']} Task 1 • ${taskCounts['task-2']} Task 2`;
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

function toTaskTypes(taskType: StudyPlanSnapshot['steps'][number]['taskType']) {
  if (taskType === 'either') {
    return ['task-1', 'task-2'] as const;
  }

  return [taskType] as const;
}

function toDashboardStudyPlan(plan: StudyPlanSnapshot) {
  return {
    summary: plan.focus,
    horizonLabel: `${plan.attemptsConsidered} saved attempt${plan.attemptsConsidered === 1 ? '' : 's'}`,
    recommendedSessionLabel: plan.basedOnSubmissionId ? 'Use the latest saved report first' : undefined,
    steps: plan.steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      detail: step.detail,
      actions: [],
      taskTypes: [...toTaskTypes(step.taskType)],
      sessionLabel: `Step ${index + 1}`,
      targetRange: null,
    })),
    carryForward: plan.basedOnSubmissionId
      ? ['Re-open the latest saved report before drafting the next response.']
      : undefined,
  };
}

export function WritingDashboard({ summary, progress, studyPlan }: Props) {
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
            <Link className="primary-button dashboard-link-button" href="/">
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
                <h2>What is strongest vs. weakest</h2>
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
          </article>
        </div>

        <div className="workspace-column right-column">
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
