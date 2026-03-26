import type { BandRange, ProgressSummary, RecentAttemptSummary } from '@/lib/domain';

function getAttemptRange(attempt: RecentAttemptSummary): BandRange {
  return attempt.overallBandRange;
}

function getRangeMidpoint(range: BandRange) {
  return Number(((range.lower + range.upper) / 2).toFixed(1));
}

export function buildProgressSummary(attempts: RecentAttemptSummary[]): ProgressSummary {
  if (attempts.length === 0) {
    return {
      direction: 'insufficient-data',
      label: 'No trend yet',
      detail: 'Submit your first draft to start building a progress trend.',
      delta: 0,
      latestRange: null,
      attemptsConsidered: 0,
      averageWordCount: 0,
    };
  }

  const ordered = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const considered = ordered.slice(-3);
  const firstMidpoint = getRangeMidpoint(getAttemptRange(considered[0]));
  const latestRange = getAttemptRange(considered[considered.length - 1]);
  const latestMidpoint = getRangeMidpoint(latestRange);
  const delta = Number((latestMidpoint - firstMidpoint).toFixed(1));
  const averageWordCount = Math.round(
    considered.reduce((sum, attempt) => sum + attempt.estimatedWordCount, 0) / considered.length,
  );

  if (considered.length === 1) {
    return {
      direction: 'insufficient-data',
      label: 'First benchmark saved',
      detail: `You need one more scored draft before the app can call a trend. Latest range: Band ${latestRange.lower.toFixed(1)}-${latestRange.upper.toFixed(1)}.`,
      delta,
      latestRange,
      attemptsConsidered: considered.length,
      averageWordCount,
    };
  }

  const direction = delta >= 0.5 ? 'improving' : delta <= -0.5 ? 'slipping' : 'steady';
  const label =
    direction === 'improving'
      ? 'Trend: improving'
      : direction === 'slipping'
        ? 'Trend: needs attention'
        : 'Trend: steady';
  const detail =
    direction === 'improving'
      ? `Your recent midpoint improved by ${delta.toFixed(1)} band over the last ${considered.length} saved attempt(s).`
      : direction === 'slipping'
        ? `Your recent midpoint dropped by ${Math.abs(delta).toFixed(1)} band over the last ${considered.length} saved attempt(s).`
        : `Your recent midpoint stayed within ${Math.abs(delta).toFixed(1)} band, so the score range is broadly stable.`;

  return {
    direction,
    label,
    detail,
    delta,
    latestRange,
    attemptsConsidered: considered.length,
    averageWordCount,
  };
}
