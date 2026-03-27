import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_FILES = {
  prompts: 'writing-prompts.json',
  assessments: 'writing-assessments.json',
  studyPlan: 'writing-study-plan.json',
  speakingSessions: 'speaking-sessions.json',
  readingPrivateImports: 'reading-private-imports.json',
  readingAttempts: 'reading-attempts.json',
} as const;

const defaultDataDir = path.join('data', 'runtime');

export type StorageFile = keyof typeof STORAGE_FILES;
export type JsonStorageUpdater<T> = (current: T) => Promise<T> | T;
export interface JsonStoragePort {
  readJsonFile<T>(file: StorageFile, fallback: T): Promise<T>;
  writeJsonFile<T>(file: StorageFile, value: T): Promise<string>;
  updateJsonFile<T>(file: StorageFile, fallback: T, update: JsonStorageUpdater<T>): Promise<T>;
}

export class StorageUpdateError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageUpdateError';
  }
}

export function getDataDir() {
  return process.env.IELTS_DATA_DIR ?? defaultDataDir;
}

function resolveStorageFilePath(dir: string, file: StorageFile) {
  return path.join(dir, STORAGE_FILES[file]);
}

async function ensureStorageDir(resolveDataDir: () => string) {
  const dir = resolveDataDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

const storageWriteQueues = new Map<string, Promise<void>>();

function queueStorageWrite<T>(filePath: string, operation: () => Promise<T>) {
  const previous = storageWriteQueues.get(filePath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const release = current.then(
    () => undefined,
    () => undefined,
  );

  storageWriteQueues.set(filePath, release);
  void release.finally(() => {
    if (storageWriteQueues.get(filePath) === release) {
      storageWriteQueues.delete(filePath);
    }
  });

  return current;
}

async function parseJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  let raw: string;

  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return fallback;
    }
    console.error(`[storage] Failed to read ${filePath}:`, error);
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (parseError) {
    console.error(`[storage] Corrupted JSON in ${filePath}, returning fallback.`, parseError);
    return fallback;
  }
}

async function readJsonFileForUpdate<T>(filePath: string, fallback: T): Promise<T> {
  let raw: string;

  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return fallback;
    }

    console.error(`[storage] Failed to read ${filePath}:`, error);
    throw new StorageUpdateError(`[storage] Failed to read ${filePath}.`, { cause: error });
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] Corrupted JSON in ${filePath}.`, error);
    throw new StorageUpdateError(`[storage] Corrupted JSON in ${filePath}.`, { cause: error });
  }
}

async function writeJsonFileAtomically<T>(filePath: string, value: T) {
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const tempHandle = await open(tempFilePath, 'w');

  try {
    await tempHandle.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await tempHandle.sync();
  } finally {
    await tempHandle.close();
  }

  try {
    await rename(tempFilePath, filePath);
  } catch (error) {
    await rm(tempFilePath, { force: true }).catch(() => undefined);
    throw error;
  }

  return filePath;
}

export async function ensureDataDir() {
  return ensureStorageDir(getDataDir);
}

export function createFileStoragePort({
  getDataDir: resolveDataDir = getDataDir,
}: {
  getDataDir?: () => string;
} = {}): JsonStoragePort {
  return {
    async readJsonFile<T>(file: StorageFile, fallback: T): Promise<T> {
      const dir = await ensureStorageDir(resolveDataDir);
      const filePath = resolveStorageFilePath(dir, file);
      return parseJsonFile(filePath, fallback);
    },

    async writeJsonFile<T>(file: StorageFile, value: T) {
      const filePath = resolveStorageFilePath(resolveDataDir(), file);

      return queueStorageWrite(filePath, async () => {
        await ensureStorageDir(resolveDataDir);
        return writeJsonFileAtomically(filePath, value);
      });
    },

    async updateJsonFile<T>(file: StorageFile, fallback: T, update: JsonStorageUpdater<T>) {
      const filePath = resolveStorageFilePath(resolveDataDir(), file);

      return queueStorageWrite(filePath, async () => {
        await ensureStorageDir(resolveDataDir);
        const current = await readJsonFileForUpdate(filePath, fallback);
        const next = await update(structuredClone(current));
        await writeJsonFileAtomically(filePath, next);
        return next;
      });
    },
  };
}

const defaultStoragePort = createFileStoragePort();

export function getStoragePort() {
  return defaultStoragePort;
}

export async function readJsonFile<T>(file: StorageFile, fallback: T): Promise<T> {
  return defaultStoragePort.readJsonFile(file, fallback);
}

export async function writeJsonFile<T>(file: StorageFile, value: T) {
  return defaultStoragePort.writeJsonFile(file, value);
}
