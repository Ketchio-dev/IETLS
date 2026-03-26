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
          <p className="eyebrow">Practice estimate</p>
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
            <small className="confidence-caption">Criterion confidence: {item.confidence}</small>
          </article>
        ))}
      </div>

      <div className="report-columns">
        <div>
          <h3>Evidence</h3>
          <ul className="plain-list">
            {report.evidence.map((item) => (
              <li key={item.id}>
                <strong>{item.label}:</strong> {item.detail}
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

      <div className="report-columns secondary-columns">
        <div>
          <h3>Confidence reasons</h3>
          <ul className="plain-list compact-list">
            {report.confidenceReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Warnings</h3>
          <ul className="plain-list compact-list">
            {report.warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="report-footer">
        <span>Pipeline: {report.pipelineVersion}</span>
        <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
      </div>
    </section>
  );
}
