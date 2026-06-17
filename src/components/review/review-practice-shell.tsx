'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ReviewQuestionView } from '@/lib/services/review/types';

interface ReviewResultPayload {
  itemId: string;
  isCorrect: boolean;
  submittedAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  evidenceHint: string;
  status: 'learning' | 'review' | 'mastered';
  nextDueAt: string;
  intervalDays: number;
  remainingDueCount: number;
}

interface ReviewPracticeShellProps {
  questions: ReviewQuestionView[];
}

const BOOLEAN_CHOICES: Record<string, string[]> = {
  true_false_not_given: ['TRUE', 'FALSE', 'NOT GIVEN'],
  yes_no_not_given: ['YES', 'NO', 'NOT GIVEN'],
};

function describeType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

export function ReviewPracticeShell({ questions }: ReviewPracticeShellProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ReviewResultPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const total = questions.length;
  const current = questions[index] ?? null;
  const booleanChoices = current ? BOOLEAN_CHOICES[current.type] : undefined;
  const isMultipleChoice = current?.type === 'multiple_choice' && current.options.length > 0;
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
        <h2>You are caught up on reviews.</h2>
        <p className="summary-copy">
          Missed Reading questions land here automatically and resurface on a spaced schedule. Finish a Reading set to
          start building your review deck.
        </p>
        <div className="hero-actions">
          <Link className="primary-button dashboard-link-button" href="/reading">
            Open reading practice
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
        <p className="eyebrow">Review session complete</p>
        <h2>{correctCount}/{reviewedCount} cleared from memory.</h2>
        <p className="summary-copy">
          Items you answered correctly move further out; anything you missed will return shortly so it does not slip
          away. Come back when the next batch is due.
        </p>
        <div className="hero-actions">
          <Link className="primary-button dashboard-link-button" href="/curriculum">
            Back to today&apos;s curriculum
          </Link>
          <Link className="secondary-link-button" href="/review">
            Reload review queue
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
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: current.itemId, answer }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? 'Could not record that answer. Please try again.');
        return;
      }

      const payload = (await response.json()) as ReviewResultPayload;
      setResult(payload);
      setReviewedCount((value) => value + 1);
      setCorrectCount((value) => value + (payload.isCorrect ? 1 : 0));
    } catch {
      setError('Could not reach the review service. Please try again.');
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
          Question {index + 1} of {total}
        </span>
        {accuracyLabel ? <strong>{accuracyLabel}</strong> : null}
      </div>

      <article className="panel review-question-card">
        <div className="review-question-header">
          <span className="band-chip">{describeType(current!.type)}</span>
          <span className="review-question-source">{current!.setTitle}</span>
        </div>
        <h2 className="review-question-prompt">{current!.prompt}</h2>

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
                <dt>Accepted</dt>
                <dd>{result.acceptedAnswers.join(', ')}</dd>
              </div>
            </dl>
            {result.explanation ? <p className="review-reveal-explanation">{result.explanation}</p> : null}
            {result.evidenceHint ? (
              <p className="review-reveal-evidence">
                <strong>Evidence:</strong> {result.evidenceHint}
              </p>
            ) : null}
            <p className="review-reveal-schedule">
              {result.isCorrect
                ? `Nice — this one returns ${describeInterval(result.intervalDays)}.`
                : 'This one comes back in a few minutes so the fix sticks.'}
            </p>
            <div className="hero-actions">
              <button className="primary-button dashboard-link-button" onClick={handleNext} type="button">
                {index + 1 >= total ? 'Finish session' : 'Next question'}
              </button>
            </div>
          </div>
        ) : (
          <div className="review-answer-area">
            {booleanChoices ? (
              <div className="review-options" role="group" aria-label="Choose an answer">
                {booleanChoices.map((choice) => (
                  <button
                    aria-pressed={answer === choice}
                    className="review-option"
                    key={choice}
                    onClick={() => setAnswer(choice)}
                    type="button"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : isMultipleChoice ? (
              <div className="review-options review-options--stacked" role="group" aria-label="Choose an answer">
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
            ) : (
              <input
                aria-label="Type your answer"
                className="review-text-input"
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSubmit();
                  }
                }}
                placeholder="Type your answer"
                type="text"
                value={answer}
              />
            )}

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
