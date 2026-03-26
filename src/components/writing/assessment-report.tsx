import type { AssessmentReport } from '@/lib/domain';

const impactStyles = {
  high: 'var(--impact-high)',
  medium: 'var(--impact-medium)',
  low: 'var(--impact-low)',
} as const;

export function AssessmentReportPanel({ report }: { report: AssessmentReport }) {
  return (
    <section className="panel report-panel" aria-labelledby="report-title">
      <div className="report-header">
        <div>
          <p className="eyebrow">Mock assessment report</p>
          <h2 id="report-title">Band {report.overallBand.toFixed(1)} predicted</h2>
        </div>
        <div className="band-chip">Confidence: {report.confidence}</div>
      </div>

      <p className="summary-copy">{report.summary}</p>

      <div className="report-grid">
        {report.criterionScores.map((item) => (
          <article className="score-card" key={item.criterion}>
            <div className="score-card-header">
              <h3>{item.criterion}</h3>
              <span>Band {item.band.toFixed(1)}</span>
            </div>
            <p>{item.rationale}</p>
          </article>
        ))}
      </div>

      <div className="report-columns">
        <div>
          <h3>Evidence</h3>
          <ul className="plain-list">
            {report.evidence.map((item) => (
              <li key={item.name}>
                <strong>{item.name}:</strong> {item.detail}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Next steps</h3>
          <ul className="plain-list">
            {report.nextSteps.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span className="impact-pill" style={{ backgroundColor: impactStyles[item.impact] }}>
                  {item.impact} impact
                </span>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
