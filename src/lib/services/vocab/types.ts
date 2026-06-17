import type { SchedulingState } from '@/lib/services/review/scheduler';
import type { ReviewItemStatus } from '@/lib/services/review/types';

export interface VocabWord {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  /** Three plausible-but-wrong definitions used as multiple-choice distractors. */
  distractors: string[];
}

/** A vocabulary card tracked on the shared spaced-repetition schedule. */
export interface VocabReviewItem extends SchedulingState {
  id: string;
  source: 'vocab';
  wordId: string;
  word: string;
}

/** Client-safe view of a due card. The correct option is not marked — grading is server-side. */
export interface VocabCardView {
  itemId: string;
  wordId: string;
  word: string;
  partOfSpeech: string;
  options: string[];
  status: ReviewItemStatus;
  dueAt: string;
}

export interface VocabDeckSummary {
  totalTracked: number;
  dueCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  nextDueAt: string | null;
}

export interface VocabPageData {
  summary: VocabDeckSummary;
  dueCards: VocabCardView[];
  generatedAt: string;
}

export interface SubmitVocabReviewInput {
  itemId?: unknown;
  answer?: unknown;
}

export interface VocabReviewRevealed {
  itemId: string;
  word: string;
  isCorrect: boolean;
  submittedAnswer: string;
  correctDefinition: string;
  example: string;
  status: ReviewItemStatus;
  nextDueAt: string;
  intervalDays: number;
  remainingDueCount: number;
}

export type SubmitVocabReviewResult =
  | { ok: true; payload: VocabReviewRevealed }
  | { ok: false; error: string; status: 400 | 404 };
