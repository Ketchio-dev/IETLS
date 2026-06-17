import type { ReviewStreak } from './types';

export const DAILY_REVIEW_GOAL = 10;

/** The UTC calendar date (YYYY-MM-DD) of an ISO-8601 UTC timestamp. */
export function toUtcDate(iso: string): string {
  return iso.slice(0, 10);
}

function previousDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Compute streak stats from the per-day activity log. The current streak counts
 * consecutive active days ending today, or ending yesterday when today has no
 * reviews yet (the streak is "alive but at risk" until a full day is missed).
 * Pure and deterministic: `now` is injected, never read from the clock.
 */
export function buildReviewStreak(
  days: Record<string, number>,
  now: string,
  goal: number = DAILY_REVIEW_GOAL,
): ReviewStreak {
  const today = toUtcDate(now);
  const activeDates = Object.keys(days)
    .filter((date) => (days[date] ?? 0) > 0)
    .sort();
  const activeSet = new Set(activeDates);

  let cursor = activeSet.has(today) ? today : previousDate(today);
  let currentStreak = 0;
  while (activeSet.has(cursor)) {
    currentStreak += 1;
    cursor = previousDate(cursor);
  }

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of activeDates) {
    run = previous !== null && previousDate(date) === previous ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }

  const todayCount = days[today] ?? 0;

  return {
    currentStreak,
    longestStreak,
    todayCount,
    goal,
    goalMet: todayCount >= goal,
    activeDays: activeDates.length,
    lastActiveDate: activeDates.at(-1) ?? null,
  };
}
