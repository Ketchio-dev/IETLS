import { describe, expect, it } from 'vitest';

import { DAILY_REVIEW_GOAL, buildReviewStreak, toUtcDate } from '../streak';

const NOW = '2026-06-16T08:00:00.000Z';

describe('review streak', () => {
  it('derives the UTC date from an ISO timestamp', () => {
    expect(toUtcDate('2026-06-16T23:59:59.000Z')).toBe('2026-06-16');
  });

  it('returns a zeroed streak for no activity', () => {
    expect(buildReviewStreak({}, NOW)).toMatchObject({
      currentStreak: 0,
      longestStreak: 0,
      todayCount: 0,
      activeDays: 0,
      lastActiveDate: null,
      goalMet: false,
    });
  });

  it('counts consecutive days ending today and meets the goal', () => {
    const streak = buildReviewStreak(
      { '2026-06-14': 3, '2026-06-15': 5, '2026-06-16': 12 },
      NOW,
    );

    expect(streak).toMatchObject({
      currentStreak: 3,
      longestStreak: 3,
      todayCount: 12,
      goal: DAILY_REVIEW_GOAL,
      goalMet: true,
      activeDays: 3,
      lastActiveDate: '2026-06-16',
    });
  });

  it('keeps the streak alive when today is empty but yesterday was active', () => {
    const streak = buildReviewStreak({ '2026-06-14': 2, '2026-06-15': 4 }, NOW);

    expect(streak.currentStreak).toBe(2);
    expect(streak.todayCount).toBe(0);
    expect(streak.goalMet).toBe(false);
  });

  it('breaks the current streak across a gap but reports the longest run', () => {
    const streak = buildReviewStreak(
      { '2026-06-01': 1, '2026-06-02': 1, '2026-06-03': 1, '2026-06-10': 1, '2026-06-11': 1 },
      NOW,
    );

    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(3);
    expect(streak.activeDays).toBe(5);
  });

  it('honors a custom daily goal', () => {
    const streak = buildReviewStreak({ '2026-06-16': 6 }, NOW, 5);

    expect(streak.goal).toBe(5);
    expect(streak.goalMet).toBe(true);
  });
});
