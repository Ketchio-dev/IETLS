import { afterEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt } from '@/lib/fixtures/writing';
import { runAssessmentPipeline } from '@/lib/services/assessment';

const essay = `In my opinion, public transport deserves more funding because it moves large numbers of people efficiently.

On the one hand, some citizens prefer road expansion because businesses need predictable delivery routes. However, new roads often fill quickly when car use remains the dominant option.

On the other hand, better bus lanes and rail systems reduce congestion and pollution at the same time. For example, reliable commuter infrastructure encourages workers to leave private vehicles at home.

Overall, governments should prioritise public transport while fixing only the most dangerous road bottlenecks.`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('runAssessmentPipeline', () => {
  it('returns a report backed by separated evidence, scoring, and feedback layers', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'mock');

    const result = await runAssessmentPipeline(samplePrompt, {
      promptId: samplePrompt.id,
      response: essay,
      timeSpentMinutes: 32,
    });

    expect(result.report.promptId).toBe(samplePrompt.id);
    expect(result.report.criterionScores).toHaveLength(4);
    expect(result.report.evidence.length).toBeGreaterThan(3);
    expect(result.report.nextSteps.length).toBeGreaterThan(0);
    expect(result.report.pipelineVersion).toContain('openrouter-adapter');
    expect(result.report.confidenceReasons[0]).toContain('practice estimate');
    expect(result.submission.wordCount).toBeGreaterThan(80);
  });
});
