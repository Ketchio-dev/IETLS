import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('private reading import script', () => {
  it('compiles local reading import JSON into the runtime bank file', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'reading-import-script-'));
    const sourceDir = path.join(baseDir, 'imports');
    const runtimeDir = path.join(baseDir, 'runtime');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(runtimeDir, { recursive: true });

    await writeFile(path.join(sourceDir, 'owned-reading.json'), JSON.stringify({
      title: 'Owned Reading Set',
      sourceLabel: 'My owned notes',
      passage: 'The passage text goes here.',
      questions: [
        {
          type: 'multiple_choice',
          prompt: 'Which choice is correct?',
          answer: 'B',
          acceptedVariants: ['B.'],
        },
      ],
    }));

    const { stdout } = await execFileAsync('node', ['scripts/import-reading-private.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        IELTS_PRIVATE_READING_IMPORTS_DIR: sourceDir,
        IELTS_DATA_DIR: runtimeDir,
      },
    });

    const output = JSON.parse(stdout);
    expect(output.ok).toBe(true);
    expect(output.importedSets).toBe(1);

    const compiled = JSON.parse(await readFile(path.join(runtimeDir, 'reading-private-imports.json'), 'utf8'));
    expect(compiled.sets).toHaveLength(1);
    expect(compiled.sets[0]).toMatchObject({
      title: 'Owned Reading Set',
      sourceLabel: 'My owned notes',
      passageWordCount: 5,
    });
    expect(compiled.sets[0].questions[0]).toMatchObject({
      type: 'multiple_choice',
      acceptedAnswers: ['B'],
      acceptedVariants: ['B.'],
    });
  });
});
