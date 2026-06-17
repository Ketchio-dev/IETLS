import type { ReviewRepository } from '@/lib/server/review-repository';
import type { ReadingAssessmentReport } from '@/lib/services/reading/types';

import { createReviewItem, scheduleReviewItem } from './scheduler';
import type { ReviewItem } from './types';

/** Stable cross-set identity for a tracked question. */
export function buildReviewItemId(setId: string, questionId: string): string {
  return `reading::${setId}::${questionId}`;
}

/**
 * Derive the *new* review items a graded Reading report should add to the deck:
 * questions the learner missed that are not already tracked. Items that are
 * already in the deck are handled by {@link deriveReadingReviewUpdates}, not here.
 */
export function deriveReadingReviewIngest(
  report: ReadingAssessmentReport,
  existingIds: ReadonlySet<string>,
  now: string,
): ReviewItem[] {
  const additions: ReviewItem[] = [];
  const seen = new Set<string>();

  for (const review of report.questionReviews) {
    if (review.isCorrect) {
      continue;
    }

    const id = buildReviewItemId(report.setId, review.questionId);
    if (existingIds.has(id) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    additions.push(
      createReviewItem(
        {
          id,
          setId: report.setId,
          setTitle: report.setTitle,
          questionId: review.questionId,
          questionType: review.type,
          prompt: review.prompt,
        },
        now,
      ),
    );
  }

  return additions;
}

/**
 * Treat normal Reading practice as a retrieval event for questions already in
 * the deck: a correct answer advances the schedule, a miss resets it. Blank
 * answers carry no retrieval signal (a time-pressure skip should not punish
 * existing progress), so they are ignored. Untracked questions are left to
 * {@link deriveReadingReviewIngest}.
 */
export function deriveReadingReviewUpdates(
  report: ReadingAssessmentReport,
  existingById: ReadonlyMap<string, ReviewItem>,
  now: string,
): ReviewItem[] {
  const updates: ReviewItem[] = [];
  const seen = new Set<string>();

  for (const review of report.questionReviews) {
    if (review.userAnswer.trim().length === 0) {
      continue;
    }

    const id = buildReviewItemId(report.setId, review.questionId);
    const existing = existingById.get(id);
    if (!existing || seen.has(id)) {
      continue;
    }

    seen.add(id);
    updates.push(scheduleReviewItem(existing, review.isCorrect ? 'correct' : 'incorrect', now));
  }

  return updates;
}

export interface ReviewIngestResult {
  additions: ReviewItem[];
  updates: ReviewItem[];
}

/**
 * Best-effort persistence for a graded Reading report: add newly missed
 * questions and re-schedule any tracked questions the learner just answered.
 */
export async function ingestReadingReviewItems(
  report: ReadingAssessmentReport,
  now: string,
  reviewRepository: ReviewRepository,
): Promise<ReviewIngestResult> {
  const existing = await reviewRepository.listItems();
  const existingById = new Map(existing.map((item) => [item.id, item] as const));

  const additions = deriveReadingReviewIngest(report, new Set(existingById.keys()), now);
  const updates = deriveReadingReviewUpdates(report, existingById, now);
  const mutations = [...additions, ...updates];

  if (mutations.length > 0) {
    await reviewRepository.upsertItems(mutations);
  }

  return { additions, updates };
}
