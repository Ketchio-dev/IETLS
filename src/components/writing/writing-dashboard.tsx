import Link from 'next/link';

import type {
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
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
import {
  buildDashboardStudyPlanModel,
  buildWritingDashboardMetrics,
  buildWritingNextActionModel,
  buildWritingThemeCoverageModel,
  describeTrendVisual,
} from './writing-dashboard-model';

const WRITING_PRACTICE_PATH = '/writing';

interface Props {
  prompts: WritingPrompt[];
  recentSavedAttempts: SavedAssessmentSnapshot[];
  summary: WritingDashboardSummary;
  progress: ProgressSummary;
  studyPlan: StudyPlanSnapshot;
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
  const dashboardMetrics = buildWritingDashboardMetrics(summary, progress);
  const presentationPlan = buildDashboardStudyPlanModel(studyPlan);
  const themeCoverage = buildWritingThemeCoverageModel(prompts, recentSavedAttempts);
  const nextAction = buildWritingNextActionModel({
    prompts,
    recentSavedAttempts,
    summary,
  });

  return (
    <main className="app-shell">
      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">IELTS Academic • Dashboard</p>
          <h1>Your next Writing move</h1>
          <p className="hero-copy">
            Start with one recommended fix. Open the detailed stats only when you want to review the history behind it.
          </p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href={WRITING_PRACTICE_PATH}>
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
        </div>
      </section>

      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Next best action</p>
                <h2>Fix this next</h2>
              </div>
            </div>
            {nextAction.recommendedPrompt ? (
              <article className="history-card inspection-card">
                <div className="history-card-header">
                  <strong>{nextAction.recommendedPrompt.prompt.title}</strong>
                  <span>{nextAction.recommendedPrompt.reason}</span>
                </div>
                <p className="summary-copy">
                  {nextAction.criterionCoaching
                    ? `Train the weakest criterion first: ${nextAction.criterionCoaching.criterion} toward Band ${nextAction.criterionCoaching.targetBand.toFixed(1)}.`
                    : 'Use this as the next best prompt when you want one clear follow-up choice.'}
                </p>
                {nextAction.criterionCoaching ? (
                  <ul className="plain-list compact-list">
                    {nextAction.criterionCoaching.checklist.slice(0, 2).map((item, index) => (
                      <li key={`${nextAction.criterionCoaching?.criterion}-dashboard-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <p>{nextAction.recommendedPrompt.prompt.prompt}</p>
                <div className="history-meta">
                  <span>{nextAction.recommendedPrompt.theme}</span>
                  <span>{nextAction.recommendedPrompt.difficulty}</span>
                  <span>{nextAction.recommendedPrompt.prompt.taskType === 'task-1' ? 'Task 1' : 'Task 2'}</span>
                </div>
                <div className="history-meta">
                  <span>{nextAction.recommendedPrompt.promptAttemptCount} prompt attempts so far</span>
                  <span>{nextAction.recommendedPrompt.themeAttemptCount} attempts in this theme</span>
                </div>
                <div className="hero-actions">
                  {nextAction.primaryHref ? (
                    <Link className="secondary-link-button" href={nextAction.primaryHref}>
                      {nextAction.primaryLabel}
                    </Link>
                  ) : null}
                  {nextAction.alternateHref ? (
                    <Link className="secondary-link-button" href={nextAction.alternateHref}>
                      Compare another prompt
                    </Link>
                  ) : null}
                </div>
                <div className="dashboard-inline-note">
                  <strong>{nextAction.crossTraining.title}</strong>
                  <p>{nextAction.crossTraining.description}</p>
                  <Link className="secondary-link-button" href="/reading">
                    Switch to Reading practice
                  </Link>
                </div>
              </article>
            ) : (
              <p className="summary-copy">Add prompts or save attempts to unlock the next-prompt recommendation.</p>
            )}
          </article>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Stats</span>
                <strong>Open writing metrics</strong>
              </span>
              <span className="band-chip">{formatTaskCoverage(summary.taskCounts)}</span>
            </summary>
            <DashboardMetricGrid
              title="Aggregated writing metrics"
              description="Saved Task 1 and Task 2 reports condensed into one snapshot so you can see whether your practice is actually moving."
              metrics={dashboardMetrics}
              aside={<span className="band-chip">{formatTaskCoverage(summary.taskCounts)}</span>}
            />
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Theme coverage</span>
                <strong>Open prompt bank coverage</strong>
              </span>
              <span className="band-chip">{themeCoverage.entries.length} themes</span>
            </summary>
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
                  <strong>{themeCoverage.weakestTheme?.theme ?? 'No theme data yet'}</strong>
                  <span>{themeCoverage.weakestTheme ? `${themeCoverage.weakestTheme.attemptCount} attempts` : 'Waiting for attempts'}</span>
                </div>
                <p>
                  {themeCoverage.weakestTheme
                    ? `Next gap to close. ${themeCoverage.weakestTheme.promptCount} prompts are available here, so this is the easiest theme to rebalance next.`
                    : 'Save a few attempts to unlock theme coverage guidance.'}
                </p>
              </div>
              <div className="history-card">
                <div className="history-card-header">
                  <strong>{themeCoverage.strongestTheme?.theme ?? 'No theme data yet'}</strong>
                  <span>{themeCoverage.strongestTheme ? `${themeCoverage.strongestTheme.attemptCount} attempts` : 'Waiting for attempts'}</span>
                </div>
                <p>
                  {themeCoverage.strongestTheme
                    ? 'This is the most-practised theme in your saved history so far.'
                    : 'The dashboard will highlight your most-practised theme after your first saved response.'}
                </p>
              </div>
            </div>
            {themeCoverage.entries.length > 0 ? (
              <div className="dashboard-criterion-list">
                {themeCoverage.entries.map((entry) => (
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
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Criteria</span>
                <strong>Open criterion trends</strong>
              </span>
              <span className="band-chip">{summary.criterionSummaries.length} criteria</span>
            </summary>
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
          </details>
        </div>

        <div className="workspace-column right-column">
          <DashboardRecentAttemptsPanel attempts={recentSavedAttempts} limit={0} prompts={prompts} />

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">More detail</span>
                <strong>Open scoring history</strong>
              </span>
              <span className="band-chip">{summary.providerBreakdown.length} sources</span>
            </summary>
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
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Full path</span>
                <strong>Open saved study plan</strong>
              </span>
              <span className="band-chip">{presentationPlan.horizonLabel}</span>
            </summary>
            <StudyPlanPanel plan={presentationPlan} title={studyPlan.headline} />
          </details>
        </div>
      </section>
    </main>
  );
}
