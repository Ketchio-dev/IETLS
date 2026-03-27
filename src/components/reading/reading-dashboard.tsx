import Link from 'next/link';

import { DashboardMetricGrid } from '@/components/dashboard';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

function formatType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ReadingDashboard({
  dashboardSummary,
  recentAttempts,
  studyFocus,
  importSummary,
}: ReadingDashboardPageData) {
  return (
    <>
      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <DashboardMetricGrid
            title="Reading drill metrics"
            description={studyFocus[0] ?? 'Complete a drill to unlock study guidance.'}
            metrics={[
              {
                id: 'avg-score',
                label: 'Average score',
                value:
                  dashboardSummary.averagePercentage == null
                    ? 'No attempts yet'
                    : `${dashboardSummary.averagePercentage}%`,
                detail: 'Deterministic imported-drill accuracy, not an official IELTS Reading band.',
              },
              {
                id: 'best-score',
                label: 'Best score',
                value: dashboardSummary.bestScoreLabel ?? 'No attempts yet',
                detail: dashboardSummary.latestAttemptAt
                  ? `Latest attempt saved at ${dashboardSummary.latestAttemptAt}.`
                  : 'No attempt history yet.',
              },
              {
                id: 'avg-time',
                label: 'Average time',
                value: `${dashboardSummary.averageTimeSpentSeconds}s`,
                detail: 'Use elapsed time as a pacing signal while you iterate on imported drills.',
              },
            ]}
          />

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Study focus</p>
                <h2>Next private-drill actions</h2>
              </div>
            </div>
            <ul className="plain-list compact-list">
              {studyFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Question families</p>
                <h2>Accuracy by type</h2>
              </div>
            </div>
            {dashboardSummary.strongestType || dashboardSummary.weakestType ? (
              <ul className="plain-list compact-list">
                {dashboardSummary.strongestType ? (
                  <li>
                    <strong>Strongest:</strong> {formatType(dashboardSummary.strongestType.type)} —{' '}
                    {dashboardSummary.strongestType.correct}/{dashboardSummary.strongestType.total} correct (
                    {dashboardSummary.strongestType.accuracy}%)
                  </li>
                ) : null}
                {dashboardSummary.weakestType ? (
                  <li>
                    <strong>Weakest:</strong> {formatType(dashboardSummary.weakestType.type)} —{' '}
                    {dashboardSummary.weakestType.correct}/{dashboardSummary.weakestType.total} correct (
                    {dashboardSummary.weakestType.accuracy}%)
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="summary-copy">No scored attempts yet. Finish one imported drill to populate type accuracy.</p>
            )}
          </article>
        </div>

        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent attempts</p>
                <h2>Saved drill history</h2>
              </div>
            </div>
            {recentAttempts.length > 0 ? (
              <div className="history-list">
                {recentAttempts.map((attempt) => (
                  <article className="history-card" key={attempt.attemptId}>
                    <div className="history-card-header">
                      <strong>{attempt.setTitle}</strong>
                      <span>{attempt.report.scoreLabel}</span>
                    </div>
                    <p>{attempt.report.summary}</p>
                    <div className="history-meta">
                      <span>{attempt.report.percentage}% accuracy</span>
                      <span>{attempt.timeSpentSeconds}s</span>
                      <span>{attempt.createdAt}</span>
                    </div>
                    <div className="hero-actions">
                      <Link
                        className="secondary-link-button"
                        href={`/reading?setId=${encodeURIComponent(attempt.setId)}&attemptId=${encodeURIComponent(attempt.attemptId)}`}
                      >
                        Resume in practice shell
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="summary-copy">No saved reading attempts yet.</p>
            )}
          </article>

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Private imports</p>
                <h2>Local bank status</h2>
              </div>
            </div>
            <p className="summary-copy">
              Run <code>{importSummary.importCommand}</code> after editing files in <code>{importSummary.sourceDir}</code>.
            </p>
            <ul className="plain-list compact-list">
              <li>Detected source files: {importSummary.detectedSourceFiles.length}</li>
              <li>Imported sets: {importSummary.importedSetCount}</li>
              <li>Compiled output: {importSummary.compiledOutputLabel}</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
