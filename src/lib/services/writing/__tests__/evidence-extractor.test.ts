import { describe, expect, it } from 'vitest';

import { getSampleResponse, samplePrompt, sampleTask1Prompt } from '@/lib/fixtures/writing';

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

  it('adds grammar and spelling control signals for weaker drafts', () => {
    const evidence = extractWritingEvidence(samplePrompt, {
      promptId: samplePrompt.id,
      taskType: samplePrompt.taskType,
      response:
        'i think public transport is important becuase it helps many people.. goverment should support teh enviroment more',
      timeSpentMinutes: 15,
    });

    expect(evidence.find((signal) => signal.id === 'grammar-accuracy')).toMatchObject({
      criterion: 'Grammatical Range & Accuracy',
      strength: 'weak',
    });
    expect(evidence.find((signal) => signal.id === 'spelling-control')).toMatchObject({
      criterion: 'Grammatical Range & Accuracy',
      strength: 'weak',
    });
  });
});
