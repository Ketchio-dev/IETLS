import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_FILES = {
  prompts: 'writing-prompts.json',
  assessments: 'writing-assessments.json',
  studyPlan: 'writing-study-plan.json',
} as const;

const defaultDataDir = path.join('data', 'runtime');

export type StorageFile = keyof typeof STORAGE_FILES;

export function getDataDir() {
  return process.env.IELTS_DATA_DIR ?? defaultDataDir;
}

export async function ensureDataDir() {
  await mkdir(getDataDir(), { recursive: true });
  return getDataDir();
}

function resolveStorageFilePath(dir: string, file: StorageFile) {
  return path.join(dir, STORAGE_FILES[file]);
}

export async function readJsonFile<T>(file: StorageFile, fallback: T): Promise<T> {
  const dir = await ensureDataDir();
  const filePath = resolveStorageFilePath(dir, file);

  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(file: StorageFile, value: T) {
  const dir = await ensureDataDir();
  const filePath = resolveStorageFilePath(dir, file);
  await writeFile(filePath, JSON.stringify(value, null, 2));
  return filePath;
}
