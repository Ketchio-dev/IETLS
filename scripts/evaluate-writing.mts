import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { evaluateWritingDataset, parseWritingEvalDataset } from '@/lib/services/writing/evaluation';

function formatMetric(metric: number) {
  return metric.toFixed(3);
}

function formatBandMetric(metric: number) {
  return metric.toFixed(2);
}

function printTable(report: Awaited<ReturnType<typeof evaluateWritingDataset>>) {
  const lines = [
    `Writing evaluation report (${report.scorerMode})`,
    `Samples: ${report.summary.sampleCount}`,
    `Overall MAE: ${formatBandMetric(report.summary.overall.meanAbsoluteError)}`,
    `Overall bias: ${formatBandMetric(report.summary.overall.meanSignedError)}`,
    `Within ±0.5: ${(report.summary.overall.withinHalfBandRate * 100).toFixed(1)}%`,
    `Within ±1.0: ${(report.summary.overall.withinOneBandRate * 100).toFixed(1)}%`,
    `Configured scores: ${report.summary.configuredScoreCount}`,
    `Explicit mock scores: ${report.summary.explicitMockScoreCount}`,
    `Mock fallbacks: ${report.summary.mockFallbackCount}`,
    `Criterion-labeled essays: ${report.summary.criterionLabeledSampleCount}`,
    '',
    'By task:',
    ...report.summary.byTask.map(
      (entry) =>
        `- ${entry.taskType}: count=${entry.count}, MAE=${formatBandMetric(entry.meanAbsoluteError)}, bias=${formatBandMetric(entry.meanSignedError)}, within±0.5=${(entry.withinHalfBandRate * 100).toFixed(1)}%`,
    ),
    '',
    'By criterion:',
    ...report.summary.byCriterion.map(
      (entry) =>
        `- ${entry.criterion}: count=${entry.count}, MAE=${formatBandMetric(entry.meanAbsoluteError)}, bias=${formatBandMetric(entry.meanSignedError)}, within±0.5=${(entry.withinHalfBandRate * 100).toFixed(1)}%`,
    ),
    '',
    'Largest overall misses:',
    ...[...report.samples]
      .sort((a, b) => b.overall.absoluteError - a.overall.absoluteError)
      .slice(0, 5)
      .map(
        (sample) =>
          `- ${sample.id} (${sample.taskType}): expected=${formatBandMetric(sample.overall.expectedBand)}, predicted=${formatBandMetric(sample.overall.predictedBand)}, absError=${formatMetric(sample.overall.absoluteError)}, provider=${sample.scorerProvider}`,
      ),
  ];

  console.log(lines.join('\n'));
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      scorer: { type: 'string', short: 's', default: 'mock' },
      format: { type: 'string', short: 'f', default: 'table' },
    },
    allowPositionals: false,
  });

  if (!values.input) {
    throw new Error('Missing required --input <path> argument.');
  }

  if (values.scorer !== 'mock' && values.scorer !== 'configured') {
    throw new Error('--scorer must be either "mock" or "configured".');
  }

  if (values.format !== 'table' && values.format !== 'json') {
    throw new Error('--format must be either "table" or "json".');
  }

  const fileContent = await readFile(values.input, 'utf8');
  const dataset = parseWritingEvalDataset(JSON.parse(fileContent));
  const report = await evaluateWritingDataset(dataset, { scorer: values.scorer });

  if (values.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printTable(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
