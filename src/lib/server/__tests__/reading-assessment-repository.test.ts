import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingAttemptSnapshot } from '@/lib/services/reading/types';

import { createReadingAssessmentRepository } from '../reading-assessment-repository';

const mocks = vi.hoisted(() => ({
  readCompiledReadingPrivateBank: vi.fn(),
}));

vi.mock('@/lib/server/reading-private-import-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/reading-private-import-repository')>(
    '@/lib/server/reading-private-import-repository',
  );

  return {
    ...actual,
    readCompiledReadingPrivateBank: mocks.readCompiledReadingPrivateBank,
  };
});

function createMemoryStorage() {
  const files = new Map<string, unknown>();
  const queues = new Map<string, Promise<void>>();

  function queueWrite<T>(file: string, operation: () => Promise<T>) {
    const previous = queues.get(file) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const release = current.then(
      () => undefined,
      () => undefined,
    );

    queues.set(file, release);
    void release.finally(() => {
      if (queues.get(file) === release) {
        queues.delete(file);
      }
    });

    return current;
  }

  return {
    storage: {
      readJsonFile: async <T,>(file: string, fallback: T) =>
        files.has(file) ? (structuredClone(files.get(file)) as T) : fallback,
      writeJsonFile: async <T,>(file: string, value: T) => {
        return queueWrite(file, async () => {
          files.set(file, structuredClone(value));
          return String(file);
        });
      },
      updateJsonFile: async <T,>(file: string, fallback: T, update: (current: T) => Promise<T> | T) =>
        queueWrite(file, async () => {
          const current = files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
          const next = await update(structuredClone(current));
          files.set(file, structuredClone(next));
          return next;
        }),
      readFile: () => undefined,
      files,
    },
  };
}

function createBankFixture() {
  return {
    version: 1,
    importedAt: null,
    sourceDir: 'x',
    sourceFiles: [],
    sets: [],
  };
}

function createRepositoryWithBundledFallback() {
  const { storage } = createMemoryStorage();
  mocks.readCompiledReadingPrivateBank.mockResolvedValue(createBankFixture());
  return createReadingAssessmentRepository(storage as never, { demoSeedsEnabled: true });
}

function buildAttempt(id: string, createdAt: string, percentage: number, timeSpentSeconds: number): ReadingAttemptSnapshot {
  const set = sampleReadingSets[0]!;
  return {
    attemptId: id,
    setId: set.id,
    setTitle: set.title,
    createdAt,
    timeSpentSeconds,
    answers: {},
    report: {
      reportId: `${id}-report`,
      attemptId: id,
      setId: set.id,
      setTitle: set.title,
      rawScore: percentage >= 80 ? 5 : 3,
      maxScore: set.questions.length,
      percentage,
      scoreLabel: percentage >= 80 ? '5/6' : '3/6',
      summary: 'summary',
      accuracyByQuestionType: [
        { type: 'multiple_choice', correct: 2, total: 2, accuracy: 100 },
        { type: 'true_false_not_given', correct: 1, total: 2, accuracy: 50 },
      ],
      questionReviews: [],
      strengths: [],
      risks: [],
      nextSteps: [],
      warnings: [],
      generatedAt: createdAt,
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('reading assessment repository', () => {
  it('falls back to the bundled reviewed set when no private import exists', async () => {
    const repository = createRepositoryWithBundledFallback();

    const sets = await repository.listSets();

    expect(sets).toHaveLength(1);
    expect(sets[0]?.id).toBe(sampleReadingSets[0]?.id);
  });

  it('returns an empty bank in production-safe mode when no private import exists', async () => {
    const { storage } = createMemoryStorage();
    mocks.readCompiledReadingPrivateBank.mockResolvedValue(createBankFixture());
    const repository = createReadingAssessmentRepository(storage as never, { demoSeedsEnabled: false });

    const sets = await repository.listSets();

    expect(sets).toEqual([]);
  });

  it('persists attempts in reverse chronological order', async () => {
    const repository = createRepositoryWithBundledFallback();

    await repository.saveAttempt(buildAttempt('older', '2026-03-26T10:00:00.000Z', 50, 600));
    const saved = await repository.saveAttempt(buildAttempt('newer', '2026-03-26T11:00:00.000Z', 83, 500));

    expect(saved.map((attempt) => attempt.attemptId)).toEqual(['newer', 'older']);
  });

  it('preserves concurrent saves without losing earlier reading attempts', async () => {
    const repository = createRepositoryWithBundledFallback();

    await Promise.all([
      repository.saveAttempt(buildAttempt('first', '2026-03-26T10:00:00.000Z', 50, 600)),
      repository.saveAttempt(buildAttempt('second', '2026-03-26T11:00:00.000Z', 83, 500)),
    ]);

    const saved = await repository.listSavedAttempts(10);

    expect(saved.map((attempt) => attempt.attemptId)).toEqual(['second', 'first']);
  });
});
