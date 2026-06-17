import { isReviewItemDue } from '@/lib/services/review/scheduler';

import type { VocabDeckSummary, VocabReviewItem } from './types';

export function buildVocabDeckSummary(items: VocabReviewItem[], now: string): VocabDeckSummary {
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let nextDueAt: string | null = null;

  for (const item of items) {
    if (isReviewItemDue(item, now)) {
      dueCount += 1;
    }

    if (item.status === 'mastered') {
      masteredCount += 1;
    } else if (item.status === 'learning') {
      learningCount += 1;
    } else {
      reviewCount += 1;
    }

    if (item.status !== 'mastered' && (nextDueAt === null || item.dueAt < nextDueAt)) {
      nextDueAt = item.dueAt;
    }
  }

  return {
    totalTracked: items.length,
    dueCount,
    learningCount,
    reviewCount,
    masteredCount,
    nextDueAt,
  };
}
