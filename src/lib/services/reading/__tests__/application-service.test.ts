import { describe, expect, it } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingAttemptSnapshot } from '@/lib/services/reading/types';
import { createReadingApplicationService } from '../application-service';

function createRepository() {
  const attempts: ReadingAttemptSnapshot[] = [];
  const set = sampleReadingSets[0]!;
  return {
    repository: {
      readImportedBank: async () => ({
        version: 1,
        importedAt: set.importedAt,
        sourceDir: 'data/private-reading-imports',
        sourceFiles: [set.sourceFile],
        sets: [set],
      }),
      listSets: async () => [set],
      getSet: async (setId: string) => (setId === set.id ? set : null),
      listSavedAttempts: async () => attempts,
      saveAttempt: async (attempt: ReadingAttemptSnapshot) => {
        attempts.unshift(attempt);
        return attempts;
      },
    },
    attempts,
  };
}

describe('reading application service', () => {
  it('loads a real passage-centred reading set', async () => {
    const { repository } = createRepository();
    const service = createReadingApplicationService({ repository: repository as never });

    const pageData = await service.loadPracticePageData({});

    expect(pageData.activeSet?.title).toBe(sampleReadingSets[0]?.title);
    expect(pageData.activeSet?.questions).toHaveLength(6);
    expect(pageData.availableSets[0]?.types).toContain('true_false_not_given');
  });

  it('scores supported answers deterministically and includes evidence-backed review', async () => {
    const { repository } = createRepository();
    const service = createReadingApplicationService({ repository: repository as never, now: () => '2026-03-26T12:00:00.000Z' });
    const set = sampleReadingSets[0]!;

    const result = await service.submitAssessment({
      setId: set.id,
      timeSpentSeconds: 540,
      answers: {
        [set.questions[0]!.id]: 'C',
        [set.questions[1]!.id]: 'FALSE',
        [set.questions[2]!.id]: 'TRUE',
        [set.questions[3]!.id]: 'water points',
        [set.questions[4]!.id]: 'B',
        [set.questions[5]!.id]: 'system',
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.payload.report.rawScore).toBe(5);
    expect(result.payload.report.questionReviews[2]?.isCorrect).toBe(false);
    expect(result.payload.report.questionReviews[0]?.evidenceHint).toContain('Paragraph');
    expect(result.payload.attempt.timeSpentSeconds).toBe(540);
  });

  it('rejects malformed reading submissions', async () => {
    const { repository } = createRepository();
    const service = createReadingApplicationService({ repository: repository as never });

    const result = await service.submitAssessment({ setId: 'urban-bee-corridors', answers: null });

    expect(result).toEqual({
      ok: false,
      error: 'Provide a setId and an answers object for the Reading drill.',
      status: 400,
    });
  });

  it('returns 404 for an unknown set id', async () => {
    const { repository } = createRepository();
    const service = createReadingApplicationService({ repository: repository as never });

    const result = await service.submitAssessment({
      setId: 'missing-set',
      answers: {},
      timeSpentSeconds: 120,
    });

    expect(result).toEqual({
      ok: false,
      error: 'Unknown Reading set requested.',
      status: 404,
    });
  });
});
