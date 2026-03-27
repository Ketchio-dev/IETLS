import type { BandRange, WritingTaskType } from '@/lib/domain';

const PUBLIC_DATASET_LABEL = 'kaggle-mazlumi-ielts-writing-scored-essays-dataset';

type OverallCalibrationProvider = 'mock-rule-based' | 'openrouter';

interface OverallCalibrationProfile {
  provider: OverallCalibrationProvider;
  taskType: WritingTaskType;
  sampleCount: number;
  intercept: number;
  slope: number;
  maeBefore: number;
  maeAfter: number;
  benchmarkLabel: string;
}

const MOCK_CALIBRATION_PROFILES: Record<WritingTaskType, OverallCalibrationProfile> = {
  'task-1': {
    provider: 'mock-rule-based',
    taskType: 'task-1',
    sampleCount: 642,
    intercept: 4.354984249418582,
    slope: 0.3825330467806935,
    maeBefore: 1.15,
    maeAfter: 0.753,
    benchmarkLabel: `${PUBLIC_DATASET_LABEL} full public import`,
  },
  'task-2': {
    provider: 'mock-rule-based',
    taskType: 'task-2',
    sampleCount: 793,
    intercept: 2.7376828409231995,
    slope: 0.7788919736460482,
    maeBefore: 1.607,
    maeAfter: 0.846,
    benchmarkLabel: `${PUBLIC_DATASET_LABEL} full public import`,
  },
};

const OPENROUTER_CALIBRATION_PROFILES: Record<WritingTaskType, OverallCalibrationProfile> = {
  'task-1': {
    provider: 'openrouter',
    taskType: 'task-1',
    sampleCount: 150,
    intercept: -0.2600614102423471,
    slope: 1.1018203750411222,
    maeBefore: 0.647,
    maeAfter: 0.633,
    benchmarkLabel: `${PUBLIC_DATASET_LABEL} 300-balanced raw benchmark via OpenRouter + google/gemini-3-flash-preview`,
  },
  'task-2': {
    provider: 'openrouter',
    taskType: 'task-2',
    sampleCount: 150,
    intercept: -0.5680633435712394,
    slope: 1.1799994364450943,
    maeBefore: 0.713,
    maeAfter: 0.64,
    benchmarkLabel: `${PUBLIC_DATASET_LABEL} 300-balanced raw benchmark via OpenRouter + google/gemini-3-flash-preview`,
  },
};

function roundBand(value: number) {
  return Math.round(value * 2) / 2;
}

function clampOverallBand(value: number) {
  return Math.max(4, Math.min(8.5, roundBand(value)));
}

function clampRangeEdge(value: number) {
  return Math.max(4, Math.min(8.5, roundBand(value)));
}

export interface CalibratedOverallBand {
  rawOverallBand: number;
  calibratedOverallBand: number;
  calibratedOverallBandRange: BandRange;
  applied: boolean;
  note: string;
  profile: OverallCalibrationProfile;
}

function calibrateOverallBand(profile: OverallCalibrationProfile, rawOverallBand: number, rawRange: BandRange): CalibratedOverallBand {
  const calibratedOverallBand = clampOverallBand(profile.intercept + profile.slope * rawOverallBand);
  const offset = calibratedOverallBand - rawOverallBand;
  const calibratedOverallBandRange = {
    lower: clampRangeEdge(rawRange.lower + offset),
    upper: clampRangeEdge(rawRange.upper + offset),
  } satisfies BandRange;

  if (calibratedOverallBandRange.upper < calibratedOverallBandRange.lower) {
    calibratedOverallBandRange.upper = calibratedOverallBandRange.lower;
  }

  return {
    rawOverallBand,
    calibratedOverallBand,
    calibratedOverallBandRange,
    applied: calibratedOverallBand !== rawOverallBand,
    note:
      `Applied ${profile.provider} overall-band calibration for ${profile.taskType} using ${profile.benchmarkLabel} ` +
      `(${profile.sampleCount} essays, MAE ${profile.maeBefore.toFixed(3)} → ${profile.maeAfter.toFixed(3)}).`,
    profile,
  };
}

export function calibrateMockOverallBand(taskType: WritingTaskType, rawOverallBand: number, rawRange: BandRange): CalibratedOverallBand {
  return calibrateOverallBand(MOCK_CALIBRATION_PROFILES[taskType], rawOverallBand, rawRange);
}

export function calibrateOpenRouterOverallBand(taskType: WritingTaskType, rawOverallBand: number, rawRange: BandRange): CalibratedOverallBand {
  return calibrateOverallBand(OPENROUTER_CALIBRATION_PROFILES[taskType], rawOverallBand, rawRange);
}
