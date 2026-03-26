import type { SpeakingAssessmentReport, SpeakingAudioArtifact, SpeakingPrompt } from '@/lib/services/speaking/types';

interface Props {
  report: SpeakingAssessmentReport;
  prompt: SpeakingPrompt;
  transcriptSource: 'seed' | 'manual';
  audioArtifact: SpeakingAudioArtifact;
}

function formatRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) {
    return 'Size unavailable';
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function SpeakingAssessmentReportPanel({ report, prompt, transcriptSource, audioArtifact }: Props) {
  return (
    <article className="panel report-panel">
      <div className="report-header">
        <div>
          <p className="eyebrow">Speaking alpha report</p>
          <h2>{prompt.title}</h2>
        </div>
        <span className="band-chip">{formatRange(report.overallBandRange.lower, report.overallBandRange.upper)}</span>
      </div>

      <p className="summary-copy">{report.summary}</p>

      <div className="report-grid">
        {report.criterionScores.map((criterion) => (
          <article className="score-card" key={criterion.criterion}>
            <div className="score-card-header">
              <strong>{criterion.criterion}</strong>
              <span>{criterion.band.toFixed(1)}</span>
            </div>
            <p>{criterion.rationale}</p>
            <div className="report-footer">
              <span>{criterion.confidence} confidence</span>
              <span>{formatRange(criterion.bandRange.lower, criterion.bandRange.upper)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="report-columns">
        <section className="panel">
          <p className="eyebrow">Strengths</p>
          <ul className="plain-list compact-list">
            {report.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <p className="eyebrow">Next steps</p>
          <ul className="plain-list compact-list">
            {report.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <p className="eyebrow">Evidence intake</p>
        <div className="history-meta">
          <span>Transcript source: {transcriptSource}</span>
          <span>{report.evidenceMode === 'transcript-plus-audio-metadata' ? 'Audio metadata attached' : 'Transcript only'}</span>
        </div>
        {audioArtifact.status === 'attached' ? (
          <div className="history-meta" style={{ marginTop: '0.5rem' }}>
            <span>{audioArtifact.fileName}</span>
            <span>{audioArtifact.mimeType}</span>
            <span>{formatFileSize(audioArtifact.sizeBytes)}</span>
            <span>{audioArtifact.durationSeconds ? `${audioArtifact.durationSeconds}s measured` : 'Duration pending'}</span>
          </div>
        ) : null}
      </section>

      <div className="report-footer">
        <span>{report.providerLabel}</span>
        <span>{report.scorerModel}</span>
        <span>{report.confidence} confidence</span>
      </div>
    </article>
  );
}
