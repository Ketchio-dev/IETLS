import Link from 'next/link';

import { DashboardMetricGrid } from '@/components/dashboard';
import type { PlaceholderAssessmentDashboardPageData } from '@/lib/services/assessment-placeholders/application-service';

export function AssessmentPlaceholderDashboard({
  moduleLabel,
  statusLabel,
  summary,
  dashboardTitle,
  dashboardDescription,
  routeBase,
  statusCards,
  nextSteps,
}: PlaceholderAssessmentDashboardPageData) {
  return (
    <main className="app-shell">
      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">{moduleLabel}</p>
          <h1>{dashboardTitle}</h1>
          <p className="hero-copy">{dashboardDescription}</p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href={routeBase}>
              Return to module overview
            </Link>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <div className="metric-card">
            <span>Summary</span>
            <strong>Placeholder only</strong>
          </div>
          <div className="metric-card">
            <span>Risk</span>
            <strong>No fake readiness</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <DashboardMetricGrid
            title="Module status snapshot"
            description={summary}
            metrics={statusCards.map((card, index) => ({
              id: `${card.label.toLowerCase()}-${index}`,
              label: card.label,
              value: card.value,
              detail: card.detail,
              eyebrow: 'Placeholder',
            }))}
          />
        </div>

        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Next steps</p>
                <h2>Implementation guardrails</h2>
              </div>
            </div>
            <p className="summary-copy">{dashboardDescription}</p>
            <ul className="plain-list compact-list">
              {nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
