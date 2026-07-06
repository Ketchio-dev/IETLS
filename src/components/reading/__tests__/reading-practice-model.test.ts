import { describe, expect, it } from 'vitest';

import type { ReadingAssessmentReport, ReadingAttemptSnapshot } from '@/lib/services/reading/types';

import {
  buildReadingHeroActionCopy,
  buildReadingPaceSummary,
  buildReadingReportAnnouncement,
  buildReadingSubmitButtonLabel,
  buildReadingSubmitCopy,
} from '../reading-practice-model';

const report: ReadingAssessmentReport = {
  reportId: 'report-1',
  attemptId: 'attempt-1',
  setId: 'set-1',
  setTitle: 'Sample set',
  rawScore: 5,
  maxScore: 6,
  percentage: 83,
  scoreLabel: '5/6',
  summary: 'One miss remains.',
  accuracyByQuestionType: [],
  questionReviews: [],
  strengths: [],
  risks: [],
  nextSteps: [],
  warnings: [],
  generatedAt: '2026-03-26T12:00:00.000Z',
};

const attempt: ReadingAttemptSnapshot = {
  attemptId: 'attempt-1',
  setId: 'set-1',
  setTitle: 'Sample set',
  createdAt: '2026-03-26T12:00:00.000Z',
  timeSpentSeconds: 320,
  answers: {},
  report,
};

describe('reading practice model', () => {
  it('builds report announcements for scoring, retry, saved-attempt, and empty states', () => {
    expect(buildReadingReportAnnouncement({
      activeAttempt: null,
      isRetryModeActive: false,
      report,
      retryMissCount: 1,
    })).toBe('Reading set scored: 5/6, 83% accuracy.');
    expect(buildReadingReportAnnouncement({
      activeAttempt: attempt,
      isRetryModeActive: true,
      report,
      retryMissCount: 2,
    })).toBe('Retry mode active: 2 missed questions in focus.');
    expect(buildReadingReportAnnouncement({
      activeAttempt: attempt,
      isRetryModeActive: false,
      report: null,
      retryMissCount: 0,
    })).toBe('Viewing saved attempt 5/6.');
    expect(buildReadingReportAnnouncement({
      activeAttempt: null,
      isRetryModeActive: false,
      report: null,
      retryMissCount: 0,
    })).toBe('Answer the questions and submit to generate a report.');
  });

  it('builds hero and submit copy for full-set and retry flows', () => {
    expect(buildReadingHeroActionCopy({
      answeredQuestionCount: 2,
      isRetryModeActive: false,
      questionCount: 6,
      remainingQuestionCount: 4,
    })).toBe('2/6 answered · 4 left before your next score pass.');
    expect(buildReadingHeroActionCopy({
      answeredQuestionCount: 1,
      isRetryModeActive: true,
      questionCount: 2,
      remainingQuestionCount: 1,
    })).toBe('1/2 retry questions currently answered. Re-score once the weak spots are fixed.');
    expect(buildReadingSubmitCopy({ isRetryModeActive: false, remainingQuestionCount: 0 })).toBe(
      'All answers captured. Submit to refresh your score review panel.',
    );
    expect(buildReadingSubmitCopy({ isRetryModeActive: true, remainingQuestionCount: 1 })).toBe(
      '1 retry question still needs attention before this focused re-score.',
    );
  });

  it('builds submit button labels from score state', () => {
    expect(buildReadingSubmitButtonLabel({
      canShowFullReview: false,
      isRetryModeActive: false,
      isSubmitting: false,
    })).toBe('Score with blanks');
    expect(buildReadingSubmitButtonLabel({
      canShowFullReview: true,
      isRetryModeActive: true,
      isSubmitting: false,
    })).toBe('Re-score missed questions');
    expect(buildReadingSubmitButtonLabel({
      canShowFullReview: true,
      isRetryModeActive: false,
      isSubmitting: true,
    })).toBe('Scoring…');
  });

  it('builds IELTS reading pace summaries for normal and retry practice', () => {
    expect(buildReadingPaceSummary({
      answeredQuestionCount: 1,
      elapsedSeconds: 60,
      isRetryModeActive: false,
      questionCount: 6,
    })).toEqual({
      label: 'On pace',
      detail: '8m target time left at 90s per question.',
    });
    expect(buildReadingPaceSummary({
      answeredQuestionCount: 0,
      elapsedSeconds: 210,
      isRetryModeActive: false,
      questionCount: 6,
    })).toEqual({
      label: 'Behind pace',
      detail: '5m 30s target time left. Move on after one evidence check.',
    });
    expect(buildReadingPaceSummary({
      answeredQuestionCount: 2,
      elapsedSeconds: 30,
      isRetryModeActive: true,
      questionCount: 2,
    })).toEqual({
      label: 'Ready to score',
      detail: 'Target window was 3m for this retry.',
    });
  });
});
