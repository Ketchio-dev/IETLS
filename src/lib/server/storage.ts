import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
export interface JsonStoragePort {
  readJsonFile<T>(file: StorageFile, fallback: T): Promise<T>;
  writeJsonFile<T>(file: StorageFile, value: T): Promise<string>;
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
    },

    async writeJsonFile<T>(file: StorageFile, value: T) {
      const dir = await ensureStorageDir(resolveDataDir);
      const filePath = resolveStorageFilePath(dir, file);
      await writeFile(filePath, JSON.stringify(value, null, 2));
      return filePath;
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
