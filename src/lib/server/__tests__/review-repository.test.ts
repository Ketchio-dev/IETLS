import { describe, expect, it } from 'vitest';

import { createReviewItem } from '@/lib/services/review/scheduler';
import type { ReviewItem } from '@/lib/services/review/types';

import { createReviewRepository } from '../review-repository';

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

function buildItem(id: string, dueAt: string): ReviewItem {
  return {
    ...createReviewItem(
      { id, setId: 'set-1', setTitle: 'Set 1', questionId: id, questionType: 'multiple_choice', prompt: 'P' },
      '2026-06-16T00:00:00.000Z',
    ),
    dueAt,
  };
}

describe('review repository', () => {
  it('returns items sorted by due date', async () => {
    const repository = createReviewRepository(createMemoryStorage() as never);

    await repository.upsertItems([
      buildItem('b', '2026-06-18T00:00:00.000Z'),
      buildItem('a', '2026-06-17T00:00:00.000Z'),
    ]);

    const items = await repository.listItems();
    expect(items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('merges updates by id and appends new items', async () => {
    const repository = createReviewRepository(createMemoryStorage() as never);

    await repository.upsertItems([buildItem('a', '2026-06-17T00:00:00.000Z')]);
    await repository.upsertItems([
      { ...buildItem('a', '2026-06-25T00:00:00.000Z'), repetitions: 3 },
      buildItem('c', '2026-06-20T00:00:00.000Z'),
    ]);

    const items = await repository.listItems();
    expect(items.map((item) => item.id)).toEqual(['c', 'a']);
    expect(items.find((item) => item.id === 'a')?.repetitions).toBe(3);
    expect(items).toHaveLength(2);
  });

  it('is a no-op write when given an empty batch', async () => {
    const repository = createReviewRepository(createMemoryStorage() as never);
    await repository.upsertItems([buildItem('a', '2026-06-17T00:00:00.000Z')]);

    const result = await repository.upsertItems([]);

    expect(result.map((item) => item.id)).toEqual(['a']);
  });
});
