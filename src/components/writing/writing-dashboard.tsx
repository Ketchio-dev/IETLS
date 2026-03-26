import Link from 'next/link';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';

interface Props {
  summary: WritingDashboardSummary;
  progress: ProgressSummary;
  studyPlan: StudyPlanSnapshot;
}

function formatRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
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

export function WritingDashboard({ summary, progress, studyPlan }: Props) {
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
                ? formatRange(summary.latestRange.lower, summary.latestRange.upper)
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
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Momentum</p>
                <h2>Aggregated writing metrics</h2>
              </div>
              <span className="band-chip">{formatTaskCoverage(summary.taskCounts)}</span>
            </div>
            <div className="dashboard-stat-grid">
              <div className="metric-card dashboard-metric-card">
                <span>Trend</span>
                <strong>{progress.label}</strong>
                <p className="summary-copy">{progress.detail}</p>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Average band</span>
                <strong>{summary.averageBand?.toFixed(1) ?? '—'}</strong>
                <p className="summary-copy">Across {summary.totalAttempts} saved attempt(s).</p>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Average words</span>
                <strong>{summary.averageWordCount}</strong>
                <p className="summary-copy">Measured across your persisted drafts.</p>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Active practice days</span>
                <strong>{summary.activeDays}</strong>
                <p className="summary-copy">Last attempt: {formatDateTime(summary.latestAttemptAt)}</p>
              </div>
            </div>
          </article>

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

          <section className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Persisted study plan</p>
                <h2>Next lightweight practice cycle</h2>
              </div>
              <span className="band-chip">{studyPlan.attemptsConsidered} attempts used</span>
            </div>
            <article className="history-card inspection-card">
              <div className="history-card-header">
                <strong>{studyPlan.headline}</strong>
                <span>{formatDateTime(studyPlan.generatedAt)}</span>
              </div>
              <p>{studyPlan.focus}</p>
            </article>
            <div className="study-plan-list">
              {studyPlan.steps.map((step, index) => (
                <article className="history-card study-plan-card" key={step.id}>
                  <div className="history-card-header">
                    <strong>
                      {index + 1}. {step.title}
                    </strong>
                    <span>{step.taskType === 'either' ? 'Either task' : step.taskType === 'task-1' ? 'Task 1' : 'Task 2'}</span>
                  </div>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
