'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getPromptTranscriptSeed } from '@/lib/services/speaking/application-service';
import type {
  SpeakingAssessmentReport,
  SpeakingPracticePageData,
  SpeakingPrompt,
  SpeakingRecentSessionSummary,
  SpeakingSessionSnapshot,
} from '@/lib/services/speaking/types';

import { SpeakingAssessmentReportPanel } from './speaking-assessment-report';

function formatBandRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

function formatPart(part: SpeakingPrompt['part']) {
  return part.toUpperCase().replace('-', ' ');
}

function buildResumeHref(session: SpeakingSessionSnapshot) {
  return `/speaking?promptId=${encodeURIComponent(session.promptId)}&sessionId=${encodeURIComponent(session.sessionId)}`;
}

type SpeakingPracticeShellProps = SpeakingPracticePageData;

function RecentSessionsPanel({
  prompts,
  sessions,
  activeSessionId,
  onInspect,
}: {
  prompts: SpeakingPrompt[];
  sessions: SpeakingSessionSnapshot[];
  activeSessionId: string | null;
  onInspect: (session: SpeakingSessionSnapshot) => void;
}) {
  return (
    <article className="panel history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h2>Inspect recent speaking attempts</h2>
        </div>
        <span className="band-chip">{sessions.slice(0, 6).length} shown</span>
      </div>
      <div className="history-list">
        {sessions.slice(0, 6).map((session) => {
          const isActive = session.sessionId === activeSessionId;
          const title = prompts.find((item) => item.id === session.promptId)?.title ?? session.promptId;

          return (
            <article className={`history-card${isActive ? ' is-active' : ''}`} key={session.sessionId}>
              <div className="history-card-header">
                <strong>{title}</strong>
                <span>{formatBandRange(session.report.overallBandRange.lower, session.report.overallBandRange.upper)}</span>
              </div>
              <p>{session.report.summary}</p>
              <div className="history-meta">
                <span>{formatPart(session.part)}</span>
                <span>{session.transcriptWordCount} words</span>
                <span>{session.durationSeconds}s</span>
              </div>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => onInspect(session)} type="button">
                  Inspect session
                </button>
                <Link className="secondary-link-button" href={buildResumeHref(session)}>
                  Resume via URL
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </article>
  );
}

export function SpeakingPracticeShell({
  prompts,
  prompt,
  initialReport,
  initialTranscript,
  initialDurationSeconds,
  initialRecentSessions,
  initialSavedSessions,
  initialSessionId,
}: SpeakingPracticeShellProps) {
  const [selectedPromptId, setSelectedPromptId] = useState(prompt.id);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationSeconds);
  const [savedSessions, setSavedSessions] = useState(initialSavedSessions);
  const [recentSessions, setRecentSessions] = useState(initialRecentSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId ?? initialSavedSessions[0]?.sessionId ?? null,
  );
  const [report, setReport] = useState<SpeakingAssessmentReport>(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) ?? prompt,
    [prompt, prompts, selectedPromptId],
  );
  const promptSessions = useMemo(
    () => savedSessions.filter((session) => session.promptId === activePrompt.id),
    [activePrompt.id, savedSessions],
  );
  const wordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );
  const elapsedSeconds = Math.max(activePrompt.recommendedSeconds - secondsRemaining, 0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const selectedSession =
      promptSessions.find((session) => session.sessionId === activeSessionId) ?? promptSessions[0] ?? null;

    setSecondsRemaining(selectedSession?.durationSeconds ?? activePrompt.recommendedSeconds);
    setError(null);
    setTranscript(selectedSession?.transcript ?? getPromptTranscriptSeed(activePrompt.id));
    setReport(
      selectedSession?.report ?? {
        ...initialReport,
        promptId: activePrompt.id,
        part: activePrompt.part,
        sessionId: initialReport.sessionId,
      },
    );
  }, [activePrompt.id, activePrompt.part, activePrompt.recommendedSeconds, activeSessionId, initialReport, promptSessions]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/speaking/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: activePrompt.id,
          transcript,
          durationSeconds: elapsedSeconds > 0 ? elapsedSeconds : activePrompt.recommendedSeconds,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        report?: SpeakingAssessmentReport;
        recentSessions?: SpeakingRecentSessionSummary[];
        savedSessions?: SpeakingSessionSnapshot[];
      };

      if (!response.ok || !payload.report || !payload.savedSessions) {
        throw new Error(payload.error ?? 'Unable to generate the speaking report');
      }

      setReport(payload.report);
      setRecentSessions(payload.recentSessions ?? []);
      setSavedSessions(payload.savedSessions);
      setActiveSessionId(payload.savedSessions[0]?.sessionId ?? null);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unexpected speaking submission error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleInspectSession(session: SpeakingSessionSnapshot) {
    setSelectedPromptId(session.promptId);
    setActiveSessionId(session.sessionId);
    setReport(session.report);
    setTranscript(session.transcript);
    setSecondsRemaining(session.durationSeconds);
  }

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">IELTS Academic • Speaking alpha</p>
          <h1>Run a timed speaking practice flow with a plausible local scorecard</h1>
          <p className="hero-copy">
            Pick a Part 1, Part 2, or Part 3 prompt, draft or paste your transcript, and keep a
            light recent-session trail while audio capture is still pending.
          </p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href="/speaking/dashboard">
              Open speaking dashboard
            </Link>
            <p className="hero-action-copy">
              Review recent sessions, part coverage, and the next local study focus.
            </p>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Time left</span>
            <strong>
              {String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:{String(secondsRemaining % 60).padStart(2, '0')}
            </strong>
          </div>
          <div className="metric-card">
            <span>Transcript words</span>
            <strong>{wordCount}</strong>
          </div>
          <div className="metric-card">
            <span>Speaking part</span>
            <strong>{activePrompt.part.toUpperCase()}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Prompt bank</p>
                <h2>Choose a speaking prompt</h2>
              </div>
              <span className="band-chip">{prompts.length} prompts</span>
            </div>
            <div className="prompt-selector">
              {prompts.map((item) => {
                const isActive = item.id === activePrompt.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`history-card history-card-button${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      setActiveSessionId(null);
                      setSelectedPromptId(item.id);
                    }}
                  >
                    <div className="history-card-header">
                      <strong>{item.title}</strong>
                      <span>{item.part.toUpperCase()}</span>
                    </div>
                    <p>{item.topic}</p>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Transcript workspace</p>
                <h2>{activePrompt.title}</h2>
              </div>
              <span className="band-chip">Target {activePrompt.recommendedSeconds}s</span>
            </div>
            <p className="summary-copy">{activePrompt.prompt}</p>
            {activePrompt.cueCard?.length ? (
              <div className="task1-layout" style={{ marginBottom: '1rem' }}>
                <div className="visual-card">
                  <strong>Cue card prompts</strong>
                  <ul className="plain-list compact-list">
                    {activePrompt.cueCard.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="visual-card">
                  <strong>Follow-up angles</strong>
                  <ul className="plain-list compact-list">
                    {activePrompt.followUps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="visual-card" style={{ marginBottom: '1rem' }}>
                <strong>Follow-up angles</strong>
                <ul className="plain-list compact-list">
                  {activePrompt.followUps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <label className="eyebrow" htmlFor="speaking-transcript">
              Speaking transcript
            </label>
            <textarea
              id="speaking-transcript"
              className="essay-textarea"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Paste or draft a transcript here while the alpha remains transcript-first."
            />
            {error ? <p className="error-text">{error}</p> : null}
            <div className="hero-actions" style={{ marginTop: '1rem' }}>
              <button className="primary-button" type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Scoring…' : 'Generate speaking scorecard'}
              </button>
              <p className="hero-action-copy">
                Current alpha uses transcript + timing heuristics and stores the latest session locally.
              </p>
            </div>
          </article>
        </div>

        <div className="workspace-column right-column">
          <SpeakingAssessmentReportPanel report={report} prompt={activePrompt} />
          <RecentSessionsPanel
            prompts={prompts}
            sessions={savedSessions}
            activeSessionId={activeSessionId}
            onInspect={handleInspectSession}
          />
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent summary</p>
                <h2>Latest local scoring snapshots</h2>
              </div>
              <span className="band-chip">{recentSessions.length} entries</span>
            </div>
            <ul className="plain-list compact-list">
              {recentSessions.map((session) => (
                <li key={session.sessionId}>
                  <strong>{formatPart(session.part)}</strong> · {formatBandRange(session.overallBandRange.lower, session.overallBandRange.upper)} · {session.confidence} confidence
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
