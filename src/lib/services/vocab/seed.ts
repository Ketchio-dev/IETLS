import { createSchedulingState } from '@/lib/services/review/scheduler';

import type { VocabReviewItem, VocabWord } from './types';

export function buildVocabItemId(wordId: string): string {
  return `vocab::${wordId}`;
}

/**
 * Lazily seed the deck from the bundled wordlist: any word the learner is not
 * yet tracking becomes a new card, due immediately. Newly added bundled words
 * therefore appear automatically on the next visit.
 */
export function deriveVocabSeed(
  words: VocabWord[],
  existingIds: ReadonlySet<string>,
  now: string,
): VocabReviewItem[] {
  const additions: VocabReviewItem[] = [];

  for (const word of words) {
    const id = buildVocabItemId(word.id);
    if (existingIds.has(id)) {
      continue;
    }

    additions.push({
      id,
      source: 'vocab',
      wordId: word.id,
      word: word.word,
      ...createSchedulingState(now),
    });
  }

  return additions;
}
