'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { SavedAssessmentSnapshot, WritingPrompt } from '@/lib/domain';

interface Props {
  attempts: SavedAssessmentSnapshot[];
  prompts: WritingPrompt[];
}

function formatRange(lower: number, upper: number) {
  return `Band ${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

function formatProvider(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTaskLabel(taskType: SavedAssessmentSnapshot['taskType']) {
  return taskType === 'task-1' ? 'Task 1' : 'Task 2';
}

function buildResumeHref(attempt: SavedAssessmentSnapshot) {
  const params = new URLSearchParams({
    promptId: attempt.promptId,
    attemptId: attempt.submissionId,
  });

  return `/?${params.toString()}`;
}

function buildAttemptStatus(attempt: SavedAssessmentSnapshot) {
  const trace = attempt.report.evaluationTrace;

  return {
    provider: formatProvider(trace.scorerProvider),
    model: trace.scorerModel,
    fallback: trace.usedMockFallback ? 'Mock fallback' : 'Live scorer',
  };
}

export function DashboardRecentAttemptsPanel({ attempts, prompts }: Props) {
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(attempts[0]?.submissionId ?? null);
  const promptsById = useMemo(() => new Map(prompts.map((prompt) => [prompt.id, prompt])), [prompts]);
  const activeAttempt = useMemo(
    () => attempts.find((attempt) => attempt.submissionId === activeAttemptId) ?? attempts[0] ?? null,
    [activeAttemptId, attempts],
  );

  return (
    <section className="panel history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent saved attempts</p>
          <h2>Inspect and resume from the dashboard</h2>
        </div>
        <span className="band-chip">{attempts.length} saved</span>
      </div>

      {activeAttempt ? (
        (() => {
          const prompt = promptsById.get(activeAttempt.promptId);
          const status = buildAttemptStatus(activeAttempt);

          return (
            <article className="history-card inspection-card">
              <div className="history-card-header">
                <strong>{prompt?.title ?? 'Saved writing attempt'}</strong>
                <span>{formatRange(activeAttempt.report.overallBandRange.lower, activeAttempt.report.overallBandRange.upper)}</span>
              </div>
              <p>{activeAttempt.report.summary}</p>
              <div className="history-meta">
                <span>{formatTaskLabel(activeAttempt.taskType)}</span>
                <span>{activeAttempt.report.confidence} confidence</span>
                <span>{new Date(activeAttempt.createdAt).toLocaleString()}</span>
              </div>
              <div className="history-meta inspection-meta">
                <span>{activeAttempt.wordCount} words</span>
                <span>{activeAttempt.timeSpentMinutes.toFixed(1)} min</span>
                <span>{status.provider}</span>
                <span>{status.model}</span>
                <span>{status.fallback}</span>
              </div>
              <div className="hero-actions">
                <Link className="secondary-link-button" href={buildResumeHref(activeAttempt)}>
                  Resume this attempt
                </Link>
              </div>
            </article>
          );
        })()
      ) : (
        <p className="summary-copy">
          Save your first scored response to inspect attempts here and jump back into the practice shell.
        </p>
      )}

      {attempts.length > 0 ? (
        <div className="history-list">
          {attempts.map((attempt) => {
            const prompt = promptsById.get(attempt.promptId);
            const isActive = attempt.submissionId === activeAttempt?.submissionId;

            return (
              <article className="history-card" key={attempt.submissionId}>
                <div className="history-card-header">
                  <strong>{prompt?.title ?? 'Saved writing attempt'}</strong>
                  <span>{formatTaskLabel(attempt.taskType)}</span>
                </div>
                <p>{attempt.report.summary}</p>
                <div className="history-meta">
                  <span>{formatRange(attempt.report.overallBandRange.lower, attempt.report.overallBandRange.upper)}</span>
                  <span>{attempt.wordCount} words</span>
                  <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                </div>
                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() => setActiveAttemptId(attempt.submissionId)}
                    type="button"
                  >
                    {isActive ? 'Inspecting now' : 'Inspect here'}
                  </button>
                  <Link className="secondary-link-button" href={buildResumeHref(attempt)}>
                    Resume in practice shell
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
