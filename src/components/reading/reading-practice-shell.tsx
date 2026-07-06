'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ImportedReadingQuestion, ImportedReadingSet } from '@/lib/services/reading-imports/types';
import type {
  ReadingAssessmentReport,
  ReadingAttemptSnapshot,
  ReadingPracticePageData,
  ReadingQuestionReview,
} from '@/lib/services/reading/types';

import {
  formatClockDuration,
  formatCompactDuration,
  formatQuestionType,
  formatSavedAt,
} from './reading-formatting';
import {
  buildReadingAttemptResumeHref,
  buildReadingAttemptRetryHref,
  buildReadingRetryQuestionIds,
  filterReadingQuestionsForRetry,
  hasMissedQuestions,
  isReadingRetryModeActive,
} from './reading-attempt-utils';
import { ReadingAssessmentReportPanel } from './reading-assessment-report';
import {
  buildReadingHeroActionCopy,
  buildReadingPaceSummary,
  buildReadingReportAnnouncement,
  buildReadingSubmitButtonLabel,
  buildReadingSubmitCopy,
} from './reading-practice-model';

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

function getQuestionHelper(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'Choose the single best option from the list below.';
    case 'true_false_not_given':
      return 'Match the statement against the passage: TRUE, FALSE, or NOT GIVEN.';
    case 'sentence_completion':
      return 'Type the missing word or phrase exactly as it appears in the passage.';
    default:
      return 'Answer directly from the passage evidence.';
  }
}

function getQuestionStatusLabel(answer: string | undefined, review: ReadingQuestionReview | null) {
  if (review) {
    return review.isCorrect ? 'Correct' : 'Review needed';
  }

  return answer?.trim() ? 'Answered' : 'Pending';
}

function getInlineReviewCopy(evidenceHint: string, isCorrect: boolean) {
  const trimmed = evidenceHint.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  return isCorrect
    ? 'No evidence note was saved for this question. Recheck the closest supporting sentence in the passage.'
    : 'No evidence hint was saved for this question. Recheck the closest matching sentence in the passage.';
}

function getQuestionTypes(questions: ImportedReadingSet['questions']) {
  const seenTypes = new Set<string>();
  const types: string[] = [];

  for (const question of questions) {
    if (!seenTypes.has(question.type)) {
      seenTypes.add(question.type);
      types.push(question.type);
    }
  }

  return types;
}

function ElapsedTimeMetric({
  initialSeconds,
  onTick,
}: {
  initialSeconds: number;
  onTick: (seconds: number) => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);

  useEffect(() => {
    onTick(initialSeconds);

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => {
        const next = current + 1;
        onTick(next);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [initialSeconds, onTick]);

  return <strong>{formatClockDuration(elapsedSeconds)}</strong>;
}

function ReadingPaceMetric({
  answeredQuestionCount,
  initialSeconds,
  isRetryModeActive,
  questionCount,
}: {
  answeredQuestionCount: number;
  initialSeconds: number;
  isRetryModeActive: boolean;
  questionCount: number;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  const paceSummary = buildReadingPaceSummary({
    answeredQuestionCount,
    elapsedSeconds,
    isRetryModeActive,
    questionCount,
  });

  return (
    <>
      <strong>{paceSummary.label}</strong>
      <small>{paceSummary.detail}</small>
    </>
  );
}

const RecentAttemptsPanel = memo(function RecentAttemptsPanel({
  attempts,
  activeAttemptId,
  onInspect,
}: {
  attempts: ReadingAttemptSnapshot[];
  activeAttemptId: string | null;
  onInspect: (attempt: ReadingAttemptSnapshot) => void;
}) {
  return (
    <article className="panel history-panel" aria-labelledby="reading-recent-attempts-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent attempts</p>
          <h2 id="reading-recent-attempts-heading">Review saved sets</h2>
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
                <span>{formatCompactDuration(attempt.timeSpentSeconds)}</span>
                <span>{formatSavedAt(attempt.createdAt)}</span>
              </div>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => onInspect(attempt)} type="button">
                  Inspect attempt
                </button>
                {hasMissedQuestions(attempt.report.questionReviews) ? (
                  <Link className="secondary-link-button" href={buildReadingAttemptRetryHref(attempt)}>
                    Retry missed questions
                  </Link>
                ) : null}
                <Link className="secondary-link-button" href={buildReadingAttemptResumeHref(attempt)}>
                  Reopen this set
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
});

const ReadingJumpButton = memo(function ReadingJumpButton({
  answer,
  index,
  onJumpToQuestion,
  questionId,
  review,
}: {
  answer: string;
  index: number;
  onJumpToQuestion: (questionId: string) => void;
  questionId: string;
  review: ReadingQuestionReview | null;
}) {
  const statusLabel = getQuestionStatusLabel(answer, review);

  return (
    <button
      type="button"
      className={`reading-jump-button${answer.trim() ? ' is-answered' : ''}${review ? ` ${review.isCorrect ? 'is-correct' : 'is-review-needed'}` : ''}`}
      onClick={() => onJumpToQuestion(questionId)}
      aria-label={`Jump to question ${index + 1}, ${statusLabel}`}
    >
      <strong>Q{index + 1}</strong>
      <span>{statusLabel}</span>
    </button>
  );
});

const ReadingQuestionCard = memo(function ReadingQuestionCard({
  answer,
  index,
  onAnswerChange,
  question,
  review,
}: {
  answer: string;
  index: number;
  onAnswerChange: (questionId: string, value: string) => void;
  question: ImportedReadingQuestion;
  review: ReadingQuestionReview | null;
}) {
  const statusLabel = getQuestionStatusLabel(answer, review);
  const optionList = question.type === 'true_false_not_given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : question.options;

  return (
    <article
      className={`history-card reading-question-card${review ? ` ${review.isCorrect ? 'is-correct' : 'is-review-needed'}` : ''}`}
      id={question.id}
    >
      <fieldset className="reading-question-fieldset">
        <legend className="reading-question-legend">
          <span className="reading-question-title">Q{index + 1}. {question.prompt}</span>
          <span className="reading-question-chip">{formatQuestionType(question.type)} · {statusLabel}</span>
        </legend>

        <p className="summary-copy reading-question-helper">{getQuestionHelper(question.type)}</p>

        {question.type === 'sentence_completion' ? (
          <label className="stack-sm reading-question-input-shell">
            <span className="summary-copy">Your answer</span>
            <input
              aria-label={question.prompt}
              className="text-input"
              value={answer}
              onChange={(event) => onAnswerChange(question.id, event.target.value)}
              placeholder="Type your answer"
            />
          </label>
        ) : (
          <div className="stack-sm" role="radiogroup" aria-label={question.prompt}>
            {optionList.map((option) => {
              const isSelected = answer === option;

              return (
                <label className={`reading-question-option${isSelected ? ' is-selected' : ''}`} key={`${question.id}-${option}`}>
                  <input
                    checked={isSelected}
                    name={question.id}
                    onChange={() => onAnswerChange(question.id, option)}
                    type="radio"
                    value={option}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {review ? (
          <div className="reading-question-feedback" aria-live="polite">
            <span className={`reading-feedback-pill ${review.isCorrect ? 'is-correct' : 'is-review-needed'}`}>
              {review.isCorrect ? 'Correct' : 'Review needed'}
            </span>
            <p className="summary-copy">
              <strong>{review.isCorrect ? 'What proves this:' : 'Why the answer key rejects this:'}</strong>{' '}
              {getInlineReviewCopy(review.evidenceHint, review.isCorrect)}
            </p>
          </div>
        ) : null}
      </fieldset>
    </article>
  );
});

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
  initialRetryMode,
}: ReadingPracticePageData) {
  const router = useRouter();
  const [selectedSetId, setSelectedSetId] = useState(initialSetId ?? activeSet?.id ?? '');
  const [savedAttempts, setSavedAttempts] = useState(initialSavedAttempts);
  const [activeAttemptId, setActiveAttemptId] = useState(initialAttemptId);
  const [report, setReport] = useState<ReadingAssessmentReport | null>(initialReport);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const secondsElapsedRef = useRef(initialTimeSpentSeconds);
  const [timerSeed, setTimerSeed] = useState(initialTimeSpentSeconds);
  const [timerVersion, setTimerVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryMode, setRetryMode] = useState(initialRetryMode === 'incorrect');
  const [activePracticeStep, setActivePracticeStep] = useState<'passage' | 'questions'>(
    initialRetryMode === 'incorrect' ? 'questions' : 'passage',
  );

  const selectedSet = useMemo(
    () => (selectedSetId ? findSet(importedSets, activeSet, selectedSetId) : activeSet),
    [activeSet, importedSets, selectedSetId],
  );
  const selectedSetParagraphs = useMemo(
    () => (selectedSet ? splitPassage(selectedSet.passage) : []),
    [selectedSet],
  );
  const recentSavedAttempts = useMemo(() => savedAttempts.slice(0, 6), [savedAttempts]);

  const handleElapsedTick = useCallback((seconds: number) => {
    secondsElapsedRef.current = seconds;
  }, []);

  const resetElapsedTimer = useCallback((seconds: number) => {
    secondsElapsedRef.current = seconds;
    setTimerSeed(seconds);
    setTimerVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const matchingAttempt = savedAttempts.find((attempt) => attempt.attemptId === activeAttemptId);
    if (matchingAttempt) {
      setAnswers(matchingAttempt.answers);
      setReport(matchingAttempt.report);
      setSelectedSetId(matchingAttempt.setId);
    }
  }, [activeAttemptId, savedAttempts]);

  useEffect(() => {
    setRetryMode(initialRetryMode === 'incorrect');
    setActivePracticeStep(initialRetryMode === 'incorrect' ? 'questions' : 'passage');
  }, [initialRetryMode]);

  const reviewByQuestionId = useMemo(() => {
    return new Map(report?.questionReviews.map((review) => [review.questionId, review]) ?? []);
  }, [report]);

  const activeAttempt = useMemo(
    () => savedAttempts.find((attempt) => attempt.attemptId === activeAttemptId) ?? null,
    [activeAttemptId, savedAttempts],
  );
  const retryQuestionIds = useMemo(
    () => buildReadingRetryQuestionIds({
      activeAttempt,
      report,
      retryMode,
      selectedSetId: selectedSet?.id ?? null,
    }),
    [activeAttempt, report, retryMode, selectedSet?.id],
  );
  const isRetryModeActive = isReadingRetryModeActive(retryMode, retryQuestionIds);
  const visibleQuestions = useMemo(() => {
    if (!selectedSet) {
      return [];
    }

    return filterReadingQuestionsForRetry(selectedSet.questions, retryQuestionIds, isRetryModeActive);
  }, [isRetryModeActive, retryQuestionIds, selectedSet]);
  const retryMissCount = retryQuestionIds.length;

  const answeredQuestionCount = useMemo(() => {
    let answeredCount = 0;

    for (const question of visibleQuestions) {
      if ((answers[question.id] ?? '').trim().length > 0) {
        answeredCount += 1;
      }
    }

    return answeredCount;
  }, [answers, visibleQuestions]);

  const questionCount = visibleQuestions.length;
  const remainingQuestionCount = Math.max(questionCount - answeredQuestionCount, 0);
  const completionPercentage = questionCount > 0 ? Math.round((answeredQuestionCount / questionCount) * 100) : 0;
  const supportedTypes = useMemo(
    () => (selectedSet ? getQuestionTypes(selectedSet.questions) : []),
    [selectedSet],
  );
  const selectedSetSummary = useMemo(
    () => (selectedSetId ? importSummary.sets.find((set) => set.id === selectedSetId) ?? null : null),
    [importSummary.sets, selectedSetId],
  );
  const canShowFullReview = remainingQuestionCount === 0;
  const reportAnnouncement = buildReadingReportAnnouncement({
    activeAttempt,
    isRetryModeActive,
    report,
    retryMissCount,
  });
  const heroActionCopy = buildReadingHeroActionCopy({
    answeredQuestionCount,
    isRetryModeActive,
    questionCount,
    remainingQuestionCount,
  });
  const submitButtonLabel = buildReadingSubmitButtonLabel({
    canShowFullReview,
    isRetryModeActive,
    isSubmitting,
  });
  const submitCopy = buildReadingSubmitCopy({
    isRetryModeActive,
    remainingQuestionCount,
  });
  const activeAttemptHasMissedQuestions = activeAttempt ? hasMissedQuestions(activeAttempt.report.questionReviews) : false;
  const retrySourceAttempt = activeAttemptHasMissedQuestions ? activeAttempt : null;
  const retryHref = retrySourceAttempt ? buildReadingAttemptRetryHref(retrySourceAttempt) : null;

  const handleInspectAttempt = useCallback((attempt: ReadingAttemptSnapshot) => {
    setActiveAttemptId(attempt.attemptId);
    setSelectedSetId(attempt.setId);
    setAnswers(attempt.answers);
    setReport(attempt.report);
    resetElapsedTimer(attempt.timeSpentSeconds);
    setError(null);
    setRetryMode(false);
    setActivePracticeStep('questions');
  }, [resetElapsedTimer]);

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }, []);

  const handleJumpToQuestion = useCallback((questionId: string) => {
    setActivePracticeStep('questions');
    const target = document.getElementById(questionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const focusTarget = target.querySelector<HTMLElement>('input, textarea, button, select');
    focusTarget?.focus();
  }, []);

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
          timeSpentSeconds: secondsElapsedRef.current,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        report?: ReadingAssessmentReport;
        attempt?: ReadingAttemptSnapshot;
        savedAttempts?: ReadingAttemptSnapshot[];
      };

      if (!response.ok || !payload.report || !payload.attempt || !payload.savedAttempts) {
        throw new Error(payload.error ?? 'Unable to score the reading set.');
      }

      setReport(payload.report);
      setSavedAttempts(payload.savedAttempts);
      setActiveAttemptId(payload.attempt.attemptId);
      setAnswers(payload.attempt.answers);
      const nextRetryMode = retryMode && hasMissedQuestions(payload.report.questionReviews);
      setRetryMode(nextRetryMode);
      router.push(nextRetryMode ? buildReadingAttemptRetryHref(payload.attempt) : buildReadingAttemptResumeHref(payload.attempt));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unexpected reading submission error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selectedSet) {
    return (
      <>
        <section className="hero panel">
          <div>
            <p className="eyebrow">IELTS Academic Reading</p>
            <h1>No reading practice set is ready yet</h1>
            <p className="hero-copy">{summary}</p>
            <div className="hero-actions">
              <Link className="secondary-link-button" href="/reading/dashboard">
                Open reading dashboard
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const selectedSetTypes = selectedSetSummary?.types ?? supportedTypes;

  return (
    <>
      <section className="hero panel reading-practice-hero">
        <div>
          <p className="eyebrow">IELTS Academic Reading</p>
          <h1>Reading practice</h1>
          <p className="hero-copy">
            {isRetryModeActive
              ? `${selectedSet.title} · retry the ${retryMissCount} missed question${retryMissCount === 1 ? '' : 's'} before you switch sets.`
              : `${selectedSet.title} · ${selectedSet.sourceLabel} · ${selectedSet.questions.length} questions`}
          </p>
          <div className="hero-actions">
            <Link className="secondary-link-button" href="/reading/dashboard">
              Open reading dashboard
            </Link>
            <p className="hero-action-copy">{heroActionCopy}</p>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Elapsed</span>
            <ElapsedTimeMetric
              key={`reading-timer-${timerVersion}`}
              initialSeconds={timerSeed}
              onTick={handleElapsedTick}
            />
          </div>
          <div className="metric-card">
            <span>Progress</span>
            <strong>{answeredQuestionCount}/{questionCount}</strong>
          </div>
          <div className="metric-card">
            <span>{isRetryModeActive ? 'Retry focus' : 'Completion'}</span>
            <strong>{isRetryModeActive ? `${retryMissCount} missed` : `${completionPercentage}%`}</strong>
          </div>
          <div className="metric-card metric-card--wide">
            <span>Pace</span>
            <ReadingPaceMetric
              key={`reading-pace-${timerVersion}`}
              answeredQuestionCount={answeredQuestionCount}
              initialSeconds={timerSeed}
              isRetryModeActive={isRetryModeActive}
              questionCount={questionCount}
            />
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column left-column">
          <details className="panel student-help-panel">
            <summary>
              <span>
                <span className="eyebrow">Start here</span>
                <strong>3-step reading loop</strong>
              </span>
              <span className="band-chip">Help</span>
            </summary>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Start here</p>
                <h2>Use the same 3-step review loop for every set</h2>
              </div>
            </div>
            <div className="quick-start-grid" aria-label="Reading practice quick start">
              <article className="quick-start-card">
                <strong>1. Read for structure</strong>
                <p>Skim the passage once, then return paragraph by paragraph for evidence.</p>
              </article>
              <article className="quick-start-card">
                <strong>2. Answer and submit</strong>
                <p>Finish every question when you can. If you submit with blanks, treat the score as a pacing checkpoint rather than a full review.</p>
              </article>
              <article className="quick-start-card">
                <strong>3. Fix missed questions</strong>
                <p>Use the evidence hint and question-type results to decide what to redo next.</p>
              </article>
            </div>
            {isRetryModeActive ? (
              <p className="summary-copy reading-section-block">
                Retry mode keeps only the missed questions in view so you can fix weak answers before you move on to a new set.
              </p>
            ) : null}
          </details>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Practice controls</p>
                <h2>Passage and answer sheet</h2>
              </div>
              <span className="band-chip">{selectedSetTypes.length} question types</span>
            </div>
            <label className="stack-sm" htmlFor="reading-set-select">
              <span className="summary-copy">Reading practice set</span>
              <select
                id="reading-set-select"
                value={selectedSetId}
                onChange={(event) => {
                  const nextSetId = event.target.value;
                  setSelectedSetId(nextSetId);
                  setActiveAttemptId(null);
                  setAnswers({});
                  setReport(null);
                  setError(null);
                  resetElapsedTimer(0);
                  setRetryMode(false);
                  setActivePracticeStep('passage');
                  if (nextSetId !== selectedSet.id) {
                    router.push(`/reading?setId=${encodeURIComponent(nextSetId)}`);
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

            <div className="reading-overview-grid">
              <article className="visual-card reading-overview-card">
                <h3 className="subsection-title">Passage overview</h3>
                <ul className="plain-list compact-list">
                  <li><strong>Source:</strong> {selectedSet.sourceLabel}</li>
                  <li><strong>Words:</strong> {selectedSet.passageWordCount}</li>
                  <li><strong>Paragraphs:</strong> {selectedSetParagraphs.length}</li>
                </ul>
              </article>
              <article className="visual-card reading-overview-card">
                <h3 className="subsection-title">Question types</h3>
                <div className="reading-type-list" aria-label="Question types in this practice set">
                  {selectedSetTypes.map((type) => (
                    <span className="practice-meta-chip" data-module="reading" key={type}>
                      <strong>{formatQuestionType(type)}</strong>
                    </span>
                  ))}
                </div>
              </article>
            </div>

            <div className="task-switcher reading-step-switcher" role="tablist" aria-label="Reading practice step">
              <button
                aria-selected={activePracticeStep === 'passage'}
                className={`task-tab${activePracticeStep === 'passage' ? ' is-active' : ''}`}
                onClick={() => setActivePracticeStep('passage')}
                role="tab"
                type="button"
              >
                1. Read passage
              </button>
              <button
                aria-selected={activePracticeStep === 'questions'}
                className={`task-tab${activePracticeStep === 'questions' ? ' is-active' : ''}`}
                onClick={() => setActivePracticeStep('questions')}
                role="tab"
                type="button"
              >
                2. Answer questions
              </button>
            </div>

            {activePracticeStep === 'passage' ? (
            <div className="stack-sm reading-section-block">
              <div className="section-heading reading-subsection-heading">
                <div>
                  <h3 className="subsection-title">Passage</h3>
                  <p className="summary-copy">Read once for structure, then return for evidence while answering.</p>
                </div>
              </div>
              {selectedSetParagraphs.map((paragraph, index) => (
                <p className="summary-copy reading-passage-paragraph" key={`${selectedSet.id}-paragraph-${index}`}>
                  {paragraph}
                </p>
              ))}
              <div className="hero-actions reading-submit-row">
                <button className="primary-button" onClick={() => setActivePracticeStep('questions')} type="button">
                  Continue to questions
                </button>
              </div>
            </div>
            ) : null}
          </article>

          {activePracticeStep === 'questions' ? (
          <article className="panel history-panel" aria-labelledby="reading-questions-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Questions</p>
                <h2 id="reading-questions-heading">Complete the set</h2>
                <p className="summary-copy">
                  {isRetryModeActive
                    ? 'Focus only on the missed questions, then re-score to see whether the weak spots are gone.'
                    : 'Jump between questions, keep answers concise, and use the review states after scoring.'}
                </p>
              </div>
              <span className="band-chip">
                {remainingQuestionCount === 0 ? 'Ready to score' : `${remainingQuestionCount} remaining`}
              </span>
            </div>

            <div className="reading-jump-grid" aria-label="Question navigation">
              {visibleQuestions.map((question, index) => {
                const answer = answers[question.id] ?? '';
                const review = reviewByQuestionId.get(question.id) ?? null;

                return (
                  <ReadingJumpButton
                    answer={answer}
                    index={index}
                    key={question.id}
                    onJumpToQuestion={handleJumpToQuestion}
                    questionId={question.id}
                    review={review}
                  />
                );
              })}
            </div>

            <div className="history-list">
              {visibleQuestions.map((question, index) => {
                const answer = answers[question.id] ?? '';
                const review = reviewByQuestionId.get(question.id) ?? null;

                return (
                  <ReadingQuestionCard
                    answer={answer}
                    index={index}
                    key={question.id}
                    onAnswerChange={handleAnswerChange}
                    question={question}
                    review={review}
                  />
                );
              })}
            </div>
            <div className="hero-actions reading-submit-row">
              <button className="primary-button" disabled={isSubmitting} onClick={handleSubmit} type="button">
                {submitButtonLabel}
              </button>
              {report && retryHref && !isRetryModeActive ? (
                <Link className="secondary-link-button" href={retryHref}>
                  Retry missed questions
                </Link>
              ) : null}
              {isRetryModeActive ? (
                <button
                  className="secondary-link-button"
                  onClick={() => {
                    setRetryMode(false);
                    if (activeAttempt) {
                      router.push(buildReadingAttemptResumeHref(activeAttempt));
                    }
                  }}
                  type="button"
                >
                  Return to full set
                </button>
              ) : null}
              <p className="hero-action-copy reading-submit-copy">
                {submitCopy}
              </p>
            </div>
            {error ? (
              <p className="summary-copy reading-submit-feedback" role="alert">
                {error}
              </p>
            ) : null}
          </article>
          ) : null}
        </div>

        <div className="workspace-column right-column right-column--sticky">
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {reportAnnouncement}
          </p>
          {activeAttempt ? (
            <article className="panel history-panel reading-attempt-summary" aria-labelledby="reading-attempt-summary-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Active attempt</p>
                  <h2 id="reading-attempt-summary-heading">Current coaching snapshot</h2>
                </div>
                <span className="band-chip">{activeAttempt.report.scoreLabel}</span>
              </div>
              <ul className="plain-list compact-list">
                <li><strong>Saved:</strong> {formatSavedAt(activeAttempt.createdAt)}</li>
                <li><strong>Time spent:</strong> {formatCompactDuration(activeAttempt.timeSpentSeconds)}</li>
                <li><strong>Set:</strong> {activeAttempt.setTitle}</li>
                <li><strong>Next move:</strong> {activeAttempt.report.nextSteps[0] ?? 'Redo one missed question before switching sets.'}</li>
              </ul>
              {activeAttemptHasMissedQuestions ? (
                <div className="hero-actions">
                  <Link className="primary-button" href={buildReadingAttemptRetryHref(activeAttempt)}>
                    Retry missed questions
                  </Link>
                </div>
              ) : null}
            </article>
          ) : null}
          {report ? (
            <details className="student-detail-panel">
              <summary>
                <span>
                  <span className="eyebrow">Score report</span>
                  <strong>Open detailed reading feedback</strong>
                </span>
                <span className="band-chip">{report.scoreLabel}</span>
              </summary>
              <ReadingAssessmentReportPanel report={report} retryHref={retryHref} />
            </details>
          ) : null}
          <details className="student-detail-panel">
            <summary>
              <span>
                <span className="eyebrow">History</span>
                <strong>Open recent attempts</strong>
              </span>
              <span className="band-chip">{recentSavedAttempts.length} saved</span>
            </summary>
            <RecentAttemptsPanel attempts={recentSavedAttempts} activeAttemptId={activeAttemptId} onInspect={handleInspectAttempt} />
          </details>
        </div>
      </section>
    </>
  );
}
