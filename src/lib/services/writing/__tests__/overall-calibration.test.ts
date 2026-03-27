import { describe, expect, it } from 'vitest';

import { calibrateMockOverallBand, calibrateOpenRouterOverallBand } from '../overall-calibration';

describe('calibrateMockOverallBand', () => {
  it('raises task-1 heuristic overall bands toward the public overall-label distribution', () => {
    const result = calibrateMockOverallBand('task-1', 5, { lower: 4.5, upper: 5.5 });

    expect(result.calibratedOverallBand).toBe(6.5);
    expect(result.calibratedOverallBandRange).toEqual({ lower: 6, upper: 7 });
    expect(result.note).toMatch(/kaggle-mazlumi/i);
  });

  it('raises task-2 heuristic overall bands toward the public overall-label distribution', () => {
    const result = calibrateMockOverallBand('task-2', 5.5, { lower: 5, upper: 6 });

    expect(result.calibratedOverallBand).toBe(7);
    expect(result.calibratedOverallBandRange).toEqual({ lower: 6.5, upper: 7.5 });
  });
});

describe('calibrateOpenRouterOverallBand', () => {
  it('reduces Task 1 under-scoring from the OpenRouter benchmark profile', () => {
    const result = calibrateOpenRouterOverallBand('task-1', 6, { lower: 5.5, upper: 6.5 });

    expect(result.calibratedOverallBand).toBe(6.5);
    expect(result.calibratedOverallBandRange).toEqual({ lower: 6, upper: 7 });
    expect(result.note).toMatch(/openrouter/i);
    expect(result.note).toMatch(/300-balanced raw benchmark/i);
  });

  it('raises Task 2 live scorer bands more aggressively when the benchmark showed stronger under-scoring', () => {
    const result = calibrateOpenRouterOverallBand('task-2', 6, { lower: 5.5, upper: 6.5 });

    expect(result.calibratedOverallBand).toBe(6.5);
    expect(result.calibratedOverallBandRange).toEqual({ lower: 6, upper: 7 });
  });
});
