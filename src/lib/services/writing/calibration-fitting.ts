import type { WritingTaskType } from '@/lib/domain';

export interface CalibrationFitSample {
  taskType: WritingTaskType;
  predictedBand: number;
  expectedBand: number;
}

export interface FittedCalibrationProfile {
  taskType: WritingTaskType;
  sampleCount: number;
  intercept: number;
  slope: number;
  maeBefore: number;
  maeAfter: number;
  biasBefore: number;
  biasAfter: number;
  withinHalfBandRateAfter: number;
  withinOneBandRateAfter: number;
}

const TASK_TYPES: WritingTaskType[] = ['task-1', 'task-2'];

function roundMetric(value: number, precision = 3) {
  return Number(value.toFixed(precision));
}

function roundBand(value: number) {
  return Math.round(value * 2) / 2;
}

function clampBand(value: number) {
  return Math.max(4, Math.min(8.5, roundBand(value)));
}

function fitLinearRegression(samples: Array<{ predictedBand: number; expectedBand: number }>) {
  const predictedMean = samples.reduce((sum, sample) => sum + sample.predictedBand, 0) / samples.length;
  const expectedMean = samples.reduce((sum, sample) => sum + sample.expectedBand, 0) / samples.length;
  const denominator = samples.reduce((sum, sample) => sum + (sample.predictedBand - predictedMean) ** 2, 0);

  const slope =
    denominator === 0
      ? 1
      : samples.reduce(
          (sum, sample) => sum + (sample.predictedBand - predictedMean) * (sample.expectedBand - expectedMean),
          0,
        ) / denominator;
  const intercept = expectedMean - slope * predictedMean;

  return { intercept, slope };
}

function summarizeProjected(samples: Array<{ predictedBand: number; expectedBand: number }>, intercept: number, slope: number) {
  const projected = samples.map(({ predictedBand, expectedBand }) => {
    const calibratedBand = clampBand(intercept + slope * predictedBand);
    return {
      expectedBand,
      calibratedBand,
      error: calibratedBand - expectedBand,
      absoluteError: Math.abs(calibratedBand - expectedBand),
    };
  });

  const count = projected.length;

  return {
    maeAfter: roundMetric(projected.reduce((sum, sample) => sum + sample.absoluteError, 0) / count),
    biasAfter: roundMetric(projected.reduce((sum, sample) => sum + sample.error, 0) / count),
    withinHalfBandRateAfter: roundMetric(projected.filter((sample) => sample.absoluteError <= 0.5).length / count),
    withinOneBandRateAfter: roundMetric(projected.filter((sample) => sample.absoluteError <= 1).length / count),
  };
}

export function fitCalibrationProfiles(samples: CalibrationFitSample[]): Record<WritingTaskType, FittedCalibrationProfile> {
  return Object.fromEntries(
    TASK_TYPES.map((taskType) => {
      const taskSamples = samples.filter((sample) => sample.taskType === taskType);

      if (taskSamples.length === 0) {
        throw new Error(`Cannot fit calibration profile for ${taskType}: no samples were provided.`);
      }

      const maeBefore = roundMetric(
        taskSamples.reduce((sum, sample) => sum + Math.abs(sample.predictedBand - sample.expectedBand), 0) / taskSamples.length,
      );
      const biasBefore = roundMetric(
        taskSamples.reduce((sum, sample) => sum + (sample.predictedBand - sample.expectedBand), 0) / taskSamples.length,
      );
      const { intercept, slope } = fitLinearRegression(taskSamples);
      const projected = summarizeProjected(taskSamples, intercept, slope);

      return [
        taskType,
        {
          taskType,
          sampleCount: taskSamples.length,
          intercept,
          slope,
          maeBefore,
          maeAfter: projected.maeAfter,
          biasBefore,
          biasAfter: projected.biasAfter,
          withinHalfBandRateAfter: projected.withinHalfBandRateAfter,
          withinOneBandRateAfter: projected.withinOneBandRateAfter,
        } satisfies FittedCalibrationProfile,
      ];
    }),
  ) as Record<WritingTaskType, FittedCalibrationProfile>;
}
