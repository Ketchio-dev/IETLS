import { describe, expect, it } from 'vitest';

import { getSampleResponse, sampleTask1Prompt } from '@/lib/fixtures/writing';

import { extractWritingEvidence } from '../evidence-extractor';

describe('extractWritingEvidence', () => {
  it('uses real word-boundary regexes for Task 1 signals', () => {
    const evidence = extractWritingEvidence(sampleTask1Prompt, {
      promptId: sampleTask1Prompt.id,
      taskType: sampleTask1Prompt.taskType,
      response: getSampleResponse(sampleTask1Prompt.id),
      timeSpentMinutes: 18,
    });

    expect(evidence.find((signal) => signal.id === 'task1-overview')?.strength).toBe('strong');
    expect(evidence.find((signal) => signal.id === 'task1-time-reference')?.strength).not.toBe('weak');
    expect(evidence.find((signal) => signal.id === 'task1-key-features')?.detail).toContain('numeric/data references');
  });
});
