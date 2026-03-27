import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { samplePrompt, sampleResponsesByPromptId } from '@/lib/fixtures/writing';
import { buildMockAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

const execFileAsync = promisify(execFile);

describe('writing eval cli', () => {
  it('prints a JSON report for a human-rated dataset file', async () => {
    const response = sampleResponsesByPromptId[samplePrompt.id]!;
    const report = buildMockAssessmentReport(
      samplePrompt,
      createSubmissionRecord({
        promptId: samplePrompt.id,
        taskType: samplePrompt.taskType,
        response,
        timeSpentMinutes: samplePrompt.recommendedMinutes,
      }),
    );
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'writing-eval-'));
    const datasetPath = path.join(tempDir, 'dataset.json');

    await writeFile(
      datasetPath,
      JSON.stringify({
        version: 1,
        essays: [
          {
            id: 'sample-task-2',
            taskType: samplePrompt.taskType,
            promptId: samplePrompt.id,
            response,
            overallBand: report.overallBand,
            criterionScores: Object.fromEntries(report.criterionScores.map((score) => [score.criterion, score.band])),
          },
        ],
      }),
    );

    const { stdout } = await execFileAsync(
      'node',
      [
        '--import',
        './scripts/register-ts-path-loader.mjs',
        '--experimental-strip-types',
        'scripts/evaluate-writing.mts',
        '--input',
        datasetPath,
        '--format',
        'json',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          IELTS_SCORER_PROVIDER: 'mock',
        },
      },
    );

    const parsed = JSON.parse(stdout);
    expect(parsed.summary.sampleCount).toBe(1);
    expect(parsed.summary.overall.meanAbsoluteError).toBe(0);
    expect(parsed.samples[0]).toMatchObject({
      id: 'sample-task-2',
      promptId: samplePrompt.id,
      scorerProvider: 'mock-rule-based',
    });
  });
});
