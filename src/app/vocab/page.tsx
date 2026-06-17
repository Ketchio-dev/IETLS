import Link from 'next/link';

import { VocabPracticeShell } from '@/components/vocab/vocab-practice-shell';
import { loadVocabPageData } from '@/lib/services/vocab/application-service';

export default async function VocabPage() {
  const { summary, dueCards } = await loadVocabPageData();

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
        <span className="breadcrumb-current">Vocabulary</span>
      </nav>

      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">Academic vocabulary</p>
          <h1>Lock in high-frequency IELTS words.</h1>
          <p className="hero-copy">
            Recall each word&apos;s meaning from memory. Correct answers space out and misses come back soon — the same
            spaced-repetition engine that powers your reading reviews, so it all counts toward one streak.
          </p>
          <div className="module-stat-grid review-stat-grid">
            {statCards.map((card) => (
              <div className="module-stat-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link-button" href="/review">
              Reading reviews
            </Link>
          </div>
        </div>
      </section>

      <section className="workspace-column review-session-section">
        <VocabPracticeShell cards={dueCards} />
      </section>
    </main>
  );
}
