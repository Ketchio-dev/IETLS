import { describe, expect, it } from 'vitest';

import {
  MIN_EASE_FACTOR,
  createReviewItem,
  isReviewItemDue,
  scheduleReviewItem,
} from '../scheduler';
import type { ReviewItem } from '../types';

const NOW = '2026-06-16T00:00:00.000Z';

function newItem(now = NOW): ReviewItem {
  return createReviewItem(
    {
      id: 'reading::set-1::q-1',
      setId: 'set-1',
      setTitle: 'Set 1',
      questionId: 'q-1',
      questionType: 'true_false_not_given',
      prompt: 'Prompt',
    },
    now,
  );
}

describe('review scheduler', () => {
  it('creates a learning item that is due immediately', () => {
    const item = newItem();

    expect(item).toMatchObject({
      repetitions: 0,
      intervalDays: 0,
      status: 'learning',
      dueAt: NOW,
      lapses: 0,
      timesSeen: 0,
      timesCorrect: 0,
      lastResult: null,
    });
    expect(isReviewItemDue(item, NOW)).toBe(true);
  });

  it('promotes through 1d then 3d on the first two correct reviews', () => {
    const first = scheduleReviewItem(newItem(), 'correct', NOW);
    expect(first).toMatchObject({
      repetitions: 1,
      intervalDays: 1,
      status: 'review',
      dueAt: '2026-06-17T00:00:00.000Z',
      timesSeen: 1,
      timesCorrect: 1,
      lastResult: 'correct',
    });

    const second = scheduleReviewItem(first, 'correct', '2026-06-17T00:00:00.000Z');
    expect(second).toMatchObject({ repetitions: 2, intervalDays: 3 });
  });

  it('grows geometrically by ease after the second repetition', () => {
    let item = newItem();
    item = scheduleReviewItem(item, 'correct', NOW); // rep1, ease 2.6, int 1
    item = scheduleReviewItem(item, 'correct', NOW); // rep2, ease 2.7, int 3
    item = scheduleReviewItem(item, 'correct', NOW); // rep3, ease 2.8, int round(3*2.8)=8

    expect(item.repetitions).toBe(3);
    expect(item.easeFactor).toBeCloseTo(2.8, 5);
    expect(item.intervalDays).toBe(8);
  });

  it('reaches mastery after four consecutive correct reviews and leaves the due queue', () => {
    let item = newItem();
    for (let i = 0; i < 4; i += 1) {
      item = scheduleReviewItem(item, 'correct', NOW);
    }

    expect(item.repetitions).toBe(4);
    expect(item.intervalDays).toBeGreaterThanOrEqual(21);
    expect(item.status).toBe('mastered');
    expect(isReviewItemDue(item, '2999-01-01T00:00:00.000Z')).toBe(false);
  });

  it('resets the streak and resurfaces quickly on a miss', () => {
    const learned = scheduleReviewItem(scheduleReviewItem(newItem(), 'correct', NOW), 'correct', NOW);
    const lapsed = scheduleReviewItem(learned, 'incorrect', '2026-06-20T00:00:00.000Z');

    expect(lapsed).toMatchObject({
      repetitions: 0,
      intervalDays: 0,
      status: 'learning',
      lapses: 1,
      lastResult: 'incorrect',
      dueAt: '2026-06-20T00:10:00.000Z',
    });
    expect(lapsed.timesCorrect).toBe(learned.timesCorrect);
    expect(lapsed.easeFactor).toBeCloseTo(learned.easeFactor - 0.2, 5);
  });

  it('floors the ease factor on repeated misses', () => {
    let item = newItem();
    for (let i = 0; i < 12; i += 1) {
      item = scheduleReviewItem(item, 'incorrect', NOW);
    }

    expect(item.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('treats only past-due, non-mastered items as due', () => {
    const future = scheduleReviewItem(newItem(), 'correct', NOW);

    expect(isReviewItemDue(future, NOW)).toBe(false);
    expect(isReviewItemDue(future, '2026-06-17T00:00:00.000Z')).toBe(true);
  });
});
