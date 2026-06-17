import { describe, expect, it } from 'vitest';

import { buildReviewDashboardModel } from '../dashboard';
import { createReviewItem } from '../scheduler';
import type { ReviewItem } from '../types';

const NOW = '2026-06-16T00:00:00.000Z';

function item(overrides: Partial<ReviewItem> & { id: string }): ReviewItem {
  return {
    ...createReviewItem(
      {
        id: overrides.id,
        setId: 'set-1',
        setTitle: 'Set 1',
        questionId: overrides.questionId ?? overrides.id,
        questionType: overrides.questionType ?? 'multiple_choice',
        prompt: 'Prompt',
      },
      NOW,
    ),
    ...overrides,
  };
}

describe('review dashboard model', () => {
  it('returns an empty model for an empty deck', () => {
    const model = buildReviewDashboardModel([], NOW);

    expect(model.masteryPct).toBe(0);
    expect(model.forecast).toEqual({ dueNow: 0, next24h: 0, next7d: 0, later: 0 });
    expect(model.activity.accuracyPct).toBeNull();
    expect(model.typeProgress).toEqual([]);
  });

  it('buckets non-mastered items into a due forecast and excludes mastered ones', () => {
    const model = buildReviewDashboardModel(
      [
        item({ id: 'a', status: 'learning', dueAt: NOW }),
        item({ id: 'b', status: 'review', dueAt: '2026-06-16T12:00:00.000Z' }),
        item({ id: 'c', status: 'review', dueAt: '2026-06-19T00:00:00.000Z' }),
        item({ id: 'd', status: 'review', dueAt: '2026-06-26T00:00:00.000Z' }),
        item({ id: 'e', status: 'mastered', dueAt: '2026-07-20T00:00:00.000Z' }),
      ],
      NOW,
    );

    expect(model.forecast).toEqual({ dueNow: 1, next24h: 1, next7d: 1, later: 1 });
  });

  it('computes per-type mastery and accuracy, sorted by due then lowest mastery', () => {
    const model = buildReviewDashboardModel(
      [
        item({ id: 'm1', questionType: 'multiple_choice', status: 'mastered', dueAt: '2026-07-01T00:00:00.000Z', timesSeen: 5, timesCorrect: 5, lapses: 0, lastReviewedAt: '2026-06-15T10:00:00.000Z' }),
        item({ id: 'm2', questionType: 'multiple_choice', status: 'review', dueAt: NOW, timesSeen: 3, timesCorrect: 2, lapses: 1, lastReviewedAt: '2026-06-16T09:00:00.000Z' }),
        item({ id: 'x1', questionType: 'matching', status: 'learning', dueAt: NOW, timesSeen: 1, timesCorrect: 0, lapses: 1, lastReviewedAt: '2026-06-14T00:00:00.000Z' }),
      ],
      NOW,
    );

    // Both types have one due item, so the tiebreak is lowest mastery first.
    expect(model.typeProgress.map((entry) => entry.type)).toEqual(['matching', 'multiple_choice']);

    const mc = model.typeProgress.find((entry) => entry.type === 'multiple_choice')!;
    expect(mc).toMatchObject({ tracked: 2, mastered: 1, due: 1, masteryPct: 50, accuracyPct: 88 });

    const matching = model.typeProgress.find((entry) => entry.type === 'matching')!;
    expect(matching).toMatchObject({ tracked: 1, mastered: 0, due: 1, masteryPct: 0, accuracyPct: 0 });

    expect(model.activity).toEqual({
      totalReviews: 9,
      totalCorrect: 7,
      accuracyPct: 78,
      totalLapses: 2,
      lastReviewedAt: '2026-06-16T09:00:00.000Z',
    });
    expect(model.masteryPct).toBe(33);
    expect(model.summary.dueCount).toBe(2);
  });
});
