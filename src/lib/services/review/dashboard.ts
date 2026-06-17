import { isReviewItemDue } from './scheduler';
import type {
  ReviewActivity,
  ReviewDashboardData,
  ReviewDeckSummary,
  ReviewDueForecast,
  ReviewItem,
  ReviewTypeProgress,
  ReviewTypeWeakness,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY).toISOString();
}

function toPercent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Roll the deck into the headline counts the practice surface and curriculum
 * need (due/learning/review/mastered, soonest due date, and the type carrying
 * the most due weight). Pure so it can be reused without touching storage.
 */
export function buildReviewDeckSummary(items: ReviewItem[], now: string): ReviewDeckSummary {
  const typeMap = new Map<string, ReviewTypeWeakness>();
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let nextDueAt: string | null = null;

  for (const item of items) {
    const bucket = typeMap.get(item.questionType) ?? { type: item.questionType, tracked: 0, due: 0, mastered: 0 };
    bucket.tracked += 1;

    if (isReviewItemDue(item, now)) {
      dueCount += 1;
      bucket.due += 1;
    }

    if (item.status === 'mastered') {
      masteredCount += 1;
      bucket.mastered += 1;
    } else if (item.status === 'learning') {
      learningCount += 1;
    } else {
      reviewCount += 1;
    }

    if (item.status !== 'mastered' && (nextDueAt === null || item.dueAt < nextDueAt)) {
      nextDueAt = item.dueAt;
    }

    typeMap.set(item.questionType, bucket);
  }

  const typeBreakdown = [...typeMap.values()].sort(
    (left, right) => right.due - left.due || right.tracked - left.tracked || left.type.localeCompare(right.type),
  );

  return {
    totalTracked: items.length,
    dueCount,
    learningCount,
    reviewCount,
    masteredCount,
    nextDueAt,
    weakestType: typeBreakdown.find((entry) => entry.due > 0) ?? typeBreakdown[0] ?? null,
    typeBreakdown,
  };
}

/**
 * Build the richer analytics the review dashboard renders: a due forecast, a
 * per-question-type mastery/accuracy breakdown, and lifetime review activity.
 */
export function buildReviewDashboardModel(items: ReviewItem[], now: string): ReviewDashboardData {
  const summary = buildReviewDeckSummary(items, now);
  const withinDay = addDays(now, 1);
  const withinWeek = addDays(now, 7);

  const forecast: ReviewDueForecast = { dueNow: 0, next24h: 0, next7d: 0, later: 0 };
  const typeStats = new Map<string, { tracked: number; mastered: number; due: number; seen: number; correct: number }>();
  let totalReviews = 0;
  let totalCorrect = 0;
  let totalLapses = 0;
  let lastReviewedAt: string | null = null;

  for (const item of items) {
    totalReviews += item.timesSeen;
    totalCorrect += item.timesCorrect;
    totalLapses += item.lapses;

    if (item.lastReviewedAt && (lastReviewedAt === null || item.lastReviewedAt > lastReviewedAt)) {
      lastReviewedAt = item.lastReviewedAt;
    }

    const stats = typeStats.get(item.questionType) ?? { tracked: 0, mastered: 0, due: 0, seen: 0, correct: 0 };
    stats.tracked += 1;
    stats.seen += item.timesSeen;
    stats.correct += item.timesCorrect;
    if (item.status === 'mastered') {
      stats.mastered += 1;
    }
    if (isReviewItemDue(item, now)) {
      stats.due += 1;
    }
    typeStats.set(item.questionType, stats);

    if (item.status === 'mastered') {
      continue;
    }

    if (item.dueAt <= now) {
      forecast.dueNow += 1;
    } else if (item.dueAt <= withinDay) {
      forecast.next24h += 1;
    } else if (item.dueAt <= withinWeek) {
      forecast.next7d += 1;
    } else {
      forecast.later += 1;
    }
  }

  const typeProgress: ReviewTypeProgress[] = [...typeStats.entries()]
    .map(([type, stats]) => ({
      type,
      tracked: stats.tracked,
      mastered: stats.mastered,
      due: stats.due,
      masteryPct: toPercent(stats.mastered, stats.tracked),
      accuracyPct: stats.seen === 0 ? null : toPercent(stats.correct, stats.seen),
    }))
    .sort((left, right) => right.due - left.due || left.masteryPct - right.masteryPct || left.type.localeCompare(right.type));

  const activity: ReviewActivity = {
    totalReviews,
    totalCorrect,
    accuracyPct: totalReviews === 0 ? null : toPercent(totalCorrect, totalReviews),
    totalLapses,
    lastReviewedAt,
  };

  return {
    summary,
    forecast,
    typeProgress,
    activity,
    masteryPct: toPercent(summary.masteredCount, items.length),
    generatedAt: now,
  };
}
