'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AssessmentReport, RecentAttemptSummary, WritingPrompt } from '@/lib/domain';
import { sampleResponse } from '@/lib/fixtures/writing';

import { AssessmentReportPanel } from './assessment-report';

interface Props {
  prompt: WritingPrompt;
  initialReport: AssessmentReport;
  initialHistory: RecentAttemptSummary[];
}

export function WritingPracticeShell({ prompt, initialHistory, initialReport }: Props) {
  const [response, setResponse] = useState(sampleResponse);
  const [secondsRemaining, setSecondsRemaining] = useState(prompt.recommendedMinutes * 60);
  const [report, setReport] = useState(initialReport);
  const [recentAttempts, setRecentAttempts] = useState(initialHistory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const wordCount = useMemo(() => response.trim().split(/\s+/).filter(Boolean).length, [response]);
  const timeSpentMinutes = prompt.recommendedMinutes - secondsRemaining / 60;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const nextReportResponse = await fetch('/api/writing/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          response,
          timeSpentMinutes,
        }),
      });

      const payload = (await nextReportResponse.json()) as {
        error?: string;
        report?: AssessmentReport;
        recentAttempts?: RecentAttemptSummary[];
      };

      if (!nextReportResponse.ok || !payload.report) {
        throw new Error(payload.error ?? 'Unable to generate report');
      }

      setReport(payload.report);
      setRecentAttempts(payload.recentAttempts ?? initialHistory);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Unexpected submission error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const formattedClock = `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(
    secondsRemaining % 60,
  ).padStart(2, '0')}`;

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">IELTS Academic • Writing Task 2</p>
          <h1>Writing-first coach with a persistent assessment trail</h1>
          <p className="hero-copy">
            Practice under time pressure, review a structured score estimate, and keep a reusable
            history of your latest mock attempts.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Time left</span>
            <strong>{formattedClock}</strong>
          </div>
          <div className="metric-card">
            <span>Word count</span>
            <strong>{wordCount}</strong>
          </div>
          <div className="metric-card">
            <span>Pipeline</span>
            <strong>Evidence → Score → Feedback</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <p className="eyebrow">Live prompt</p>
            <h2>{prompt.title}</h2>
            <p className="prompt-copy">{prompt.prompt}</p>
            <div className="tip-grid">
              <div>
                <h3>Planning hints</h3>
                <ul>
                  {prompt.planningHints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Rubric focus</h3>
                <ul>
                  {prompt.rubricFocus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="editor-header">
              <div>
                <p className="eyebrow">Timed editor</p>
                <h2>Draft response</h2>
              </div>
              <button
                className="primary-button"
                disabled={isSubmitting || response.trim().length < 50}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? 'Assessing…' : 'Generate practice estimate'}
              </button>
            </div>
            <textarea
              aria-label="Essay response"
              className="essay-textarea"
              onChange={(event) => setResponse(event.target.value)}
              value={response}
            />
            <div className="editor-footer">
              <span>
                {wordCount} / {prompt.suggestedWordCount}+ words
              </span>
              <span>{timeSpentMinutes.toFixed(1)} min spent</span>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </article>
        </div>

        <div className="workspace-column right-column">
          <AssessmentReportPanel report={report} />

          <section className="panel service-panel">
            <p className="eyebrow">Assessment architecture</p>
            <h2>What this MVP is doing under the hood</h2>
            <div className="service-list">
              <article>
                <h3>Evidence extraction</h3>
                <p>Pulls word-count, structure, position, support, and topic-coverage signals from the draft.</p>
              </article>
              <article>
                <h3>Scoring model</h3>
                <p>Maps evidence to criterion-level band estimates with confidence notes and scoring warnings.</p>
              </article>
              <article>
                <h3>Feedback generator</h3>
                <p>Turns weak signals into revision actions you can use in the next timed attempt.</p>
              </article>
            </div>
          </section>

          <section className="panel history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent attempts</p>
                <h2>Persistent practice history</h2>
              </div>
              <span className="band-chip">{recentAttempts.length} saved</span>
            </div>
            {recentAttempts.length === 0 ? (
              <p className="summary-copy">Submit your first draft to start building a reusable score history.</p>
            ) : (
              <div className="history-list">
                {recentAttempts.map((attempt) => (
                  <article key={attempt.submissionId} className="history-card">
                    <div className="history-card-header">
                      <strong>Band {attempt.overallBand.toFixed(1)}</strong>
                      <span>{attempt.confidence} confidence</span>
                    </div>
                    <p>{attempt.summary}</p>
                    <div className="history-meta">
                      <span>{attempt.estimatedWordCount} words</span>
                      <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
