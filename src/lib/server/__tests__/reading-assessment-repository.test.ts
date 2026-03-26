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
  return {
    storage: {
      readJsonFile: async <T,>(file: string, fallback: T) =>
        files.has(file) ? (structuredClone(files.get(file)) as T) : fallback,
      writeJsonFile: async <T,>(file: string, value: T) => {
        files.set(file, structuredClone(value));
        return String(file);
      },
    },
  };
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
    const { storage } = createMemoryStorage();
    mocks.readCompiledReadingPrivateBank.mockResolvedValue({
      version: 1,
      importedAt: null,
      sourceDir: 'x',
      sourceFiles: [],
      sets: [],
    });
    const repository = createReadingAssessmentRepository(storage as never);

    const sets = await repository.listSets();

    expect(sets).toHaveLength(1);
    expect(sets[0]?.id).toBe(sampleReadingSets[0]?.id);
  });

  it('persists attempts in reverse chronological order', async () => {
    const { storage } = createMemoryStorage();
    mocks.readCompiledReadingPrivateBank.mockResolvedValue({
      version: 1,
      importedAt: null,
      sourceDir: 'x',
      sourceFiles: [],
      sets: [],
    });
    const repository = createReadingAssessmentRepository(storage as never);

    await repository.saveAttempt(buildAttempt('older', '2026-03-26T10:00:00.000Z', 50, 600));
    const saved = await repository.saveAttempt(buildAttempt('newer', '2026-03-26T11:00:00.000Z', 83, 500));

    expect(saved.map((attempt) => attempt.attemptId)).toEqual(['newer', 'older']);
  });
});
