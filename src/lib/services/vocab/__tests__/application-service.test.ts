import { describe, expect, it } from 'vitest';

import { createVocabApplicationService } from '../application-service';
import { buildVocabItemId } from '../seed';
import type { VocabReviewItem, VocabWord } from '../types';

const WORDS: VocabWord[] = [
  {
    id: 'w1',
    word: 'mitigate',
    partOfSpeech: 'verb',
    definition: 'to make less severe',
    example: 'example one',
    distractors: ['d1', 'd2', 'd3'],
  },
  {
    id: 'w2',
    word: 'salient',
    partOfSpeech: 'adjective',
    definition: 'most noticeable',
    example: 'example two',
    distractors: ['d4', 'd5', 'd6'],
  },
];

function createMemoryVocabRepository(initial: VocabReviewItem[] = []) {
  let items = initial.map((item) => ({ ...item }));
  return {
    listItems: async () => items.map((item) => ({ ...item })),
    upsertItems: async (incoming: VocabReviewItem[]) => {
      const byId = new Map(incoming.map((item) => [item.id, { ...item }] as const));
      items = items.map((item) => byId.get(item.id) ?? item);
      const ids = new Set(items.map((item) => item.id));
      for (const item of incoming) {
        if (!ids.has(item.id)) {
          items.push({ ...item });
        }
      }
      return items.map((item) => ({ ...item }));
    },
  };
}

function createMemoryActivityRepository() {
  const days: Record<string, number> = {};
  return {
    days,
    repository: {
      read: async () => ({ days: { ...days } }),
      recordReview: async (dateKey: string) => {
        days[dateKey] = (days[dateKey] ?? 0) + 1;
      },
    },
  };
}

describe('vocab application service', () => {
  it('seeds the deck from the wordlist and surfaces due cards without marking the answer', async () => {
    const service = createVocabApplicationService({
      vocabRepository: createMemoryVocabRepository(),
      reviewActivityRepository: createMemoryActivityRepository().repository,
      words: WORDS,
      now: () => '2026-06-16T00:00:00.000Z',
    });

    const data = await service.loadPageData();

    expect(data.summary.totalTracked).toBe(2);
    expect(data.dueCards).toHaveLength(2);
    const card = data.dueCards[0]!;
    expect(card.options).toHaveLength(4);
    expect(card).not.toHaveProperty('definition');
    const word = WORDS.find((entry) => entry.id === card.wordId)!;
    expect(card.options).toContain(word.definition);
  });

  it('grades a correct answer, schedules it forward, and logs shared review activity', async () => {
    const vocabRepository = createMemoryVocabRepository();
    const activity = createMemoryActivityRepository();
    const service = createVocabApplicationService({
      vocabRepository,
      reviewActivityRepository: activity.repository,
      words: WORDS,
      now: () => '2026-06-16T00:00:00.000Z',
    });
    await service.loadPageData();

    const result = await service.submitResult({ itemId: buildVocabItemId('w1'), answer: 'to make less severe' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.payload.isCorrect).toBe(true);
    expect(result.payload.correctDefinition).toBe('to make less severe');
    expect(activity.days['2026-06-16']).toBe(1);

    const stored = await vocabRepository.listItems();
    expect(stored.find((item) => item.id === buildVocabItemId('w1'))).toMatchObject({ repetitions: 1, status: 'review' });
  });

  it('grades a wrong answer as a lapse', async () => {
    const vocabRepository = createMemoryVocabRepository();
    const service = createVocabApplicationService({
      vocabRepository,
      reviewActivityRepository: createMemoryActivityRepository().repository,
      words: WORDS,
      now: () => '2026-06-16T00:00:00.000Z',
    });
    await service.loadPageData();

    const result = await service.submitResult({ itemId: buildVocabItemId('w1'), answer: 'd1' });

    expect(result.ok && result.payload.isCorrect).toBe(false);
    const stored = await vocabRepository.listItems();
    expect(stored.find((item) => item.id === buildVocabItemId('w1'))).toMatchObject({ status: 'learning', lapses: 1 });
  });

  it('rejects unknown and missing item ids', async () => {
    const service = createVocabApplicationService({
      vocabRepository: createMemoryVocabRepository(),
      reviewActivityRepository: createMemoryActivityRepository().repository,
      words: WORDS,
      now: () => '2026-06-16T00:00:00.000Z',
    });

    expect(await service.submitResult({ itemId: 'vocab::missing', answer: 'x' })).toEqual({
      ok: false,
      error: 'Unknown vocab item.',
      status: 404,
    });
    expect(await service.submitResult({ answer: 'x' })).toEqual({
      ok: false,
      error: 'Provide the vocab itemId.',
      status: 400,
    });
  });
});
