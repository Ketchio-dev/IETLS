import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it, vi } from 'vitest';

async function importStorageModule() {
  return import('../storage');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('file storage port', () => {
  it('returns the fallback silently when the file does not exist', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-missing-'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });
    const fallback = [{ id: 'fallback' }];

    const result = await storage.readJsonFile('assessments', fallback);

    expect(result).toBe(fallback);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs corrupted JSON and returns the fallback', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-corrupt-'));
    const filePath = path.join(runtimeDir, 'writing-prompts.json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });
    const fallback = [{ id: 'prompt-1' }];

    await writeFile(filePath, '{"broken": ');

    const result = await storage.readJsonFile('prompts', fallback);

    expect(result).toBe(fallback);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[storage] Corrupted JSON in'),
      expect.any(SyntaxError),
    );
  });

  it('fails closed on corrupted JSON reads in production', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-corrupt-prod-'));
    const filePath = path.join(runtimeDir, 'writing-prompts.json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    const { StorageCorruptionError, createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });

    await writeFile(filePath, '{"broken": ');

    await expect(storage.readJsonFile('prompts', [{ id: 'prompt-1' }])).rejects.toThrow(StorageCorruptionError);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failing closed.'),
      expect.any(SyntaxError),
    );
  });

  it('logs read failures other than missing files and returns the fallback', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-read-error-'));
    const filePath = path.join(runtimeDir, 'writing-study-plan.json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });
    const fallback = { ok: true };

    await mkdir(filePath);

    const result = await storage.readJsonFile('studyPlan', fallback);

    expect(result).toBe(fallback);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[storage] Failed to read '),
      expect.objectContaining({ code: 'EISDIR' }),
    );
  });

  it('fails closed on corrupted JSON during update operations', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-update-corrupt-'));
    const filePath = path.join(runtimeDir, 'writing-prompts.json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { StorageUpdateError, createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });
    const fallback = [{ id: 'prompt-1' }];

    await writeFile(filePath, '{"broken": ');

    await expect(
      storage.updateJsonFile('prompts', fallback, (prompts) => [...prompts, { id: 'prompt-2' }]),
    ).rejects.toThrow(StorageUpdateError);
    await expect(readFile(filePath, 'utf8')).resolves.toBe('{"broken": ');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent updates to avoid lost writes and cleans up temp files', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-serialized-'));
    const { createFileStoragePort } = await importStorageModule();
    const storage = createFileStoragePort({ getDataDir: () => runtimeDir });

    const first = storage.updateJsonFile('assessments', [] as string[], async (items) => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return [...items, 'first'];
    });
    const second = storage.updateJsonFile('assessments', [] as string[], async (items) => [...items, 'second']);

    const [, secondResult] = await Promise.all([first, second]);
    const persisted = await storage.readJsonFile('assessments', [] as string[]);
    const runtimeFiles = await readdir(runtimeDir);

    expect(secondResult).toEqual(['first', 'second']);
    expect(persisted).toEqual(['first', 'second']);
    expect(runtimeFiles.filter((file) => file.endsWith('.tmp'))).toEqual([]);
  });
});

describe('sqlite storage port', () => {
  it('isolates user-scoped files by user id', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-sqlite-user-scope-'));
    const { createSqliteStoragePort } = await importStorageModule();
    const emptyAttempts: Array<{ id: string }> = [];
    const alphaStorage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-alpha',
    });
    const bravoStorage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-bravo',
    });

    await alphaStorage.writeJsonFile('assessments', [{ id: 'alpha-attempt' }]);
    await bravoStorage.writeJsonFile('assessments', [{ id: 'bravo-attempt' }]);

    await expect(alphaStorage.readJsonFile('assessments', emptyAttempts)).resolves.toEqual([
      { id: 'alpha-attempt' },
    ]);
    await expect(bravoStorage.readJsonFile('assessments', emptyAttempts)).resolves.toEqual([
      { id: 'bravo-attempt' },
    ]);
  });

  it('shares global files across users while keeping file-backed imports on disk', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-sqlite-global-'));
    const { createSqliteStoragePort } = await importStorageModule();
    const emptyPrompts: Array<{ id: string }> = [];
    const alphaStorage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-alpha',
    });
    const bravoStorage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-bravo',
    });
    const prompts = [{ id: 'prompt-1' }];
    const readingImports = { version: 1, importedAt: '2026-03-27T00:00:00.000Z', sourceDir: 'data/private-reading-imports', sourceFiles: ['sample.json'], sets: [] };

    await alphaStorage.writeJsonFile('prompts', prompts);
    await alphaStorage.writeJsonFile('readingPrivateImports', readingImports);

    await expect(bravoStorage.readJsonFile('prompts', emptyPrompts)).resolves.toEqual(prompts);
    await expect(
      bravoStorage.readJsonFile('readingPrivateImports', {
        version: 1,
        importedAt: null,
        sourceDir: '',
        sourceFiles: [],
        sets: [],
      }),
    ).resolves.toEqual(readingImports);
    await expect(readFile(path.join(runtimeDir, 'reading-private-imports.json'), 'utf8')).resolves.toContain('"sample.json"');
  });

  it('migrates legacy global json files into sqlite on first read without copying shared user data', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-sqlite-migrate-'));
    const { createSqliteStoragePort } = await importStorageModule();
    const emptyRecords: Array<{ id: string }> = [];
    const storage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-alpha',
    });

    await writeFile(path.join(runtimeDir, 'writing-prompts.json'), JSON.stringify([{ id: 'legacy-prompt' }]));
    await writeFile(path.join(runtimeDir, 'writing-assessments.json'), JSON.stringify([{ id: 'shared-attempt' }]));

    await expect(storage.readJsonFile('prompts', emptyRecords)).resolves.toEqual([{ id: 'legacy-prompt' }]);
    await expect(storage.readJsonFile('assessments', emptyRecords)).resolves.toEqual([]);
  });

  it('fails closed on corrupted sqlite rows in production', async () => {
    const runtimeDir = await mkdtemp(path.join(os.tmpdir(), 'storage-sqlite-corrupt-prod-'));
    const dbPath = path.join(runtimeDir, 'assessment-storage.sqlite');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    const { StorageCorruptionError, createSqliteStoragePort } = await importStorageModule();
    const storage = createSqliteStoragePort({
      getDataDir: () => runtimeDir,
      getUserId: async () => 'user-alpha',
    });

    await storage.writeJsonFile('prompts', [{ id: 'prompt-1' }]);
    const database = new DatabaseSync(dbPath);
    database
      .prepare('UPDATE json_storage SET value = ? WHERE file = ? AND scope = ?')
      .run('{"broken": ', 'prompts', 'global');
    database.close();

    await expect(storage.readJsonFile('prompts', [] as Array<{ id: string }>)).rejects.toThrow(StorageCorruptionError);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failing closed.'),
      expect.any(SyntaxError),
    );
  });
});
