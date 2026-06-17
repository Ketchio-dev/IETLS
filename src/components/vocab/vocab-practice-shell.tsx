'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { VocabCardView } from '@/lib/services/vocab/types';

interface VocabResultPayload {
  itemId: string;
  word: string;
  isCorrect: boolean;
  submittedAnswer: string;
  correctDefinition: string;
  example: string;
  status: 'learning' | 'review' | 'mastered';
  nextDueAt: string;
  intervalDays: number;
  remainingDueCount: number;
}

interface VocabPracticeShellProps {
  cards: VocabCardView[];
}

function describeInterval(intervalDays: number) {
  if (intervalDays <= 0) {
    return 'in a few minutes';
  }

  if (intervalDays === 1) {
    return 'tomorrow';
  }

  return `in ${intervalDays} days`;
}

export function VocabPracticeShell({ cards }: VocabPracticeShellProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<VocabResultPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const total = cards.length;
  const current = cards[index] ?? null;
  const isFinished = index >= total;

  const accuracyLabel = useMemo(() => {
    if (reviewedCount === 0) {
      return null;
    }

    return `${correctCount}/${reviewedCount} correct so far`;
  }, [correctCount, reviewedCount]);

  if (total === 0) {
    return (
      <article className="panel review-empty-card">
        <p className="eyebrow">Nothing due</p>
        <h2>You are caught up on vocabulary.</h2>
        <p className="summary-copy">
          Cards you answered correctly are scheduled further out. Come back when the next batch is due to keep the
          words in long-term memory.
        </p>
        <div className="hero-actions">
          <Link className="primary-button dashboard-link-button" href="/review">
            Reading reviews
          </Link>
          <Link className="secondary-link-button" href="/curriculum">
            Back to curriculum
          </Link>
        </div>
      </article>
    );
  }

  if (isFinished) {
    return (
      <article className="panel review-summary-card">
        <p className="eyebrow">Session complete</p>
        <h2>{correctCount}/{reviewedCount} words recalled.</h2>
        <p className="summary-copy">
          Correct words move further out; anything you missed returns shortly. Each card counts toward your daily review
          streak.
        </p>
        <div className="hero-actions">
          <Link className="primary-button dashboard-link-button" href="/vocab">
            Reload vocabulary
          </Link>
          <Link className="secondary-link-button" href="/review/dashboard">
            View streak
          </Link>
        </div>
      </article>
    );
  }

  const handleSubmit = async () => {
    if (!current || submitting || answer.trim().length === 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: current.itemId, answer }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? 'Could not record that answer. Please try again.');
        return;
      }

      const payload = (await response.json()) as VocabResultPayload;
      setResult(payload);
      setReviewedCount((value) => value + 1);
      setCorrectCount((value) => value + (payload.isCorrect ? 1 : 0));
    } catch {
      setError('Could not reach the vocab service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setAnswer('');
    setError(null);
    setIndex((value) => value + 1);
  };

  return (
    <div className="review-shell">
      <div className="review-progress" aria-live="polite">
        <span>
          Word {index + 1} of {total}
        </span>
        {accuracyLabel ? <strong>{accuracyLabel}</strong> : null}
      </div>

      <article className="panel review-question-card">
        <div className="review-question-header">
          <span className="band-chip">{current!.partOfSpeech}</span>
          <span className="review-question-source">Choose the best meaning</span>
        </div>
        <h2 className="review-question-prompt">{current!.word}</h2>

        {result ? (
          <div
            className={`review-reveal ${result.isCorrect ? 'review-reveal--correct' : 'review-reveal--incorrect'}`}
            role="status"
          >
            <p className="review-reveal-verdict">{result.isCorrect ? 'Correct' : 'Not quite'}</p>
            <dl className="review-reveal-grid">
              <div>
                <dt>Your answer</dt>
                <dd>{result.submittedAnswer || '(blank)'}</dd>
              </div>
              <div>
                <dt>Meaning</dt>
                <dd>{result.correctDefinition}</dd>
              </div>
            </dl>
            <p className="review-reveal-evidence">
              <strong>Example:</strong> {result.example}
            </p>
            <p className="review-reveal-schedule">
              {result.isCorrect
                ? `Nice — this word returns ${describeInterval(result.intervalDays)}.`
                : 'This word comes back in a few minutes so it sticks.'}
            </p>
            <div className="hero-actions">
              <button className="primary-button dashboard-link-button" onClick={handleNext} type="button">
                {index + 1 >= total ? 'Finish session' : 'Next word'}
              </button>
            </div>
          </div>
        ) : (
          <div className="review-answer-area">
            <div className="review-options review-options--stacked" role="group" aria-label="Choose the best meaning">
              {current!.options.map((option, optionIndex) => (
                <button
                  aria-pressed={answer === option}
                  className="review-option"
                  key={`${current!.itemId}-${optionIndex}`}
                  onClick={() => setAnswer(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>

            {error ? <p className="review-error">{error}</p> : null}

            <div className="hero-actions">
              <button
                className="primary-button dashboard-link-button"
                disabled={submitting || answer.trim().length === 0}
                onClick={handleSubmit}
                type="button"
              >
                {submitting ? 'Checking…' : 'Check answer'}
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
