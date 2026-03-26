import type { ReactNode } from 'react';

import { formatCountLabel } from './dashboard-formatting';
import type { DashboardMetricCard } from './dashboard-types';

interface Props {
  title?: string;
  description?: string;
  metrics: DashboardMetricCard[];
  aside?: ReactNode;
}

export function DashboardMetricGrid({
  title = 'Dashboard snapshot',
  description = 'A quick reading of the learner\'s current writing position.',
  metrics,
  aside,
}: Props) {
  return (
    <section className="panel" aria-label="Dashboard metrics">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Performance snapshot</p>
          <h2>{title}</h2>
          <p className="summary-copy">{description}</p>
        </div>
        <div>
          <span className="band-chip">{formatCountLabel(metrics.length, 'metric')}</span>
          {aside ? <div style={{ marginTop: '0.75rem' }}>{aside}</div> : null}
        </div>
      </div>

      <div className="hero-metrics">
        {metrics.map((metric) => (
          <article key={metric.id} className="metric-card">
            <span>{metric.eyebrow ?? metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.badge ? <span className="band-chip">{metric.badge}</span> : null}
            <p className="summary-copy" style={{ marginTop: '0.75rem' }}>
              {metric.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
