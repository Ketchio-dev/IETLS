import { describe, expect, it } from 'vitest';

import { samplePrompt } from '@/lib/fixtures/writing';

import { predictCriterionScores } from '../scoring-model';

describe('predictCriterionScores', () => {
  it('does not start empty evidence at an inflated band floor', () => {
    const scores = predictCriterionScores(samplePrompt, []);

    expect(scores.every((score) => score.band <= 4.5)).toBe(true);
  });
});
