import Link from 'next/link';

import { DashboardMetricGrid, StudyPlanPanel } from '@/components/dashboard';
import { getReadingToWritingCrossTraining } from '@/lib/services/cross-training';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

import {
  buildReadingAttemptResumeHref,
  buildReadingAttemptRetryHref,
  hasMissedQuestions,
} from './reading-attempt-utils';
import { formatCompactDuration, formatQuestionType, formatSavedAt } from './reading-formatting';

export function ReadingDashboard({
  dashboardSummary,
  recentAttempts,
  studyFocus,
  studyPlan,
  importSummary,
}: ReadingDashboardPageData) {
  const readingSetCount = importSummary.importedSetCount;
  const latestSetRefresh = importSummary.latestImportedAt ? formatSavedAt(importSummary.latestImportedAt) : null;
  const latestRetryAttempt = recentAttempts.find((attempt) => hasMissedQuestions(attempt.report.questionReviews)) ?? null;
  const crossTraining = getReadingToWritingCrossTraining(dashboardSummary);
  const visibleRecentAttempts = recentAttempts.slice(0, 1);

  return (
    <>
      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
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
            {latestRetryAttempt ? (
              <div className="hero-actions">
                <Link className="primary-button" href={buildReadingAttemptRetryHref(latestRetryAttempt)}>
                  Retry missed questions
                </Link>
              </div>
            ) : null}
            <div className="dashboard-inline-note">
              <strong>{crossTraining.title}</strong>
              <p>{crossTraining.description}</p>
              <Link className="secondary-link-button" href="/writing">
                Switch to Writing practice
              </Link>
            </div>
          </article>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Stats</span>
                <strong>Open Reading metrics</strong>
              </span>
              <span className="band-chip">
                {dashboardSummary.averagePercentage == null ? 'No score' : `${dashboardSummary.averagePercentage}%`}
              </span>
            </summary>
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
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Full path</span>
                <strong>Open today&apos;s Reading path</strong>
              </span>
              <span className="band-chip">{studyPlan?.horizonLabel ?? 'Plan'}</span>
            </summary>
            <StudyPlanPanel plan={studyPlan ?? null} title="Follow today's Reading path" />
          </details>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Question types</span>
                <strong>Open accuracy by type</strong>
              </span>
              <span className="band-chip">Details</span>
            </summary>
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
          </details>
        </div>

        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent attempts</p>
                <h2>Latest scored set</h2>
              </div>
            </div>
            {recentAttempts.length > 0 ? (
              <div className="history-list">
                {visibleRecentAttempts.map((attempt) => (
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
                      {hasMissedQuestions(attempt.report.questionReviews) ? (
                        <Link
                          className="primary-button"
                          href={buildReadingAttemptRetryHref(attempt)}
                        >
                          Retry missed questions
                        </Link>
                      ) : null}
                      <Link
                        className="secondary-link-button"
                        href={buildReadingAttemptResumeHref(attempt)}
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
            {recentAttempts.length > visibleRecentAttempts.length ? (
              <p className="summary-copy dashboard-inline-note">
                Showing the latest attempt. Older attempts stay available through reopened set links.
              </p>
            ) : null}
          </article>

          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">Practice sets</span>
                <strong>Open available set details</strong>
              </span>
              <span className="band-chip">{readingSetCount} sets</span>
            </summary>
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
          </details>
        </div>
      </section>
    </>
  );
}
