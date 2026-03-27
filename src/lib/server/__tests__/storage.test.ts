import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

async function importStorageModule() {
  return import('../storage');
}

afterEach(() => {
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
