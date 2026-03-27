import { describe, expect, it } from 'vitest';

import { fitCalibrationProfiles } from '../calibration-fitting';

describe('fitCalibrationProfiles', () => {
  it('fits task-specific regressions and reports projected half-band metrics', () => {
    const profiles = fitCalibrationProfiles([
      { taskType: 'task-1', predictedBand: 5, expectedBand: 6 },
      { taskType: 'task-1', predictedBand: 6, expectedBand: 7 },
      { taskType: 'task-1', predictedBand: 7, expectedBand: 8 },
      { taskType: 'task-2', predictedBand: 5, expectedBand: 5.5 },
      { taskType: 'task-2', predictedBand: 6, expectedBand: 6.5 },
      { taskType: 'task-2', predictedBand: 7, expectedBand: 7.5 },
    ]);

    expect(profiles['task-1'].sampleCount).toBe(3);
    expect(profiles['task-1'].intercept).toBeCloseTo(1, 5);
    expect(profiles['task-1'].slope).toBeCloseTo(1, 5);
    expect(profiles['task-1'].maeBefore).toBe(1);
    expect(profiles['task-1'].maeAfter).toBe(0);
    expect(profiles['task-1'].withinHalfBandRateAfter).toBe(1);

    expect(profiles['task-2'].sampleCount).toBe(3);
    expect(profiles['task-2'].intercept).toBeCloseTo(0.5, 5);
    expect(profiles['task-2'].slope).toBeCloseTo(1, 5);
    expect(profiles['task-2'].maeBefore).toBe(0.5);
    expect(profiles['task-2'].maeAfter).toBe(0);
  });
});
