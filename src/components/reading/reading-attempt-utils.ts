import type { ImportedReadingQuestion } from '@/lib/services/reading-imports/types';
import type { ReadingAttemptSnapshot, ReadingQuestionReview } from '@/lib/services/reading/types';

export function buildReadingAttemptHref(setId: string, attemptId: string) {
  return `/reading?setId=${encodeURIComponent(setId)}&attemptId=${encodeURIComponent(attemptId)}`;
}

export function buildReadingRetryHref(setId: string, attemptId: string) {
  return `${buildReadingAttemptHref(setId, attemptId)}&retry=incorrect`;
}

export function countMissedQuestions(questionReviews: ReadingQuestionReview[]) {
  let missedCount = 0;

  for (const review of questionReviews) {
    if (!review.isCorrect) {
      missedCount += 1;
    }
  }

  return missedCount;
}

export function hasMissedQuestions(questionReviews: ReadingQuestionReview[]) {
  return questionReviews.some((review) => !review.isCorrect);
}

export function getMissedQuestionIds(questionReviews: ReadingQuestionReview[]) {
  const missedQuestionIds: string[] = [];

  for (const review of questionReviews) {
    if (!review.isCorrect) {
      missedQuestionIds.push(review.questionId);
    }
  }

  return missedQuestionIds;
}

export function buildReadingRetryQuestionIds({
  activeAttempt,
  report,
  retryMode,
  selectedSetId,
}: {
  activeAttempt: ReadingAttemptSnapshot | null;
  report: { setId: string; questionReviews: ReadingQuestionReview[] } | null;
  retryMode: boolean;
  selectedSetId: string | null;
}) {
  if (!retryMode || !selectedSetId) {
    return [];
  }

  const sourceReviews =
    activeAttempt?.setId === selectedSetId
      ? activeAttempt.report.questionReviews
      : report?.setId === selectedSetId
        ? report.questionReviews
        : [];

  return getMissedQuestionIds(sourceReviews);
}

export function isReadingRetryModeActive(retryMode: boolean, retryQuestionIds: string[]) {
  return retryMode && retryQuestionIds.length > 0;
}

export function filterReadingQuestionsForRetry(
  questions: ImportedReadingQuestion[],
  retryQuestionIds: string[],
  retryModeActive: boolean,
) {
  if (!retryModeActive) {
    return questions;
  }

  const retryIdSet = new Set(retryQuestionIds);
  return questions.filter((question) => retryIdSet.has(question.id));
}

export function buildReadingAttemptResumeHref(attempt: ReadingAttemptSnapshot) {
  return buildReadingAttemptHref(attempt.setId, attempt.attemptId);
}

export function buildReadingAttemptRetryHref(attempt: ReadingAttemptSnapshot) {
  return buildReadingRetryHref(attempt.setId, attempt.attemptId);
}
