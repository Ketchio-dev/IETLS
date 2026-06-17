export type ReviewItemSource = 'reading';
export type ReviewItemStatus = 'learning' | 'review' | 'mastered';
export type ReviewGrade = 'correct' | 'incorrect';

/**
 * A single spaced-repetition review item. One item tracks one previously missed
 * question (identified across sets by `id`) plus its scheduling state. Items are
 * created by ingestion when a Reading attempt records a miss, then promoted or
 * demoted by {@link scheduleReviewItem} as the learner re-answers them.
 */
export interface ReviewItem {
  id: string;
  source: ReviewItemSource;
  setId: string;
  setTitle: string;
  questionId: string;
  questionType: string;
  prompt: string;
  /** Consecutive correct re-reviews. Resets to 0 on any miss. */
  repetitions: number;
  /** Current spacing interval in days. */
  intervalDays: number;
  /** SM-2-style ease factor, clamped between MIN and MAX. */
  easeFactor: number;
  /** ISO timestamp when this item next becomes due. */
  dueAt: string;
  /** How many times the learner has lapsed (missed after first learning it). */
  lapses: number;
  status: ReviewItemStatus;
  lastReviewedAt: string | null;
  lastResult: ReviewGrade | null;
  firstMissedAt: string;
  timesSeen: number;
  timesCorrect: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-safe projection of a due item. Deliberately omits accepted answers so
 * the practice shell cannot leak the answer key — grading stays server-side.
 */
export interface ReviewQuestionView {
  itemId: string;
  setId: string;
  setTitle: string;
  questionId: string;
  type: string;
  prompt: string;
  options: string[];
  evidenceHint: string;
  status: ReviewItemStatus;
  lapses: number;
  dueAt: string;
}

export interface ReviewTypeWeakness {
  type: string;
  tracked: number;
  due: number;
  mastered: number;
}

export interface ReviewDeckSummary {
  totalTracked: number;
  dueCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  nextDueAt: string | null;
  weakestType: ReviewTypeWeakness | null;
  typeBreakdown: ReviewTypeWeakness[];
}

export interface ReviewPageData {
  summary: ReviewDeckSummary;
  dueQuestions: ReviewQuestionView[];
  generatedAt: string;
}

export interface SubmitReviewResultInput {
  itemId?: unknown;
  answer?: unknown;
}

export interface ReviewResultRevealed {
  itemId: string;
  isCorrect: boolean;
  submittedAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  evidenceHint: string;
  status: ReviewItemStatus;
  nextDueAt: string;
  intervalDays: number;
  remainingDueCount: number;
}

export type SubmitReviewResultResult =
  | { ok: true; payload: ReviewResultRevealed }
  | { ok: false; error: string; status: 400 | 404 };

export interface ReviewDueForecast {
  dueNow: number;
  next24h: number;
  next7d: number;
  later: number;
}

export interface ReviewTypeProgress {
  type: string;
  tracked: number;
  mastered: number;
  due: number;
  masteryPct: number;
  accuracyPct: number | null;
}

export interface ReviewActivity {
  totalReviews: number;
  totalCorrect: number;
  accuracyPct: number | null;
  totalLapses: number;
  lastReviewedAt: string | null;
}

export interface ReviewDashboardData {
  summary: ReviewDeckSummary;
  forecast: ReviewDueForecast;
  typeProgress: ReviewTypeProgress[];
  activity: ReviewActivity;
  masteryPct: number;
  generatedAt: string;
}
