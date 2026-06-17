import Link from 'next/link';

import { formatDateTime } from '@/components/dashboard/dashboard-formatting';
import { loadReviewDashboardData, loadReviewStreak } from '@/lib/services/review/application-service';

function describeType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function ReviewDashboardPage() {
  const [{ summary, forecast, typeProgress, activity, masteryPct }, streak] = await Promise.all([
    loadReviewDashboardData(),
    loadReviewStreak(),
  ]);

  const headlineStats = [
    { label: 'Tracked', value: String(summary.totalTracked) },
    { label: 'Mastered', value: `${masteryPct}%` },
    { label: 'Due now', value: String(summary.dueCount) },
    { label: 'Review accuracy', value: activity.accuracyPct === null ? 'No data yet' : `${activity.accuracyPct}%` },
  ];

  const forecastCards = [
    { label: 'Due now', value: forecast.dueNow },
    { label: 'Next 24h', value: forecast.next24h },
    { label: 'Next 7 days', value: forecast.next7d },
    { label: 'Later', value: forecast.later },
  ];

  const activityCards = [
    { label: 'Reviews done', value: String(activity.totalReviews) },
    { label: 'Correct', value: String(activity.totalCorrect) },
    { label: 'Lapses', value: String(activity.totalLapses) },
    { label: 'Last review', value: activity.lastReviewedAt ? formatDateTime(activity.lastReviewedAt) : 'No reviews yet' },
  ];

  const streakCards = [
    { label: 'Current streak', value: `${streak.currentStreak} day${streak.currentStreak === 1 ? '' : 's'}` },
    { label: 'Longest streak', value: `${streak.longestStreak} day${streak.longestStreak === 1 ? '' : 's'}` },
    { label: 'Today', value: `${streak.todayCount}/${streak.goal}` },
    { label: 'Active days', value: String(streak.activeDays) },
  ];

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link className="breadcrumb-link" href="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <Link className="breadcrumb-link" href="/review">Review</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Dashboard</span>
      </nav>

      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">Review dashboard</p>
          <h1>Your spaced-repetition progress.</h1>
          <p className="hero-copy">
            Track how missed Reading questions move from learning to mastered, and see what is coming due so you never
            let a fix fade.
          </p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href="/review">
              {summary.dueCount > 0 ? `Review ${summary.dueCount} due now` : 'Open review queue'}
            </Link>
          </div>
        </div>
        <aside className="curriculum-current-card" aria-label="Deck mastery">
          <span className="band-chip">Mastery</span>
          <h2>{masteryPct}%</h2>
          <p className="summary-copy">
            {summary.masteredCount} of {summary.totalTracked} tracked question{summary.totalTracked === 1 ? '' : 's'}{' '}
            mastered.
          </p>
        </aside>
      </section>

      {summary.totalTracked === 0 ? (
        <section className="workspace-column">
          <article className="panel review-empty-card">
            <p className="eyebrow">No review data yet</p>
            <h2>Finish a Reading set to start tracking.</h2>
            <p className="summary-copy">
              Every question you miss is added here automatically and scheduled for spaced review.
            </p>
            <div className="hero-actions">
              <Link className="primary-button dashboard-link-button" href="/reading">
                Open reading practice
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <>
          <section className="workspace-column">
            <div className="panel primary-section-header">
              <p className="eyebrow">Consistency</p>
              <h2>{streak.currentStreak > 0 ? `${streak.currentStreak}-day review streak` : 'Start a review streak today'}</h2>
              <p className="summary-copy">
                {streak.goalMet
                  ? `Daily goal hit — ${streak.todayCount} reviews done today. Keep the streak alive tomorrow.`
                  : `${streak.todayCount} of ${streak.goal} daily reviews done${streak.todayCount > 0 ? `, ${streak.goal - streak.todayCount} to go` : ''}.`}
              </p>
            </div>
            <div className="module-stat-grid">
              {streakCards.map((card) => (
                <div className="module-stat-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-column">
            <div className="panel primary-section-header">
              <p className="eyebrow">Headline</p>
              <h2>Deck at a glance</h2>
            </div>
            <div className="module-stat-grid">
              {headlineStats.map((stat) => (
                <div className="module-stat-card" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-column">
            <div className="panel primary-section-header">
              <p className="eyebrow">Coming due</p>
              <h2>Due forecast</h2>
              <p className="summary-copy">
                {summary.nextDueAt ? `Next item due ${formatDateTime(summary.nextDueAt)}.` : 'Nothing scheduled yet.'}
              </p>
            </div>
            <div className="module-stat-grid">
              {forecastCards.map((card) => (
                <div className="module-stat-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-column">
            <div className="panel primary-section-header">
              <p className="eyebrow">By question type</p>
              <h2>Where your weak spots are</h2>
              <p className="summary-copy">Sorted by what is due, then by lowest mastery.</p>
            </div>
            <div className="panel review-type-list">
              {typeProgress.map((entry) => (
                <div className="review-type-row" key={entry.type}>
                  <div className="review-type-head">
                    <strong>{describeType(entry.type)}</strong>
                    <span>
                      {entry.mastered}/{entry.tracked} mastered{entry.due > 0 ? ` · ${entry.due} due` : ''}
                    </span>
                  </div>
                  <div className="review-type-bar" aria-hidden="true">
                    <span style={{ width: `${entry.masteryPct}%` }} />
                  </div>
                  <div className="review-type-meta">
                    <span>Mastery {entry.masteryPct}%</span>
                    <span>Accuracy {entry.accuracyPct === null ? '—' : `${entry.accuracyPct}%`}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-column">
            <div className="panel primary-section-header">
              <p className="eyebrow">Activity</p>
              <h2>Lifetime review effort</h2>
            </div>
            <div className="module-stat-grid">
              {activityCards.map((card) => (
                <div className="module-stat-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
