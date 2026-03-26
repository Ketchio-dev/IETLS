import { describe, expect, it } from 'vitest';

import { buildMockAssessmentReport } from '@/lib/services/assessment';

const essay = `In my opinion, public transport deserves more funding because it moves large numbers of people efficiently.

On the one hand, some citizens prefer road expansion because businesses need predictable delivery routes. However, new roads often fill quickly when car use remains the dominant option.

On the other hand, better bus lanes and rail systems reduce congestion and pollution at the same time. For example, reliable commuter infrastructure encourages workers to leave private vehicles at home.

Overall, governments should prioritise public transport while fixing only the most dangerous road bottlenecks.`;

describe('buildMockAssessmentReport', () => {
  it('returns a shaped report with derived evidence and actions', () => {
    const report = buildMockAssessmentReport({
      promptId: 'task-2-public-transport',
      response: essay,
      timeSpentMinutes: 32,
    });

    expect(report.promptId).toBe('task-2-public-transport');
    expect(report.criterionScores).toHaveLength(4);
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.nextSteps.length).toBeGreaterThan(0);
    expect(report.overallBand).toBeGreaterThanOrEqual(4);
    expect(report.estimatedWordCount).toBeGreaterThan(80);
  });
});
