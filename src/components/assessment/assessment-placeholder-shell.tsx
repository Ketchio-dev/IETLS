import Link from 'next/link';

import type { PlaceholderAssessmentPracticePageData } from '@/lib/services/assessment-placeholders/application-service';

function PrivateImportPanel({
  summary,
}: {
  summary: NonNullable<PlaceholderAssessmentPracticePageData['privateImportSummary']>;
}) {
  return (
    <article className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Private import pipeline</p>
          <h2>Local reading bank status</h2>
        </div>
      </div>

      <div className="metric-grid compact-metric-grid">
        <div className="metric-card">
          <span>Imported sets</span>
          <strong>{summary.importedSetCount}</strong>
        </div>
        <div className="metric-card">
          <span>Detected source files</span>
          <strong>{summary.detectedSourceFiles.length}</strong>
        </div>
        <div className="metric-card">
          <span>Command</span>
          <strong>{summary.importCommand}</strong>
        </div>
      </div>

      <div className="stack-sm">
        <p className="summary-copy">
          Source folder: <code>{summary.sourceDir}</code>
        </p>
        <p className="summary-copy">
          Compiled output: <code>{summary.compiledOutputLabel}</code>
        </p>
        <p className="summary-copy">
          Latest import: <code>{summary.latestImportedAt ?? 'Not compiled yet'}</code>
        </p>
      </div>

      {summary.warnings.length > 0 ? (
        <ul className="plain-list compact-list import-warning-list">
          {summary.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {summary.sets.length > 0 ? (
        <div className="stack-sm">
          <h3 className="subsection-title">Imported set preview</h3>
          <ul className="plain-list compact-list">
            {summary.sets.map((set) => (
              <li key={set.id}>
                <strong>{set.title}</strong> — {set.questionCount} questions, {set.passageWordCount} words, {set.types.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function AssessmentPlaceholderShell({
  moduleLabel,
  statusLabel,
  summary,
  practiceTitle,
  practiceDescription,
  routeBase,
  plannedMilestones,
  currentGuardrails,
  privateImportSummary,
}: PlaceholderAssessmentPracticePageData) {
  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">{moduleLabel}</p>
          <h1>{practiceTitle}</h1>
          <p className="hero-copy">{practiceDescription}</p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href={`${routeBase}/dashboard`}>
              Open module dashboard
            </Link>
            <p className="hero-action-copy">This module is registered so the platform can grow without changing the shared seam again.</p>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <div className="metric-card">
            <span>Scope</span>
            <strong>Structural proof</strong>
          </div>
          <div className="metric-card">
            <span>Guarantee</span>
            <strong>No fake scoring</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Current status</p>
                <h2>Why this page exists</h2>
              </div>
            </div>
            <p className="summary-copy">{summary}</p>
            <ul className="plain-list compact-list">
              {currentGuardrails.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          {privateImportSummary ? <PrivateImportPanel summary={privateImportSummary} /> : null}
        </div>
        <div className="workspace-column right-column">
          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Planned milestones</p>
                <h2>What comes next</h2>
              </div>
            </div>
            <ul className="plain-list compact-list">
              {plannedMilestones.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
