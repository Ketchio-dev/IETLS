import { describe, expect, it } from 'vitest';

import { createSchedulingState } from '@/lib/services/review/scheduler';
import type { VocabReviewItem } from '@/lib/services/vocab/types';

import { createVocabReviewRepository } from '../vocab-review-repository';

function createMemoryStorage() {
  const files = new Map<string, unknown>();

  return {
    readJsonFile: async <T,>(file: string, fallback: T) =>
      files.has(file) ? (structuredClone(files.get(file)) as T) : fallback,
    writeJsonFile: async <T,>(file: string, value: T) => {
      files.set(file, structuredClone(value));
      return String(file);
    },
    updateJsonFile: async <T,>(file: string, fallback: T, update: (current: T) => Promise<T> | T) => {
      const current = files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
      const next = await update(structuredClone(current));
      files.set(file, structuredClone(next));
      return next;
    },
  };
}

function buildItem(id: string, dueAt: string): VocabReviewItem {
  return {
    id,
    source: 'vocab',
    wordId: id,
    word: id,
    ...createSchedulingState('2026-06-16T00:00:00.000Z'),
    dueAt,
  };
}

describe('vocab review repository', () => {
  it('returns items sorted by due date', async () => {
    const repository = createVocabReviewRepository(createMemoryStorage() as never);

    await repository.upsertItems([
      buildItem('vocab::b', '2026-06-18T00:00:00.000Z'),
      buildItem('vocab::a', '2026-06-17T00:00:00.000Z'),
    ]);

    const items = await repository.listItems();
    expect(items.map((item) => item.id)).toEqual(['vocab::a', 'vocab::b']);
  });

  it('merges updates by id and appends new items', async () => {
    const repository = createVocabReviewRepository(createMemoryStorage() as never);

    await repository.upsertItems([buildItem('vocab::a', '2026-06-17T00:00:00.000Z')]);
    await repository.upsertItems([
      { ...buildItem('vocab::a', '2026-06-25T00:00:00.000Z'), repetitions: 2 },
      buildItem('vocab::c', '2026-06-20T00:00:00.000Z'),
    ]);

    const items = await repository.listItems();
    expect(items.map((item) => item.id)).toEqual(['vocab::c', 'vocab::a']);
    expect(items.find((item) => item.id === 'vocab::a')?.repetitions).toBe(2);
  });
});
