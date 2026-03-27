import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { fitCalibrationProfiles } from '@/lib/services/writing/calibration-fitting';

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      provider: { type: 'string', short: 'p', default: 'openrouter' },
      label: { type: 'string', short: 'l', default: 'benchmark' },
      format: { type: 'string', short: 'f', default: 'json' },
    },
    allowPositionals: false,
  });

  if (!values.input) {
    throw new Error('Missing required --input <evaluation-report.json> argument.');
  }

  if (values.format !== 'json' && values.format !== 'ts') {
    throw new Error('--format must be either "json" or "ts".');
  }

  const report = JSON.parse(await readFile(values.input, 'utf8')) as {
    samples?: Array<{
      taskType: 'task-1' | 'task-2';
      overall: { predictedBand: number; expectedBand: number };
    }>;
  };

  if (!Array.isArray(report.samples) || report.samples.length === 0) {
    throw new Error('Evaluation report must include a non-empty samples array.');
  }

  const profiles = fitCalibrationProfiles(
    report.samples.map((sample) => ({
      taskType: sample.taskType,
      predictedBand: sample.overall.predictedBand,
      expectedBand: sample.overall.expectedBand,
    })),
  );

  if (values.format === 'json') {
    console.log(JSON.stringify({ provider: values.provider, label: values.label, profiles }, null, 2));
    return;
  }

  const lines = [
    `// Provider: ${values.provider}`,
    `// Label: ${values.label}`,
    '{',
    `  'task-1': {`,
    `    provider: '${values.provider}',`,
    `    taskType: 'task-1',`,
    `    sampleCount: ${profiles['task-1'].sampleCount},`,
    `    intercept: ${profiles['task-1'].intercept},`,
    `    slope: ${profiles['task-1'].slope},`,
    `    maeBefore: ${profiles['task-1'].maeBefore},`,
    `    maeAfter: ${profiles['task-1'].maeAfter},`,
    `    benchmarkLabel: '${values.label}',`,
    '  },',
    `  'task-2': {`,
    `    provider: '${values.provider}',`,
    `    taskType: 'task-2',`,
    `    sampleCount: ${profiles['task-2'].sampleCount},`,
    `    intercept: ${profiles['task-2'].intercept},`,
    `    slope: ${profiles['task-2'].slope},`,
    `    maeBefore: ${profiles['task-2'].maeBefore},`,
    `    maeAfter: ${profiles['task-2'].maeAfter},`,
    `    benchmarkLabel: '${values.label}',`,
    '  },',
    '}',
  ];

  console.log(lines.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
