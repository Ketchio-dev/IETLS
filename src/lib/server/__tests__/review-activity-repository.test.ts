import { describe, expect, it } from 'vitest';

import { createReviewActivityRepository } from '../review-activity-repository';

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

describe('review activity repository', () => {
  it('starts empty', async () => {
    const repository = createReviewActivityRepository(createMemoryStorage() as never);

    expect(await repository.read()).toEqual({ days: {} });
  });

  it('accumulates review counts per UTC date', async () => {
    const repository = createReviewActivityRepository(createMemoryStorage() as never);

    await repository.recordReview('2026-06-16');
    await repository.recordReview('2026-06-16');
    await repository.recordReview('2026-06-15');

    expect((await repository.read()).days).toEqual({ '2026-06-16': 2, '2026-06-15': 1 });
  });
});
