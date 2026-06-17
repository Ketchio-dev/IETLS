import type { ReviewRepository } from '@/lib/server/review-repository';
import type { ReadingAssessmentReport } from '@/lib/services/reading/types';

import { createReviewItem } from './scheduler';
import type { ReviewItem } from './types';

/** Stable cross-set identity for a tracked question. */
export function buildReviewItemId(setId: string, questionId: string): string {
  return `reading::${setId}::${questionId}`;
}

/**
 * Derive the review items a graded Reading report should add to the deck.
 *
 * Phase-1 boundary: ingestion only *adds* questions the learner missed and that
 * are not already tracked. It never mutates an already-scheduled item — grading
 * that advances or resets the schedule happens exclusively in dedicated review
 * sessions, so a stray correct/incorrect answer during normal practice cannot
 * silently disturb the spacing.
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
 * Best-effort persistence wrapper used by the Reading submit flow. Returns the
 * newly-added items (empty when nothing new was missed).
 */
export async function ingestReadingReviewItems(
  report: ReadingAssessmentReport,
  now: string,
  reviewRepository: ReviewRepository,
): Promise<ReviewItem[]> {
  const existing = await reviewRepository.listItems();
  const additions = deriveReadingReviewIngest(report, new Set(existing.map((item) => item.id)), now);

  if (additions.length > 0) {
    await reviewRepository.upsertItems(additions);
  }

  return additions;
}
