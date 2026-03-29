import Link from 'next/link';

import type { AssessmentReport } from '@/lib/domain';

const impactStyles = {
  high: 'var(--impact-high)',
  medium: 'var(--impact-medium)',
  low: 'var(--impact-low)',
} as const;

type OverallEstimateMode = 'calibrated' | 'direct' | 'direct-provider-output';

function formatProvider(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOverallEstimateMode(notes: string[]): OverallEstimateMode {
  if (notes.some((note) => /applied .*overall-band calibration/i.test(note))) {
    return 'calibrated';
  }

  if (notes.some((note) => /overall-band calibration was explicitly disabled/i.test(note))) {
    return 'direct-provider-output';
  }

  return 'direct';
}

function getOverallEstimateCopy(mode: OverallEstimateMode) {
  switch (mode) {
    case 'calibrated':
      return {
        eyebrow: 'Assessment report',
        status: 'Overall band estimate',
        description:
          'The overall band has been adjusted using published scoring benchmarks. The criterion scores below come directly from the AI scorer.',
      };
    case 'direct-provider-output':
      return {
        eyebrow: 'Assessment report',
        status: 'Unadjusted estimate',
        description:
          'This run skipped the benchmark adjustment, so the overall band stays closer to the raw AI estimate.',
      };
    default:
      return {
        eyebrow: 'Assessment report',
        status: 'AI scorer result',
        description:
          'The overall and criterion bands shown here come directly from the active AI scorer.',
      };
  }
}

function getTrustHeading(confidence: AssessmentReport['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Reliable estimate';
    case 'medium':
      return 'Estimate may shift';
    default:
      return 'Rough estimate';
  }
}

function getConfidenceReasonsHeading(confidence: AssessmentReport['confidence']) {
  switch (confidence) {
    case 'high':
      return 'Why this estimate is reliable';
    case 'medium':
      return 'Why this estimate may shift';
    default:
      return 'Why this estimate is rough';
  }
}

function getBandRangeContext(range: AssessmentReport['overallBandRange']) {
  const width = Number((range.upper - range.lower).toFixed(1));
  return width <= 0.5
    ? 'A ±0.5 range is typical. This range is relatively tight, so focus on the highest-priority revision below rather than chasing tiny band swings.'
    : 'A ±0.5 range is typical. This wider range means the scorer found mixed signals, so focus on the highest-priority revision below before you compare numbers again.';
}

function getImpactLabel(impact: AssessmentReport['nextSteps'][number]['impact']) {
  switch (impact) {
    case 'high':
      return 'high impact — likely affects overall band';
    case 'medium':
      return 'medium impact — strengthens one criterion';
    default:
      return 'low impact — useful after the main fix';
  }
}

export function AssessmentReportPanel({ report }: { report: AssessmentReport }) {
  const trace = report.evaluationTrace;
  const overallRange = `Band ${report.overallBandRange.lower.toFixed(1)}-${report.overallBandRange.upper.toFixed(1)}`;
  const fallbackStatus = trace.usedMockFallback ? 'Backup scoring engine used' : 'Standard scoring engine used';
  const configuredProvider = trace.configuredProvider ? formatProvider(trace.configuredProvider) : 'Not configured';
  const overallEstimate = getOverallEstimateCopy(getOverallEstimateMode(trace.notes));
  const strongestSignal = report.strengths[0] ?? report.evidence.find((item) => item.strength === 'strong')?.detail;
  const biggestRisk = report.risks[0] ?? report.evidence.find((item) => item.strength !== 'strong')?.detail;
  const firstRevisionTarget = report.nextSteps[0];
  const confidenceSummary =
    report.confidence === 'high'
      ? 'Use the band as a solid practice checkpoint, then keep the same strength stable in the next draft.'
      : report.confidence === 'medium'
        ? 'Use this to choose the next revision target, then compare the next draft instead of over-reading the exact number today.'
        : 'The scorer found conflicting signals in this draft. Treat the band as direction-of-travel only, fix the highest-priority revision first, and re-score before you switch prompts.';

  return (
    <section className="panel report-panel" aria-labelledby="report-title">
      <div className="report-header">
        <div>
          <p className="eyebrow">{overallEstimate.eyebrow}</p>
          <h2 id="report-title">Estimated IELTS band</h2>
          <p className="summary-copy">Based on rubric signals and saved practice history.</p>
          <p className="summary-copy">{getBandRangeContext(report.overallBandRange)}</p>
        </div>
        <div className="band-chip">Band {report.overallBand.toFixed(1)} · {overallRange}</div>
      </div>

      <aside className="report-note" role="note">
        Practice estimate — not an official IELTS score. Use it to guide study, not to predict your result.
      </aside>

      <p className="summary-copy">{report.summary}</p>

      <div className="report-grid">
        <article className="score-card">
          <div className="score-card-header">
            <h3>Your strongest area</h3>
            <span>Keep it</span>
          </div>
          <p>{strongestSignal ?? 'Finish a scored draft to unlock a clearer strength summary.'}</p>
        </article>
        <article className="score-card">
          <div className="score-card-header">
            <h3>What held your score back</h3>
            <span>Fix it</span>
          </div>
          <p>{biggestRisk ?? 'The report will highlight the biggest risk once a weaker signal appears.'}</p>
        </article>
        <article className="score-card">
          <div className="score-card-header">
            <h3>Highest-priority revision</h3>
            <span>Next move</span>
          </div>
          <p>{firstRevisionTarget ? `${firstRevisionTarget.title}: ${firstRevisionTarget.description}` : 'Score one full draft to unlock the first revision target.'}</p>
        </article>
      </div>

      <p className="summary-copy">
        <strong>{getTrustHeading(report.confidence)}.</strong> This is an AI-assisted practice estimate, not an official IELTS result. Start with the revision target above, not the exact band number.
      </p>
      <p className="summary-copy">{confidenceSummary}</p>

      <div className="report-columns secondary-columns">
        <div>
          <h3>{getConfidenceReasonsHeading(report.confidence)}</h3>
          <ul className="plain-list compact-list">
            {report.confidenceReasons.map((reason, index) => (
              <li key={`confidence-reason-${index}`}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      <details className="report-technical-details">
        <summary>Advanced details</summary>
        <div className="stack-sm">
          <h3>How this score was produced</h3>
          <ul className="plain-list compact-list">
            {trace.notes.map((note, index) => (
              <li key={`note-${index}`}>{note}</li>
            ))}
          </ul>
        </div>
        <ul className="plain-list compact-list">
          <li>Overall estimate mode: {overallEstimate.status}</li>
          <li>{overallEstimate.description}</li>
          <li>Score source: {formatProvider(trace.scorerProvider)}</li>
          <li>Configured scorer: {configuredProvider}</li>
          <li>Model: {trace.scorerModel}</li>
          <li>Fallback status: {fallbackStatus}</li>
          <li>Signals used: {trace.evidenceSignalCount}</li>
          <li>Rubric version: {trace.rubricVersion}</li>
          <li>Calibration version: {trace.calibrationVersion}</li>
        </ul>
      </details>

      <div className="report-grid secondary-columns">
        {report.criterionScores.map((item, index) => (
          <article className="score-card" key={`${item.criterion}-${index}`}>
            <div className="score-card-header">
              <h3>{item.criterion}</h3>
              <span>
                Band {item.bandRange.lower.toFixed(1)}-{item.bandRange.upper.toFixed(1)}
              </span>
            </div>
            <p>{item.rationale}</p>
          </article>
        ))}
      </div>

      <div className="report-columns">
        <div>
          <h3>Evidence</h3>
          <ul className="plain-list">
            {report.evidence.map((item, index) => (
              <li key={`${item.id}-${index}`}>
                <strong>{item.label}:</strong> {item.detail}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Next steps</h3>
          <ul className="plain-list">
            {report.nextSteps.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                <strong>{item.title}</strong>
                <span className="impact-pill" style={{ backgroundColor: impactStyles[item.impact] }}>
                  {getImpactLabel(item.impact)}
                </span>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="report-columns secondary-columns">
        <div>
          <h3>Warnings</h3>
          <ul className="plain-list compact-list">
            {report.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="report-link-row">
        <Link className="secondary-link-button" href="/reading">
          Continue to Reading practice
        </Link>
      </div>

      <div className="report-footer">
        <span>Report version: {report.pipelineVersion}</span>
        <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
      </div>
    </section>
  );
}
