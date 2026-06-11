import type { ReadingAssessmentReport, ReadingAttemptSnapshot } from '@/lib/services/reading/types';

export function buildReadingReportAnnouncement({
  activeAttempt,
  isRetryModeActive,
  report,
  retryMissCount,
}: {
  activeAttempt: ReadingAttemptSnapshot | null;
  isRetryModeActive: boolean;
  report: ReadingAssessmentReport | null;
  retryMissCount: number;
}) {
  if (report) {
    return isRetryModeActive
      ? `Retry mode active: ${retryMissCount} missed question${retryMissCount === 1 ? '' : 's'} in focus.`
      : `Reading set scored: ${report.scoreLabel}, ${report.percentage}% accuracy.`;
  }

  return activeAttempt
    ? `Viewing saved attempt ${activeAttempt.report.scoreLabel}.`
    : 'Answer the questions and submit to generate a report.';
}

export function buildReadingHeroActionCopy({
  answeredQuestionCount,
  isRetryModeActive,
  questionCount,
  remainingQuestionCount,
}: {
  answeredQuestionCount: number;
  isRetryModeActive: boolean;
  questionCount: number;
  remainingQuestionCount: number;
}) {
  if (isRetryModeActive) {
    return `${answeredQuestionCount}/${questionCount} retry questions currently answered. Re-score once the weak spots are fixed.`;
  }

  return remainingQuestionCount > 0
    ? `${answeredQuestionCount}/${questionCount} answered · ${remainingQuestionCount} left before your next score pass.`
    : 'All questions answered — score the set when you are ready.';
}

export function buildReadingSubmitButtonLabel({
  canShowFullReview,
  isRetryModeActive,
  isSubmitting,
}: {
  canShowFullReview: boolean;
  isRetryModeActive: boolean;
  isSubmitting: boolean;
}) {
  if (isSubmitting) {
    return 'Scoring…';
  }

  if (isRetryModeActive) {
    return canShowFullReview ? 'Re-score missed questions' : 'Re-score retry set';
  }

  return canShowFullReview ? 'Score this set' : 'Score with blanks';
}

export function buildReadingSubmitCopy({
  isRetryModeActive,
  remainingQuestionCount,
}: {
  isRetryModeActive: boolean;
  remainingQuestionCount: number;
}) {
  if (isRetryModeActive) {
    return remainingQuestionCount > 0
      ? `${remainingQuestionCount} retry question${remainingQuestionCount === 1 ? ' still needs' : 's still need'} attention before this focused re-score.`
      : 'All missed questions are back in view. Re-score to confirm the weak spots are fixed.';
  }

  return remainingQuestionCount > 0
    ? `${remainingQuestionCount} question${remainingQuestionCount === 1 ? '' : 's'} still blank — finish them for the clearest review, or submit now for a quick pacing check.`
    : 'All answers captured. Submit to refresh your score review panel.';
}
