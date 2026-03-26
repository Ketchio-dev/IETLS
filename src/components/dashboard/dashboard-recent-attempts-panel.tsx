'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { buildPracticeWorkspaceHref, getAssessmentModule } from '@/lib/assessment-modules/registry';
import type { SavedAssessmentSnapshot, WritingPrompt } from '@/lib/domain';
import { buildAttemptComparison } from '@/lib/services/writing/dashboard';

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
  return buildPracticeWorkspaceHref(getAssessmentModule('writing').workspace, {
    promptId: attempt.promptId,
    attemptId: attempt.submissionId,
  });
}

function buildAttemptStatus(attempt: SavedAssessmentSnapshot) {
  const trace = attempt.report.evaluationTrace;

  return {
    provider: formatProvider(trace.scorerProvider),
    model: trace.scorerModel,
    fallback: trace.usedMockFallback ? 'Mock fallback' : 'Live scorer',
  };
}

function formatSignedBandDelta(value: number) {
  if (value === 0) {
    return 'No overall band change';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(1)} overall band`;
}

function formatSignedCountDelta(value: number, unit: string) {
  if (value === 0) {
    return `No ${unit} change`;
  }

  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

function formatSignedMinuteDelta(value: number) {
  if (value === 0) {
    return 'No time change';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(1)} min`;
}

export function DashboardRecentAttemptsPanel({ attempts, prompts }: Props) {
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(attempts[0]?.submissionId ?? null);
  const [compareAttemptId, setCompareAttemptId] = useState<string | null>(null);
  const promptsById = useMemo(() => new Map(prompts.map((prompt) => [prompt.id, prompt])), [prompts]);
  const activeAttempt = useMemo(
    () => attempts.find((attempt) => attempt.submissionId === activeAttemptId) ?? attempts[0] ?? null,
    [activeAttemptId, attempts],
  );
  const comparedAttempt = useMemo(() => {
    if (!compareAttemptId) {
      return null;
    }

    const candidate = attempts.find((attempt) => attempt.submissionId === compareAttemptId) ?? null;
    if (!candidate || candidate.submissionId === activeAttempt?.submissionId) {
      return null;
    }

    return candidate;
  }, [activeAttempt?.submissionId, attempts, compareAttemptId]);
  const attemptComparison = useMemo(() => {
    if (!activeAttempt || !comparedAttempt) {
      return null;
    }

    return buildAttemptComparison(activeAttempt, comparedAttempt);
  }, [activeAttempt, comparedAttempt]);

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
          const comparedPrompt = comparedAttempt ? promptsById.get(comparedAttempt.promptId) : null;

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
                {attemptComparison ? (
                  <button
                    className="secondary-link-button"
                    onClick={() => setCompareAttemptId(null)}
                    type="button"
                  >
                    Clear comparison
                  </button>
                ) : null}
              </div>
              {attemptComparison ? (
                <article className="history-card dashboard-compare-card">
                  <div className="history-card-header">
                    <strong>Compare against {comparedPrompt?.title ?? 'saved attempt'}</strong>
                    <span>
                      {attemptComparison.currentTaskType === attemptComparison.comparedTaskType
                        ? 'Same task type'
                        : 'Cross-task snapshot'}
                    </span>
                  </div>
                  <p>
                    Compare the inspected attempt against another saved report without leaving the dashboard.
                  </p>
                  <div className="history-meta">
                    <span>{formatSignedBandDelta(attemptComparison.overallBandDelta)}</span>
                    <span>{formatSignedCountDelta(attemptComparison.wordCountDelta, 'words')}</span>
                    <span>{formatSignedMinuteDelta(attemptComparison.timeSpentDelta)}</span>
                  </div>
                  <ul className="dashboard-compare-list">
                    {attemptComparison.criterionComparisons.map((entry) => (
                      <li key={entry.criterion}>
                        <strong>{entry.criterion}</strong>
                        <span>
                          {entry.delta > 0 ? '+' : ''}
                          {entry.delta.toFixed(1)} ({entry.currentBand.toFixed(1)} vs {entry.comparedBand.toFixed(1)})
                        </span>
                      </li>
                    ))}
                  </ul>
                  {attemptComparison.taskSpecificCriterionOmitted ? (
                    <p className="summary-copy">
                      Task-specific criteria are omitted when Task 1 and Task 2 attempts are compared.
                    </p>
                  ) : null}
                </article>
              ) : attempts.length > 1 ? (
                <p className="summary-copy dashboard-inline-note">
                  Choose another saved attempt below to compare overall band, pacing, and shared criteria.
                </p>
              ) : null}
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
                  {!isActive ? (
                    <button
                      className="secondary-link-button"
                      onClick={() => setCompareAttemptId(attempt.submissionId)}
                      type="button"
                    >
                      {compareAttemptId === attempt.submissionId ? 'Comparing now' : 'Compare to inspected'}
                    </button>
                  ) : null}
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
