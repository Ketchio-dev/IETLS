import { describe, expect, it, vi } from 'vitest';

import type { ReadingAssessmentReport, ReadingQuestionReview } from '@/lib/services/reading/types';
import type { ReviewItem } from '../types';

import { createReviewItem } from '../scheduler';
import {
  buildReviewItemId,
  deriveReadingReviewIngest,
  deriveReadingReviewUpdates,
  ingestReadingReviewItems,
} from '../ingest';

function trackedItem(questionId: string): ReviewItem {
  return createReviewItem(
    {
      id: buildReviewItemId('set-1', questionId),
      setId: 'set-1',
      setTitle: 'Set One',
      questionId,
      questionType: 'true_false_not_given',
      prompt: `Prompt ${questionId}`,
    },
    '2026-06-10T00:00:00.000Z',
  );
}

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

    const result = await ingestReadingReviewItems(report, NOW, repository);

    expect(result.additions).toHaveLength(1);
    expect(repository.upsertItems).toHaveBeenCalledTimes(1);
  });

  it('skips the write entirely when nothing new was missed', async () => {
    const repository = {
      listItems: vi.fn(async () => []),
      upsertItems: vi.fn(async (items: ReviewItem[]) => items),
    };
    const report = buildReport([review({ questionId: 'q-1', isCorrect: true })]);

    const result = await ingestReadingReviewItems(report, NOW, repository);

    expect(result.additions).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
    expect(repository.upsertItems).not.toHaveBeenCalled();
  });

  it('advances a tracked item answered correctly during normal practice', () => {
    const existing = trackedItem('q-1');
    const report = buildReport([review({ questionId: 'q-1', isCorrect: true, userAnswer: 'TRUE' })]);

    const updates = deriveReadingReviewUpdates(report, new Map([[existing.id, existing]]), NOW);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ id: existing.id, repetitions: 1, status: 'review', lastResult: 'correct' });
  });

  it('resets a tracked item missed during normal practice', () => {
    const existing = trackedItem('q-1');
    const report = buildReport([review({ questionId: 'q-1', isCorrect: false, userAnswer: 'FALSE' })]);

    const updates = deriveReadingReviewUpdates(report, new Map([[existing.id, existing]]), NOW);

    expect(updates[0]).toMatchObject({ lapses: 1, status: 'learning', lastResult: 'incorrect' });
  });

  it('ignores a blank answer on a tracked item so a skip never punishes progress', () => {
    const existing = trackedItem('q-1');
    const report = buildReport([review({ questionId: 'q-1', isCorrect: false, userAnswer: '   ' })]);

    const updates = deriveReadingReviewUpdates(report, new Map([[existing.id, existing]]), NOW);

    expect(updates).toHaveLength(0);
  });

  it('does not update questions that are not tracked', () => {
    const report = buildReport([review({ questionId: 'q-9', isCorrect: true, userAnswer: 'TRUE' })]);

    const updates = deriveReadingReviewUpdates(report, new Map(), NOW);

    expect(updates).toHaveLength(0);
  });

  it('adds new misses and reschedules tracked answers in a single pass', async () => {
    const existing = trackedItem('q-1');
    const store: ReviewItem[] = [existing];
    const repository = {
      listItems: vi.fn(async () => store),
      upsertItems: vi.fn(async (items: ReviewItem[]) => items),
    };
    const report = buildReport([
      review({ questionId: 'q-1', isCorrect: true, userAnswer: 'TRUE' }),
      review({ questionId: 'q-2', isCorrect: false, userAnswer: 'FALSE' }),
    ]);

    const result = await ingestReadingReviewItems(report, NOW, repository);

    expect(result.additions.map((item) => item.questionId)).toEqual(['q-2']);
    expect(result.updates.map((item) => item.questionId)).toEqual(['q-1']);
    expect(result.updates[0]?.repetitions).toBe(1);
    expect(repository.upsertItems).toHaveBeenCalledTimes(1);
    expect((repository.upsertItems.mock.calls[0]![0] as ReviewItem[])).toHaveLength(2);
  });
});
