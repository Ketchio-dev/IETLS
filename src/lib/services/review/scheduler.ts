import type { ReviewGrade, ReviewItem, ReviewItemStatus } from './types';

export const INITIAL_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.0;
export const MASTERY_REPETITIONS = 4;
export const MASTERY_INTERVAL_DAYS = 21;

const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 3;
const RELEARN_MINUTES = 10;
const EASE_BONUS_ON_CORRECT = 0.1;
const EASE_PENALTY_ON_MISS = 0.2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * The spaced-repetition scheduling fields shared by every deck (Reading review,
 * vocabulary, ...). The scheduler is generic over anything carrying this state,
 * so a single SM-2-lite engine drives all decks.
 */
export interface SchedulingState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lapses: number;
  status: ReviewItemStatus;
  lastReviewedAt: string | null;
  lastResult: ReviewGrade | null;
  timesSeen: number;
  timesCorrect: number;
  createdAt: string;
  updatedAt: string;
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY).toISOString();
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MS_PER_MINUTE).toISOString();
}

function clampEase(value: number): number {
  return Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, Math.round(value * 100) / 100));
}

function roundInterval(value: number): number {
  return Math.max(1, Math.round(value));
}

function deriveStatus(repetitions: number, intervalDays: number): ReviewItemStatus {
  if (repetitions >= MASTERY_REPETITIONS && intervalDays >= MASTERY_INTERVAL_DAYS) {
    return 'mastered';
  }

  return repetitions === 0 ? 'learning' : 'review';
}

/** Fresh scheduling state: due immediately, in the learning phase. */
export function createSchedulingState(now: string): SchedulingState {
  return {
    repetitions: 0,
    intervalDays: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    dueAt: now,
    lapses: 0,
    status: 'learning',
    lastReviewedAt: null,
    lastResult: null,
    timesSeen: 0,
    timesCorrect: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateReviewItemInput {
  id: string;
  setId: string;
  setTitle: string;
  questionId: string;
  questionType: string;
  prompt: string;
}

/**
 * Build a freshly tracked Reading review item. New items are due immediately so
 * the first review session surfaces them right away.
 */
export function createReviewItem(input: CreateReviewItemInput, now: string): ReviewItem {
  return {
    ...input,
    source: 'reading',
    firstMissedAt: now,
    ...createSchedulingState(now),
  };
}

/**
 * Advance any scheduling state after a graded re-review. A miss resets the
 * streak and resurfaces the item within minutes; a correct answer grows the
 * interval geometrically (1d, 3d, then interval * ease) until it reaches
 * mastery. Pure and deterministic — `now` is injected, never read from a clock.
 */
export function scheduleReviewItem<T extends SchedulingState>(item: T, grade: ReviewGrade, now: string): T {
  const timesSeen = item.timesSeen + 1;

  if (grade === 'incorrect') {
    return {
      ...item,
      repetitions: 0,
      intervalDays: 0,
      easeFactor: clampEase(item.easeFactor - EASE_PENALTY_ON_MISS),
      dueAt: addMinutes(now, RELEARN_MINUTES),
      lapses: item.lapses + 1,
      status: 'learning',
      lastReviewedAt: now,
      lastResult: 'incorrect',
      timesSeen,
      updatedAt: now,
    } as T;
  }

  const repetitions = item.repetitions + 1;
  const easeFactor = clampEase(item.easeFactor + EASE_BONUS_ON_CORRECT);
  const intervalDays =
    repetitions === 1
      ? FIRST_INTERVAL_DAYS
      : repetitions === 2
        ? SECOND_INTERVAL_DAYS
        : roundInterval(item.intervalDays * easeFactor);

  return {
    ...item,
    repetitions,
    intervalDays,
    easeFactor,
    dueAt: addDays(now, intervalDays),
    status: deriveStatus(repetitions, intervalDays),
    lastReviewedAt: now,
    lastResult: 'correct',
    timesSeen,
    timesCorrect: item.timesCorrect + 1,
    updatedAt: now,
  } as T;
}

/** Mastered items leave the active queue; everything else is due once its time passes. */
export function isReviewItemDue(item: Pick<SchedulingState, 'status' | 'dueAt'>, now: string): boolean {
  return item.status !== 'mastered' && item.dueAt <= now;
}
