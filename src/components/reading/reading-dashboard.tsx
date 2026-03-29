import Link from 'next/link';

import { DashboardMetricGrid } from '@/components/dashboard';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

import { formatCompactDuration, formatQuestionType, formatSavedAt } from './reading-formatting';

export function ReadingDashboard({
  dashboardSummary,
  recentAttempts,
  studyFocus,
  importSummary,
}: ReadingDashboardPageData) {
  const readingSetCount = importSummary.importedSetCount;
  const latestSetRefresh = importSummary.latestImportedAt ? formatSavedAt(importSummary.latestImportedAt) : null;

  return (
    <>
      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <DashboardMetricGrid
            title="Reading practice metrics"
            description={studyFocus[0] ?? 'Complete a set to unlock study guidance.'}
            metrics={[
              {
                id: 'avg-score',
                label: 'Average accuracy',
                value:
                  dashboardSummary.averagePercentage == null
                    ? 'No attempts yet'
                    : `${dashboardSummary.averagePercentage}%`,
                detail: 'Practice-set accuracy, not an official IELTS Reading band.',
              },
              {
                id: 'best-score',
                label: 'Best score',
                value: dashboardSummary.bestScoreLabel ?? 'No attempts yet',
                detail: dashboardSummary.latestAttemptAt
                  ? `Latest attempt saved at ${formatSavedAt(dashboardSummary.latestAttemptAt)}.`
                  : 'No attempt history yet.',
              },
              {
                id: 'avg-time',
                label: 'Average time',
                value: formatCompactDuration(dashboardSummary.averageTimeSpentSeconds),
                detail: 'Use elapsed time as a pacing signal while you work through more reading sets.',
              },
            ]}
          />

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Study focus</p>
                <h2>Next action</h2>
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
                <p className="eyebrow">Question types</p>
                <h2>Accuracy by type</h2>
              </div>
            </div>
            {dashboardSummary.strongestType || dashboardSummary.weakestType ? (
              <ul className="plain-list compact-list">
                {dashboardSummary.strongestType ? (
                  <li>
                    <strong>Strongest:</strong> {formatQuestionType(dashboardSummary.strongestType.type)} —{' '}
                    {dashboardSummary.strongestType.correct}/{dashboardSummary.strongestType.total} correct (
                    {dashboardSummary.strongestType.accuracy}%)
                  </li>
                ) : null}
                {dashboardSummary.weakestType ? (
                  <li>
                    <strong>Weakest:</strong> {formatQuestionType(dashboardSummary.weakestType.type)} —{' '}
                    {dashboardSummary.weakestType.correct}/{dashboardSummary.weakestType.total} correct (
                    {dashboardSummary.weakestType.accuracy}%)
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="summary-copy">No scored attempts yet. Complete a practice set to see your accuracy by question type.</p>
            )}
          </article>
        </div>

        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent attempts</p>
                <h2>Recent scored sets</h2>
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
                      <span>{formatCompactDuration(attempt.timeSpentSeconds)}</span>
                      <span>{formatSavedAt(attempt.createdAt)}</span>
                    </div>
                    <div className="hero-actions">
                      <Link
                        className="secondary-link-button"
                        href={`/reading?setId=${encodeURIComponent(attempt.setId)}&attemptId=${encodeURIComponent(attempt.attemptId)}`}
                      >
                        Review this set again
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="summary-copy">No saved attempts yet. Head to the practice page to start your first set.</p>
            )}
          </article>

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ready to practise</p>
                <h2>Available practice sets</h2>
              </div>
            </div>
            <p className="summary-copy">
              {readingSetCount > 0
                ? 'Your current practice sets are ready. Add more later if you want extra topic variety.'
                : 'No reading sets are available yet. Add a set before your next practice session.'}
            </p>
            <ul className="plain-list compact-list">
              <li>Sets ready: {readingSetCount}</li>
              <li>Collections: {importSummary.detectedSourceFiles.length}</li>
              <li>Updated: {latestSetRefresh ?? 'No update yet'}</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
