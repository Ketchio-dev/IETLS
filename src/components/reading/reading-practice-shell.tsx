'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { ImportedReadingSet } from '@/lib/services/reading-imports/types';
import type {
  ReadingAssessmentReport,
  ReadingAttemptSnapshot,
  ReadingPracticePageData,
} from '@/lib/services/reading/types';

import { ReadingAssessmentReportPanel } from './reading-assessment-report';

function formatQuestionType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildResumeHref(attempt: ReadingAttemptSnapshot) {
  return `/reading?setId=${encodeURIComponent(attempt.setId)}&attemptId=${encodeURIComponent(attempt.attemptId)}`;
}

function splitPassage(passage: string) {
  return passage
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function findSet(importedSets: ImportedReadingSet[], activeSet: ImportedReadingSet | null, setId: string) {
  if (activeSet && activeSet.id === setId) {
    return activeSet;
  }

  return importedSets.find((set) => set.id === setId) ?? activeSet;
}

function RecentAttemptsPanel({
  attempts,
  activeAttemptId,
  onInspect,
}: {
  attempts: ReadingAttemptSnapshot[];
  activeAttemptId: string | null;
  onInspect: (attempt: ReadingAttemptSnapshot) => void;
}) {
  return (
    <article className="panel history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent attempts</p>
          <h2>Review saved drills</h2>
        </div>
      </div>
      {attempts.length > 0 ? (
        <div className="history-list">
          {attempts.map((attempt) => (
            <article className={`history-card${attempt.attemptId === activeAttemptId ? ' is-active' : ''}`} key={attempt.attemptId}>
              <div className="history-card-header">
                <strong>{attempt.setTitle}</strong>
                <span>{attempt.report.scoreLabel}</span>
              </div>
              <p>{attempt.report.summary}</p>
              <div className="history-meta">
                <span>{attempt.report.percentage}% accuracy</span>
                <span>{attempt.timeSpentSeconds}s</span>
                <span>{attempt.createdAt}</span>
              </div>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => onInspect(attempt)} type="button">
                  Inspect attempt
                </button>
                <Link className="secondary-link-button" href={buildResumeHref(attempt)}>
                  Resume via URL
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="summary-copy">No saved reading attempts yet.</p>
      )}
    </article>
  );
}

export function ReadingPracticeShell({
  importedSets,
  activeSet,
  importSummary,
  summary,
  initialReport,
  initialAnswers,
  initialTimeSpentSeconds,
  savedAttempts: initialSavedAttempts,
  initialSetId,
  initialAttemptId,
}: ReadingPracticePageData) {
  const [selectedSetId, setSelectedSetId] = useState(initialSetId ?? activeSet?.id ?? '');
  const [savedAttempts, setSavedAttempts] = useState(initialSavedAttempts);
  const [activeAttemptId, setActiveAttemptId] = useState(initialAttemptId);
  const [report, setReport] = useState<ReadingAssessmentReport | null>(initialReport);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [secondsElapsed, setSecondsElapsed] = useState(initialTimeSpentSeconds);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSet = useMemo(
    () => (selectedSetId ? findSet(importedSets, activeSet, selectedSetId) : activeSet),
    [activeSet, importedSets, selectedSetId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsElapsed((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const matchingAttempt = savedAttempts.find((attempt) => attempt.attemptId === activeAttemptId);
    if (matchingAttempt) {
      setAnswers(matchingAttempt.answers);
      setReport(matchingAttempt.report);
      setSelectedSetId(matchingAttempt.setId);
    }
  }, [activeAttemptId, savedAttempts]);

  function handleInspectAttempt(attempt: ReadingAttemptSnapshot) {
    setActiveAttemptId(attempt.attemptId);
    setSelectedSetId(attempt.setId);
    setAnswers(attempt.answers);
    setReport(attempt.report);
    setSecondsElapsed(attempt.timeSpentSeconds);
    setError(null);
  }

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!selectedSet) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reading/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: selectedSet.id,
          answers,
          timeSpentSeconds: secondsElapsed,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        report?: ReadingAssessmentReport;
        attempt?: ReadingAttemptSnapshot;
        savedAttempts?: ReadingAttemptSnapshot[];
      };

      if (!response.ok || !payload.report || !payload.attempt || !payload.savedAttempts) {
        throw new Error(payload.error ?? 'Unable to score the reading drill.');
      }

      setReport(payload.report);
      setSavedAttempts(payload.savedAttempts);
      setActiveAttemptId(payload.attempt.attemptId);
      setAnswers(payload.attempt.answers);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unexpected reading submission error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selectedSet) {
    return (
      <main className="app-shell">
        <section className="hero panel">
          <div>
            <p className="eyebrow">IELTS Academic Reading</p>
            <h1>Passage-centred reading drill import required</h1>
            <p className="hero-copy">{summary}</p>
            <div className="hero-actions">
              <Link className="secondary-link-button" href="/reading/dashboard">
                Open reading dashboard
              </Link>
            </div>
          </div>
        </section>
        <article className="panel history-panel">
          <p className="summary-copy">
            Run <code>{importSummary.importCommand}</code> after adding JSON files under <code>{importSummary.sourceDir}</code>.
          </p>
        </article>
      </main>
    );
  }

  const selectedSetSummary = selectedSetId
    ? importSummary.sets.find((set) => set.id === selectedSetId) ?? null
    : null;
  const supportedTypes = selectedSetSummary?.types ?? Array.from(new Set(selectedSet.questions.map((question) => question.type)));

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">IELTS Academic Reading</p>
          <h1>Passage-centred reading drill</h1>
          <p className="hero-copy">
            {selectedSet.title} · {selectedSet.sourceLabel} · {selectedSet.questions.length} questions
          </p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href="/reading/dashboard">
              Open reading dashboard
            </Link>
            <p className="hero-action-copy">Deterministic scoring only — no official band claim.</p>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Question count</span>
            <strong>{selectedSet.questions.length}</strong>
          </div>
          <div className="metric-card">
            <span>Elapsed</span>
            <strong>{secondsElapsed}s</strong>
          </div>
          <div className="metric-card">
            <span>Supported types</span>
            <strong>{supportedTypes.length}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Drill controls</p>
                <h2>Passage and answer sheet</h2>
              </div>
            </div>
            <label className="stack-sm" htmlFor="reading-set-select">
              <span className="summary-copy">Imported drill set</span>
              <select
                id="reading-set-select"
                value={selectedSetId}
                onChange={(event) => {
                  const nextSetId = event.target.value;
                  setSelectedSetId(nextSetId);
                  setActiveAttemptId(null);
                  setAnswers({});
                  setReport(null);
                  if (nextSetId !== selectedSet.id) {
                    window.location.href = `/reading?setId=${encodeURIComponent(nextSetId)}`;
                  }
                }}
              >
                {importedSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="stack-sm" style={{ marginTop: '1rem' }}>
              <h3 className="subsection-title">Passage</h3>
              {splitPassage(selectedSet.passage).map((paragraph, index) => (
                <p className="summary-copy" key={`${selectedSet.id}-paragraph-${index}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          <article className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Questions</p>
                <h2>Complete the reading drill</h2>
              </div>
            </div>
            <div className="history-list">
              {selectedSet.questions.map((question, index) => (
                <article className="history-card" key={question.id}>
                  <div className="history-card-header">
                    <strong>
                      Q{index + 1}. {question.prompt}
                    </strong>
                    <span>{formatQuestionType(question.type)}</span>
                  </div>
                  {question.type === 'sentence_completion' ? (
                    <input
                      aria-label={question.prompt}
                      className="text-input"
                      value={answers[question.id] ?? ''}
                      onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                      placeholder="Type your answer"
                    />
                  ) : (
                    <div className="stack-sm">
                      {(question.type === 'true_false_not_given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : question.options).map((option) => (
                        <label className="summary-copy" key={`${question.id}-${option}`}>
                          <input
                            checked={(answers[question.id] ?? '') === option}
                            name={question.id}
                            onChange={() => handleAnswerChange(question.id, option)}
                            type="radio"
                            value={option}
                          />{' '}
                          {option}
                        </label>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="hero-actions" style={{ marginTop: '1rem' }}>
              <button className="primary-button" disabled={isSubmitting} onClick={handleSubmit} type="button">
                {isSubmitting ? 'Scoring…' : 'Submit reading drill'}
              </button>
              {error ? <p className="summary-copy">{error}</p> : null}
            </div>
          </article>
        </div>

        <div className="workspace-column right-column">
          {report ? <ReadingAssessmentReportPanel report={report} /> : null}
          <RecentAttemptsPanel attempts={savedAttempts.slice(0, 6)} activeAttemptId={activeAttemptId} onInspect={handleInspectAttempt} />
        </div>
      </section>
    </main>
  );
}
