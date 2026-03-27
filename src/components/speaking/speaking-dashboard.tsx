import Link from 'next/link';

import { DashboardMetricGrid } from '@/components/dashboard';
import { formatDateTime } from '@/components/dashboard/dashboard-formatting';
import type { SpeakingDashboardPageData, SpeakingPart } from '@/lib/services/speaking/types';

function formatPart(part: SpeakingPart) {
  return part.replace('-', ' ').toUpperCase();
}

function formatBandRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

export function SpeakingDashboard({ prompts = [], recentSessions, summary, studyFocus }: SpeakingDashboardPageData) {
  const metrics = [
    {
      id: 'total-sessions',
      label: 'Total sessions',
      value: String(summary.totalSessions),
      detail: 'Persisted in the local transcript-first alpha store.',
      eyebrow: 'Coverage',
    },
    {
      id: 'average-band',
      label: 'Average band',
      value: summary.averageBand?.toFixed(1) ?? '—',
      detail: summary.latestRange
        ? `Latest: ${formatBandRange(summary.latestRange.lower, summary.latestRange.upper)}`
        : 'No scored sessions yet.',
      eyebrow: 'Consistency',
    },
    {
      id: 'average-duration',
      label: 'Average duration',
      value: `${summary.averageDurationSeconds}s`,
      detail: `Low-confidence sessions: ${summary.lowConfidenceCount}`,
      eyebrow: 'Timing',
    },
    {
      id: 'audio-sessions',
      label: 'Audio-backed sessions',
      value: String(summary.sessionsWithAudio),
      detail: 'Metadata only for now; raw audio and pronunciation features are not persisted yet.',
      eyebrow: 'STT readiness',
    },
    {
      id: 'latest-attempt',
      label: 'Latest session',
      value: summary.latestAttemptAt ? formatDateTime(summary.latestAttemptAt) : '—',
      detail: `Best band so far: ${summary.bestBand?.toFixed(1) ?? '—'}`,
      eyebrow: 'Recency',
    },
  ];

  return (
    <main className="app-shell">
      <section className="hero panel dashboard-hero">
        <div>
          <p className="eyebrow">IELTS Academic • Speaking dashboard</p>
          <h1>Track part coverage, confidence, and transcript-first audio readiness</h1>
          <p className="hero-copy">
            Use this alpha dashboard to see how often you practise each speaking part and whether your
            recent sessions are ready for a future STT or audio-analysis pass, while remembering that pronunciation remains provisional.
          </p>
          <div className="dashboard-actions">
            <Link className="primary-button dashboard-link-button" href="/speaking">
              Return to speaking practice
            </Link>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Part 1</span>
            <strong>{summary.partBreakdown['part-1']}</strong>
          </div>
          <div className="metric-card">
            <span>Part 2</span>
            <strong>{summary.partBreakdown['part-2']}</strong>
          </div>
          <div className="metric-card">
            <span>Part 3</span>
            <strong>{summary.partBreakdown['part-3']}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid dashboard-grid">
        <div className="workspace-column left-column">
          <DashboardMetricGrid
            title="Speaking alpha metrics"
            description="A lightweight summary of your local speaking sessions so far."
            metrics={metrics}
            aside={<span className="band-chip">{recentSessions.length} recent sessions</span>}
          />

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Study focus</p>
                <h2>Next local speaking moves</h2>
              </div>
            </div>
            <ul className="plain-list">
              {studyFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent sessions</p>
                <h2>Latest practice snapshots</h2>
              </div>
            </div>
            <div className="history-list">
              {recentSessions.map((session) => {
                const promptTitle = prompts.find((item) => item.id === session.promptId)?.title ?? session.promptId;

                return (
                  <article className="history-card" key={session.sessionId}>
                    <div className="history-card-header">
                      <strong>{promptTitle}</strong>
                      <span>{formatPart(session.part)}</span>
                    </div>
                    <p>{session.report.summary}</p>
                    <div className="history-meta">
                      <span>{formatBandRange(session.report.overallBandRange.lower, session.report.overallBandRange.upper)}</span>
                      <span>{session.report.confidence} confidence</span>
                    </div>
                    <div className="history-meta">
                      <span>{session.transcriptWordCount} words</span>
                      <span>{session.durationSeconds}s</span>
                      <span>{session.audioArtifact.status === 'attached' ? 'audio attached' : 'no audio metadata'}</span>
                      <span>{new Date(session.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="hero-actions">
                      <Link
                        className="secondary-link-button"
                        href={`/speaking?promptId=${encodeURIComponent(session.promptId)}&sessionId=${encodeURIComponent(session.sessionId)}`}
                      >
                        Resume in practice shell
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
