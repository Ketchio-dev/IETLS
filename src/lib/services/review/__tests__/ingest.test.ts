import { describe, expect, it, vi } from 'vitest';

import type { ReadingAssessmentReport, ReadingQuestionReview } from '@/lib/services/reading/types';
import type { ReviewItem } from '../types';

import { buildReviewItemId, deriveReadingReviewIngest, ingestReadingReviewItems } from '../ingest';

const NOW = '2026-06-16T00:00:00.000Z';

function review(partial: Partial<ReadingQuestionReview> & { questionId: string; isCorrect: boolean }): ReadingQuestionReview {
  return {
    type: 'true_false_not_given',
    prompt: `Prompt ${partial.questionId}`,
    userAnswer: '',
    acceptedAnswers: ['TRUE'],
    explanation: 'Because.',
    evidenceHint: 'Paragraph 2.',
    ...partial,
  };
}

function buildReport(reviews: ReadingQuestionReview[]): ReadingAssessmentReport {
  return {
    reportId: 'report-1',
    attemptId: 'attempt-1',
    setId: 'set-1',
    setTitle: 'Set One',
    rawScore: reviews.filter((item) => item.isCorrect).length,
    maxScore: reviews.length,
    percentage: 0,
    scoreLabel: 'x',
    summary: 'summary',
    accuracyByQuestionType: [],
    questionReviews: reviews,
    strengths: [],
    risks: [],
    nextSteps: [],
    warnings: [],
    generatedAt: NOW,
  };
}

describe('review ingestion', () => {
  it('creates one item per newly missed question and skips correct ones', () => {
    const report = buildReport([
      review({ questionId: 'q-1', isCorrect: false }),
      review({ questionId: 'q-2', isCorrect: true }),
      review({ questionId: 'q-3', isCorrect: false }),
    ]);

    const additions = deriveReadingReviewIngest(report, new Set(), NOW);

    expect(additions.map((item) => item.questionId)).toEqual(['q-1', 'q-3']);
    expect(additions[0]?.id).toBe(buildReviewItemId('set-1', 'q-1'));
    expect(additions[0]).toMatchObject({ setTitle: 'Set One', status: 'learning', dueAt: NOW });
  });

  it('does not re-add a question that is already tracked', () => {
    const report = buildReport([
      review({ questionId: 'q-1', isCorrect: false }),
      review({ questionId: 'q-2', isCorrect: false }),
    ]);

    const additions = deriveReadingReviewIngest(report, new Set([buildReviewItemId('set-1', 'q-1')]), NOW);

    expect(additions.map((item) => item.questionId)).toEqual(['q-2']);
  });

  it('persists only new items through the repository', async () => {
    const existing: ReviewItem[] = [];
    const repository = {
      listItems: vi.fn(async () => existing),
      upsertItems: vi.fn(async (items: ReviewItem[]) => items),
    };
    const report = buildReport([review({ questionId: 'q-1', isCorrect: false })]);

    const added = await ingestReadingReviewItems(report, NOW, repository);

    expect(added).toHaveLength(1);
    expect(repository.upsertItems).toHaveBeenCalledTimes(1);
  });

  it('skips the write entirely when nothing new was missed', async () => {
    const repository = {
      listItems: vi.fn(async () => []),
      upsertItems: vi.fn(async (items: ReviewItem[]) => items),
    };
    const report = buildReport([review({ questionId: 'q-1', isCorrect: true })]);

    const added = await ingestReadingReviewItems(report, NOW, repository);

    expect(added).toHaveLength(0);
    expect(repository.upsertItems).not.toHaveBeenCalled();
  });
});
