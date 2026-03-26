'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AssessmentReport, WritingPrompt } from '@/lib/domain';
import { sampleResponse } from '@/lib/fixtures/writing';

import { AssessmentReportPanel } from './assessment-report';

interface Props {
  prompt: WritingPrompt;
  initialReport: AssessmentReport;
}

export function WritingPracticeShell({ prompt, initialReport }: Props) {
  const [response, setResponse] = useState(sampleResponse);
  const [secondsRemaining, setSecondsRemaining] = useState(prompt.recommendedMinutes * 60);
  const [report, setReport] = useState(initialReport);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const wordCount = useMemo(
    () => response.trim().split(/\s+/).filter(Boolean).length,
    [response],
  );
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

      if (!nextReportResponse.ok) {
        const payload = (await nextReportResponse.json()) as { error?: string };
        throw new Error(payload.error ?? 'Unable to generate report');
      }

      const payload = (await nextReportResponse.json()) as { report: AssessmentReport };
      setReport(payload.report);
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
          <h1>Writing-first practice MVP</h1>
          <p className="hero-copy">
            Simulate a timed session, draft your essay, and preview a scaffolded assessment report
            tuned for score prediction, evidence extraction, and coaching follow-up.
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
            <span>Target band</span>
            <strong>6.5+</strong>
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
                {isSubmitting ? 'Assessing…' : 'Generate mock report'}
              </button>
            </div>
            <textarea
              aria-label="Essay response"
              className="essay-textarea"
              onChange={(event) => setResponse(event.target.value)}
              value={response}
            />
            <div className="editor-footer">
              <span>{wordCount} / {prompt.suggestedWordCount}+ words</span>
              <span>{timeSpentMinutes.toFixed(1)} min spent</span>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </article>
        </div>

        <div className="workspace-column right-column">
          <AssessmentReportPanel report={report} />
          <section className="panel service-panel">
            <p className="eyebrow">Service scaffolding</p>
            <h2>Assessment pipeline lanes</h2>
            <div className="service-list">
              <article>
                <h3>Evidence extraction</h3>
                <p>Surface coverage, position clarity, and sentence variety signals for downstream scoring.</p>
              </article>
              <article>
                <h3>Score prediction</h3>
                <p>Estimate criterion bands with rule-based heuristics until richer LLM evaluators are wired in.</p>
              </article>
              <article>
                <h3>Feedback generation</h3>
                <p>Convert weakest-criterion signals into coaching actions the learner can use immediately.</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
