import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { PrivateReadingImportBankPayload } from '@/lib/services/reading-imports/types';

import { createReadingPrivateImportRepository } from '../reading-private-import-repository';
import { createFileStoragePort } from '../storage';

const envKeys = ['IELTS_PRIVATE_READING_IMPORTS_DIR', 'IELTS_DATA_DIR'] as const;

afterEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
});

describe('reading private import repository', () => {
  it('summarizes compiled private reading sets and detected source files', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'reading-private-imports-'));
    const sourceDir = path.join(baseDir, 'imports');
    const runtimeDir = path.join(baseDir, 'runtime');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(runtimeDir, { recursive: true });

    process.env.IELTS_PRIVATE_READING_IMPORTS_DIR = sourceDir;
    process.env.IELTS_DATA_DIR = runtimeDir;

    await writeFile(path.join(sourceDir, 'set-a.json'), JSON.stringify({ title: 'Set A' }));
    await writeFile(path.join(sourceDir, 'template.reading-import.json'), JSON.stringify({ title: 'Template' }));

    const payload: PrivateReadingImportBankPayload = {
      version: 1,
      importedAt: '2026-03-26T12:00:00.000Z',
      sourceDir,
      sourceFiles: ['set-a.json'],
      sets: [
        {
          id: 'set-a',
          title: 'Set A',
          sourceLabel: 'Owned notes',
          sourceFile: 'set-a.json',
          importedAt: '2026-03-26T12:00:00.000Z',
          passage: 'A short passage for testing.',
          passageWordCount: 5,
          notes: '',
          questions: [
            {
              id: 'set-a-q1',
              type: 'true_false_not_given',
              prompt: 'Testing prompt',
              options: [],
              acceptedAnswers: ['NOT GIVEN'],
              acceptedVariants: ['NG'],
              explanation: '',
              evidenceHint: 'Paragraph 1',
            },
          ],
        },
      ],
    };

    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });
    await storage.writeJsonFile('readingPrivateImports', payload);

    const repository = createReadingPrivateImportRepository(storage);
    const summary = await repository.loadSummary();

    expect(summary.importedSetCount).toBe(1);
    expect(summary.detectedSourceFiles).toEqual(['set-a.json']);
    expect(summary.compiledSourceFiles).toEqual(['set-a.json']);
    expect(summary.sets[0]).toMatchObject({
      id: 'set-a',
      questionCount: 1,
      types: ['true_false_not_given'],
    });
    expect(summary.warnings).toEqual([]);
  });

  it('warns when source files exist but the compiled bank is stale or empty', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'reading-private-imports-'));
    const sourceDir = path.join(baseDir, 'imports');
    const runtimeDir = path.join(baseDir, 'runtime');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(runtimeDir, { recursive: true });

    process.env.IELTS_PRIVATE_READING_IMPORTS_DIR = sourceDir;
    process.env.IELTS_DATA_DIR = runtimeDir;

    await writeFile(path.join(sourceDir, 'set-a.json'), JSON.stringify({ title: 'Set A' }));
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });

    const repository = createReadingPrivateImportRepository(storage);
    const summary = await repository.loadSummary();

    expect(summary.importedSetCount).toBe(0);
    expect(summary.warnings.some((warning) => warning.includes('Run npm run reading:import-private'))).toBe(true);
  });
});
