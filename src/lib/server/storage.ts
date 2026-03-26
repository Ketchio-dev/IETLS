import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const defaultDataDir = path.join('data', 'runtime');

export function getDataDir() {
  return process.env.IELTS_DATA_DIR ?? defaultDataDir;
}

export async function ensureDataDir() {
  await mkdir(getDataDir(), { recursive: true });
  return getDataDir();
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const dir = await ensureDataDir();
  const filePath = path.join(dir, filename);

  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filename: string, value: T) {
  const dir = await ensureDataDir();
  const filePath = path.join(dir, filename);
  await writeFile(filePath, JSON.stringify(value, null, 2));
  return filePath;
}
