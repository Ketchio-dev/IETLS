import { readCompiledReadingPrivateBank } from '@/lib/server/reading-private-import-repository';
import type { ImportedReadingSet, PrivateReadingImportBankPayload } from '@/lib/services/reading-imports/types';
import type { ReadingAttemptSnapshot } from '@/lib/services/reading/types';

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';
import { sampleReadingSets } from '@/lib/fixtures/reading';

const READING_ATTEMPTS_FILE: StorageFile = 'readingAttempts';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortAttempts(attempts: ReadingAttemptSnapshot[]) {
  return attempts.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export interface ReadingAssessmentRepository {
  readImportedBank(): Promise<PrivateReadingImportBankPayload>;
  listSets(): Promise<ImportedReadingSet[]>;
  getSet(setId: string): Promise<ImportedReadingSet | null>;
  listSavedAttempts(limit?: number): Promise<ReadingAttemptSnapshot[]>;
  saveAttempt(attempt: ReadingAttemptSnapshot, limit?: number): Promise<ReadingAttemptSnapshot[]>;
}

export function createReadingAssessmentRepository(
  storage: JsonStoragePort = getStoragePort(),
): ReadingAssessmentRepository {
  async function readImportedBank() {
    const imported = await readCompiledReadingPrivateBank();
    if (imported.sets.length > 0) {
      return clone(imported);
    }

    return {
      ...clone(imported),
      importedAt: imported.importedAt ?? 'seeded-bundled-sample',
      sourceFiles: imported.sourceFiles.length > 0 ? clone(imported.sourceFiles) : ['bundled-sample'],
      sets: clone(sampleReadingSets),
    };
  }

  async function listSets() {
    const bank = await readImportedBank();
    return bank.sets.map((set) => clone(set));
  }

  async function getSet(setId: string) {
    const sets = await listSets();
    return sets.find((set) => set.id === setId) ?? null;
  }

  async function readStoredAttempts() {
    const stored = await storage.readJsonFile<ReadingAttemptSnapshot[]>(READING_ATTEMPTS_FILE, []);
    return sortAttempts(stored);
  }

  async function listSavedAttempts(limit = 12) {
    const stored = await readStoredAttempts();
    return stored.slice(0, limit).map((attempt) => clone(attempt));
  }

  async function saveAttempt(attempt: ReadingAttemptSnapshot, limit = 12) {
    const stored = await readStoredAttempts();
    const updated = sortAttempts([clone(attempt), ...stored.filter((item) => item.attemptId !== attempt.attemptId)]);
    await storage.writeJsonFile(READING_ATTEMPTS_FILE, updated);
    return updated.slice(0, limit).map((item) => clone(item));
  }

  return {
    readImportedBank,
    listSets,
    getSet,
    listSavedAttempts,
    saveAttempt,
  };
}
