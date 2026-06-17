import Link from 'next/link';

import { ReviewPracticeShell } from '@/components/review/review-practice-shell';
import { loadReviewPageData } from '@/lib/services/review/application-service';

function describeType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function ReviewPage() {
  const { summary, dueQuestions } = await loadReviewPageData();

  const statCards = [
    { label: 'Due now', value: String(summary.dueCount) },
    { label: 'Tracked', value: String(summary.totalTracked) },
    { label: 'Mastered', value: String(summary.masteredCount) },
  ];

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link className="breadcrumb-link" href="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <Link className="breadcrumb-link" href="/curriculum">Curriculum</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Review</span>
      </nav>

      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">Spaced review</p>
          <h1>Lock in the questions you missed.</h1>
          <p className="hero-copy">
            Every Reading miss is tracked here and resurfaces on a spaced schedule. Answer each due item from memory —
            correct answers move further out, misses come back soon.
          </p>
          <div className="module-stat-grid review-stat-grid">
            {statCards.map((card) => (
              <div className="module-stat-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
          {summary.weakestType && summary.weakestType.due > 0 ? (
            <p className="summary-copy">
              Most due right now: <strong>{describeType(summary.weakestType.type)}</strong> ({summary.weakestType.due} item
              {summary.weakestType.due === 1 ? '' : 's'}).
            </p>
          ) : null}
        </div>
      </section>

      <section className="workspace-column review-session-section">
        <ReviewPracticeShell questions={dueQuestions} />
      </section>
    </main>
  );
}
