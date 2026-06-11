import { describe, expect, it } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingAttemptSnapshot, ReadingQuestionReview } from '@/lib/services/reading/types';

import {
  buildReadingAttemptResumeHref,
  buildReadingAttemptRetryHref,
  buildReadingRetryQuestionIds,
  countMissedQuestions,
  filterReadingQuestionsForRetry,
  getMissedQuestionIds,
  hasMissedQuestions,
  isReadingRetryModeActive,
} from '../reading-attempt-utils';

const set = sampleReadingSets[0]!;
const reviews: ReadingQuestionReview[] = set.questions.map((question, index) => ({
  questionId: question.id,
  type: question.type,
  prompt: question.prompt,
  userAnswer: index === 2 ? 'FALSE' : 'sample',
  acceptedAnswers: question.acceptedAnswers,
  isCorrect: index !== 2,
  explanation: question.explanation,
  evidenceHint: question.evidenceHint,
}));

function makeAttempt(overrides: Partial<ReadingAttemptSnapshot> = {}): ReadingAttemptSnapshot {
  return {
    attemptId: overrides.attemptId ?? 'attempt-1',
    setId: overrides.setId ?? set.id,
    setTitle: overrides.setTitle ?? set.title,
    createdAt: overrides.createdAt ?? '2026-03-26T12:00:00.000Z',
    timeSpentSeconds: overrides.timeSpentSeconds ?? 320,
    answers: overrides.answers ?? {},
    report: overrides.report ?? {
      reportId: 'report-1',
      attemptId: overrides.attemptId ?? 'attempt-1',
      setId: overrides.setId ?? set.id,
      setTitle: overrides.setTitle ?? set.title,
      rawScore: set.questions.length - 1,
      maxScore: set.questions.length,
      percentage: 83,
      scoreLabel: '5/6',
      summary: 'One missed question remains.',
      accuracyByQuestionType: [],
      questionReviews: reviews,
      strengths: [],
      risks: [],
      nextSteps: [],
      warnings: [],
      generatedAt: '2026-03-26T12:00:00.000Z',
    },
  };
}

describe('reading attempt utils', () => {
  it('builds resume and retry hrefs from encoded attempt identifiers', () => {
    const attempt = makeAttempt({ attemptId: 'attempt 1', setId: 'set/1' });

    expect(buildReadingAttemptResumeHref(attempt)).toBe('/reading?setId=set%2F1&attemptId=attempt%201');
    expect(buildReadingAttemptRetryHref(attempt)).toBe('/reading?setId=set%2F1&attemptId=attempt%201&retry=incorrect');
  });

  it('counts and lists missed question ids', () => {
    expect(getMissedQuestionIds(reviews)).toEqual([set.questions[2]!.id]);
    expect(countMissedQuestions(reviews)).toBe(1);
    expect(hasMissedQuestions(reviews)).toBe(true);
  });

  it('prefers active attempt reviews when building retry question ids', () => {
    const activeAttempt = makeAttempt();
    const report = {
      setId: set.id,
      questionReviews: reviews.map((review) => ({ ...review, isCorrect: review.questionId !== set.questions[3]!.id })),
    };

    expect(buildReadingRetryQuestionIds({
      activeAttempt,
      report,
      retryMode: true,
      selectedSetId: set.id,
    })).toEqual([set.questions[2]!.id]);
  });

  it('falls back to the current report and filters questions in set order', () => {
    const retryQuestionIds = buildReadingRetryQuestionIds({
      activeAttempt: null,
      report: { setId: set.id, questionReviews: reviews },
      retryMode: true,
      selectedSetId: set.id,
    });

    expect(isReadingRetryModeActive(true, retryQuestionIds)).toBe(true);
    expect(filterReadingQuestionsForRetry(set.questions, retryQuestionIds, true).map((question) => question.id)).toEqual([
      set.questions[2]!.id,
    ]);
    expect(filterReadingQuestionsForRetry(set.questions, retryQuestionIds, false)).toHaveLength(set.questions.length);
  });

  it('returns no retry ids when retry mode is off or the selected set differs', () => {
    expect(buildReadingRetryQuestionIds({
      activeAttempt: makeAttempt(),
      report: null,
      retryMode: false,
      selectedSetId: set.id,
    })).toEqual([]);
    expect(buildReadingRetryQuestionIds({
      activeAttempt: makeAttempt(),
      report: null,
      retryMode: true,
      selectedSetId: 'different-set',
    })).toEqual([]);
  });
});
