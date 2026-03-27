import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('writing eval csv importer', () => {
  it('converts the Kaggle-style CSV into the writing eval JSON schema', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'writing-eval-csv-'));
    const inputPath = path.join(tempDir, 'ielts.csv');
    const outputPath = path.join(tempDir, 'dataset.json');

    await writeFile(
      inputPath,
      [
        'Task_Type,Question,Essay,Examiner_Commen,Task_Response,Coherence_Cohesion,Lexical_Resource,Range_Accuracy,Overall',
        '2,"Some people believe...","This is a full essay.","Useful comment",,,, ,6.5',
      ].join('\n'),
    );

    const { stdout } = await execFileAsync(
      'node',
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--import',
        './scripts/register-ts-path-loader.mjs',
        '--experimental-strip-types',
        'scripts/import-writing-eval-csv.mts',
        '--input',
        inputPath,
        '--output',
        outputPath,
      ],
      { cwd: process.cwd() },
    );

    const summary = JSON.parse(stdout);
    expect(summary).toMatchObject({
      ok: true,
      essays: 1,
      task2Count: 1,
      criterionLabeled: 0,
      examinerCommentCount: 1,
    });

    const imported = JSON.parse(await readFile(outputPath, 'utf8'));
    expect(imported.essays[0]).toMatchObject({
      taskType: 'task-2',
      overallBand: 6.5,
      source: 'kaggle-mazlumi-ielts-writing-scored-essays-dataset',
      notes: ['Useful comment'],
    });
    expect(imported.essays[0].criterionScores).toBeUndefined();
  });
});
