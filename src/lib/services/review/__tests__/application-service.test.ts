import { describe, expect, it } from 'vitest';

import type { ReadingAssessmentRepository } from '@/lib/server/reading-assessment-repository';
import type { ReviewRepository } from '@/lib/server/review-repository';
import { sampleReadingSets } from '@/lib/fixtures/reading';

import { buildReviewDeckSummary, createReviewApplicationService } from '../application-service';
import { createReviewItem, scheduleReviewItem } from '../scheduler';
import type { ReviewItem } from '../types';

const SET = sampleReadingSets[0]!;
const Q0 = SET.questions[0]!;

function trackedItem(now: string): ReviewItem {
  return createReviewItem(
    {
      id: `reading::${SET.id}::${Q0.id}`,
      setId: SET.id,
      setTitle: SET.title,
      questionId: Q0.id,
      questionType: Q0.type,
      prompt: Q0.prompt,
    },
    now,
  );
}

function createMemoryReviewRepository(initial: ReviewItem[] = []): ReviewRepository {
  let items = initial.map((item) => ({ ...item }));

  return {
    listItems: async () => items.map((item) => ({ ...item })),
    upsertItems: async (incoming) => {
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

function createMemoryActivityRepository(initial: Record<string, number> = {}) {
  const days: Record<string, number> = { ...initial };
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

const readingRepositoryStub = {
  getSet: async (setId: string) => (setId === SET.id ? SET : null),
} as unknown as ReadingAssessmentRepository;

describe('review application service', () => {
  it('reconstructs due questions without leaking the answer key', async () => {
    const reviewRepository = createMemoryReviewRepository([trackedItem('2026-06-16T00:00:00.000Z')]);
    const service = createReviewApplicationService({
      reviewRepository,
      readingRepository: readingRepositoryStub,
      now: () => '2026-06-16T01:00:00.000Z',
    });

    const data = await service.loadReviewPageData();

    expect(data.dueQuestions).toHaveLength(1);
    expect(data.dueQuestions[0]).not.toHaveProperty('acceptedAnswers');
    expect(data.dueQuestions[0]?.questionId).toBe(Q0.id);
    expect(data.summary.dueCount).toBe(1);
  });

  it('grades a correct review, reveals the key, and schedules it forward', async () => {
    const reviewRepository = createMemoryReviewRepository([trackedItem('2026-06-16T00:00:00.000Z')]);
    const activity = createMemoryActivityRepository();
    const service = createReviewApplicationService({
      reviewRepository,
      readingRepository: readingRepositoryStub,
      reviewActivityRepository: activity.repository,
      now: () => '2026-06-16T00:00:00.000Z',
    });

    const result = await service.submitReviewResult({
      itemId: `reading::${SET.id}::${Q0.id}`,
      answer: Q0.acceptedAnswers[0],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.payload.isCorrect).toBe(true);
    expect(result.payload.acceptedAnswers.length).toBeGreaterThan(0);
    expect(result.payload.remainingDueCount).toBe(0);

    const stored = await reviewRepository.listItems();
    expect(stored[0]).toMatchObject({ repetitions: 1, status: 'review', timesCorrect: 1 });
    expect(activity.days['2026-06-16']).toBe(1);
  });

  it('grades a wrong answer as a lapse that stays due', async () => {
    const reviewRepository = createMemoryReviewRepository([trackedItem('2026-06-16T00:00:00.000Z')]);
    const service = createReviewApplicationService({
      reviewRepository,
      readingRepository: readingRepositoryStub,
      reviewActivityRepository: createMemoryActivityRepository().repository,
      now: () => '2026-06-16T00:00:00.000Z',
    });

    const result = await service.submitReviewResult({
      itemId: `reading::${SET.id}::${Q0.id}`,
      answer: 'definitely-not-the-answer-zzz',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.payload.isCorrect).toBe(false);

    const stored = await reviewRepository.listItems();
    expect(stored[0]).toMatchObject({ status: 'learning', lapses: 1 });
  });

  it('rejects an unknown item id', async () => {
    const service = createReviewApplicationService({
      reviewRepository: createMemoryReviewRepository([]),
      readingRepository: readingRepositoryStub,
    });

    const result = await service.submitReviewResult({ itemId: 'missing', answer: 'x' });

    expect(result).toEqual({ ok: false, error: 'Unknown review item.', status: 404 });
  });

  it('rejects a missing item id', async () => {
    const service = createReviewApplicationService({
      reviewRepository: createMemoryReviewRepository([]),
      readingRepository: readingRepositoryStub,
    });

    const result = await service.submitReviewResult({ answer: 'x' });

    expect(result).toEqual({ ok: false, error: 'Provide the review itemId.', status: 400 });
  });

  it('summarizes deck status, due counts, and the weakest type', () => {
    const base = '2026-06-16T00:00:00.000Z';
    const dueLearning = trackedItem(base);
    const mastered = (() => {
      let item = createReviewItem(
        { id: 'reading::set-1::q-9', setId: 'set-1', setTitle: 'S', questionId: 'q-9', questionType: 'matching', prompt: 'P' },
        base,
      );
      for (let i = 0; i < 4; i += 1) {
        item = scheduleReviewItem(item, 'correct', base);
      }
      return item;
    })();

    const summary = buildReviewDeckSummary([dueLearning, mastered], '2026-06-16T01:00:00.000Z');

    expect(summary.totalTracked).toBe(2);
    expect(summary.dueCount).toBe(1);
    expect(summary.masteredCount).toBe(1);
    expect(summary.weakestType?.type).toBe(Q0.type);
  });

  it('loads dashboard analytics through the service', async () => {
    const reviewRepository = createMemoryReviewRepository([trackedItem('2026-06-16T00:00:00.000Z')]);
    const service = createReviewApplicationService({
      reviewRepository,
      readingRepository: readingRepositoryStub,
      now: () => '2026-06-16T01:00:00.000Z',
    });

    const dashboard = await service.loadDashboardData();

    expect(dashboard.summary.totalTracked).toBe(1);
    expect(dashboard.forecast.dueNow).toBe(1);
    expect(dashboard.typeProgress[0]?.type).toBe(Q0.type);
  });

  it('computes the review streak from logged activity', async () => {
    const activity = createMemoryActivityRepository({ '2026-06-15': 4, '2026-06-16': 11 });
    const service = createReviewApplicationService({
      reviewRepository: createMemoryReviewRepository([]),
      readingRepository: readingRepositoryStub,
      reviewActivityRepository: activity.repository,
      now: () => '2026-06-16T09:00:00.000Z',
    });

    const streak = await service.loadStreak();

    expect(streak).toMatchObject({ currentStreak: 2, todayCount: 11, goalMet: true });
  });
});
