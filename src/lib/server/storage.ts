import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { getPersistedUserId } from './user-session';

const STORAGE_FILES = {
  prompts: 'writing-prompts.json',
  assessments: 'writing-assessments.json',
  studyPlan: 'writing-study-plan.json',
  speakingSessions: 'speaking-sessions.json',
  readingPrivateImports: 'reading-private-imports.json',
  readingAttempts: 'reading-attempts.json',
} as const;

const defaultDataDir = path.join('data', 'runtime');
const SQLITE_STORAGE_FILE = 'assessment-storage.sqlite';
const GLOBAL_STORAGE_SCOPE = 'global';
const FILE_BACKED_STORAGE_FILES = new Set<StorageFile>(['readingPrivateImports']);
const USER_SCOPED_STORAGE_FILES = new Set<StorageFile>(['assessments', 'studyPlan', 'speakingSessions', 'readingAttempts']);

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

export class StorageCorruptionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageCorruptionError';
  }
}

const TRUE_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_ENV_VALUES = new Set(['0', 'false', 'no', 'off']);

export function shouldFailFastOnStorageCorruption() {
  const configured = process.env.IETLS_FAIL_FAST_STORAGE_CORRUPTION?.trim().toLowerCase();

  if (configured && TRUE_ENV_VALUES.has(configured)) {
    return true;
  }

  if (configured && FALSE_ENV_VALUES.has(configured)) {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export function getDataDir() {
  return process.env.IELTS_DATA_DIR ?? defaultDataDir;
}

function resolveStorageFilePath(dir: string, file: StorageFile) {
  return path.join(dir, STORAGE_FILES[file]);
}

function resolveSqliteStoragePath(dir: string) {
  return path.join(dir, SQLITE_STORAGE_FILE);
}

async function ensureStorageDir(resolveDataDir: () => string) {
  const dir = resolveDataDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

const storageWriteQueues = new Map<string, Promise<void>>();

function queueStorageWrite<T>(key: string, operation: () => Promise<T>) {
  const previous = storageWriteQueues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const release = current.then(
    () => undefined,
    () => undefined,
  );

  storageWriteQueues.set(key, release);
  void release.finally(() => {
    if (storageWriteQueues.get(key) === release) {
      storageWriteQueues.delete(key);
    }
  });

  return current;
}

function handleStorageCorruption<T>(message: string, error: unknown, fallback: T): T {
  if (shouldFailFastOnStorageCorruption()) {
    console.error(`${message} Failing closed.`, error);
    throw new StorageCorruptionError(message, { cause: error });
  }

  console.error(`${message} Returning fallback.`, error);
  return fallback;
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
    return handleStorageCorruption(`[storage] Corrupted JSON in ${filePath}.`, parseError, fallback);
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

function parseJsonString<T>(raw: string, key: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    return handleStorageCorruption(`[storage] Corrupted JSON in ${key}.`, error, fallback);
  }
}

function parseJsonStringForUpdate<T>(raw: string, key: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] Corrupted JSON in ${key}.`, error);
    throw new StorageUpdateError(`[storage] Corrupted JSON in ${key}.`, { cause: error });
  }
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

const sqliteDatabaseCache = new Map<string, DatabaseSync>();

function getSqliteDatabase(dbPath: string) {
  const existing = sqliteDatabaseCache.get(dbPath);
  if (existing) {
    return existing;
  }

  const database = new DatabaseSync(dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS json_storage (
      file TEXT NOT NULL,
      scope TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (file, scope)
    );
  `);

  sqliteDatabaseCache.set(dbPath, database);
  return database;
}

function isFileBackedStorageFile(file: StorageFile) {
  return FILE_BACKED_STORAGE_FILES.has(file);
}

function isUserScopedStorageFile(file: StorageFile) {
  return USER_SCOPED_STORAGE_FILES.has(file);
}

export function createSqliteStoragePort({
  getDataDir: resolveDataDir = getDataDir,
  getUserId = getPersistedUserId,
  fileStorage = createFileStoragePort({ getDataDir: resolveDataDir }),
}: {
  getDataDir?: () => string;
  getUserId?: () => Promise<string>;
  fileStorage?: JsonStoragePort;
} = {}): JsonStoragePort {
  async function resolveScope(file: StorageFile) {
    if (!isUserScopedStorageFile(file)) {
      return GLOBAL_STORAGE_SCOPE;
    }

    const userId = (await getUserId()).trim();
    return userId || GLOBAL_STORAGE_SCOPE;
  }

  async function getDatabase() {
    const dir = await ensureStorageDir(resolveDataDir);
    return getSqliteDatabase(resolveSqliteStoragePath(dir));
  }

  async function maybeMigrateLegacyGlobalFile<T>(file: StorageFile, fallback: T, scope: string) {
    if (scope !== GLOBAL_STORAGE_SCOPE || isFileBackedStorageFile(file)) {
      return fallback;
    }

    const legacyValue = await fileStorage.readJsonFile(file, fallback);
    if (legacyValue === fallback) {
      return fallback;
    }

    await writeJsonValue(file, scope, legacyValue);
    return structuredClone(legacyValue);
  }

  async function readJsonValue<T>(file: StorageFile, scope: string, fallback: T): Promise<T> {
    const database = await getDatabase();
    const key = `${file}:${scope}`;
    const row = database.prepare('SELECT value FROM json_storage WHERE file = ? AND scope = ?').get(file, scope) as
      | { value: string }
      | undefined;

    if (!row) {
      return maybeMigrateLegacyGlobalFile(file, fallback, scope);
    }

    return parseJsonString(row.value, key, fallback);
  }

  async function writeJsonValue<T>(file: StorageFile, scope: string, value: T) {
    const database = await getDatabase();
    database
      .prepare(
        `INSERT INTO json_storage (file, scope, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(file, scope) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(file, scope, JSON.stringify(value, null, 2), new Date().toISOString());

    return resolveSqliteStoragePath(resolveDataDir());
  }

  return {
    async readJsonFile<T>(file: StorageFile, fallback: T): Promise<T> {
      if (isFileBackedStorageFile(file)) {
        return fileStorage.readJsonFile(file, fallback);
      }

      const scope = await resolveScope(file);
      return readJsonValue(file, scope, fallback);
    },

    async writeJsonFile<T>(file: StorageFile, value: T) {
      if (isFileBackedStorageFile(file)) {
        return fileStorage.writeJsonFile(file, value);
      }

      const scope = await resolveScope(file);
      const queueKey = `${resolveSqliteStoragePath(resolveDataDir())}:${file}:${scope}`;

      return queueStorageWrite(queueKey, async () => writeJsonValue(file, scope, value));
    },

    async updateJsonFile<T>(file: StorageFile, fallback: T, update: JsonStorageUpdater<T>) {
      if (isFileBackedStorageFile(file)) {
        return fileStorage.updateJsonFile(file, fallback, update);
      }

      const scope = await resolveScope(file);
      const queueKey = `${resolveSqliteStoragePath(resolveDataDir())}:${file}:${scope}`;

      return queueStorageWrite(queueKey, async () => {
        const database = await getDatabase();
        const row = database.prepare('SELECT value FROM json_storage WHERE file = ? AND scope = ?').get(file, scope) as
          | { value: string }
          | undefined;
        const current = row
          ? parseJsonStringForUpdate<T>(row.value, `${file}:${scope}`)
          : await maybeMigrateLegacyGlobalFile(file, fallback, scope);
        const next = await update(structuredClone(current));
        await writeJsonValue(file, scope, next);
        return next;
      });
    },
  };
}

const defaultStoragePort = createSqliteStoragePort();

export function getStoragePort() {
  return defaultStoragePort;
}

export async function readJsonFile<T>(file: StorageFile, fallback: T): Promise<T> {
  return defaultStoragePort.readJsonFile(file, fallback);
}

export async function writeJsonFile<T>(file: StorageFile, value: T) {
  return defaultStoragePort.writeJsonFile(file, value);
}
