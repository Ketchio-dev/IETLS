import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  getDataDir,
  getStoragePort,
  type JsonStoragePort,
  type StorageFile,
} from './storage';
import type {
  ImportedReadingSetSummary,
  PrivateReadingImportBankPayload,
  PrivateReadingImportSummary,
} from '@/lib/services/reading-imports/types';

const READING_PRIVATE_IMPORTS_FILE: StorageFile = 'readingPrivateImports';
const defaultSourceDir = path.join('data', 'private-reading-imports');

function isImportSourceFile(entryName: string) {
  return entryName.endsWith('.json') && !entryName.startsWith('template.');
}

const emptyPayload: PrivateReadingImportBankPayload = {
  version: 1,
  importedAt: null,
  sourceDir: defaultSourceDir,
  sourceFiles: [],
  sets: [],
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getSourceDir() {
  return process.env.IELTS_PRIVATE_READING_IMPORTS_DIR ?? defaultSourceDir;
}

function getCompiledOutputLabel() {
  return path.join(getDataDir(), 'reading-private-imports.json');
}

function sourceFilesMatch(compiledSourceFiles: string[], detectedSourceFiles: string[]) {
  if (compiledSourceFiles.length !== detectedSourceFiles.length) {
    return false;
  }

  return compiledSourceFiles.every((fileName, index) => fileName === detectedSourceFiles[index]);
}

function toSetSummary(set: PrivateReadingImportBankPayload['sets'][number]): ImportedReadingSetSummary {
  return {
    id: set.id,
    title: set.title,
    sourceLabel: set.sourceLabel,
    sourceFile: set.sourceFile,
    importedAt: set.importedAt,
    questionCount: set.questions.length,
    passageWordCount: set.passageWordCount,
    types: Array.from(new Set(set.questions.map((question) => question.type))),
  };
}

async function listDetectedSourceFiles(sourceDir: string) {
  await mkdir(sourceDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isImportSourceFile(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export interface ReadingPrivateImportRepository {
  readCompiledBank(): Promise<PrivateReadingImportBankPayload>;
  loadSummary(limit?: number): Promise<PrivateReadingImportSummary>;
}

export function createReadingPrivateImportRepository(
  storage: JsonStoragePort = getStoragePort(),
): ReadingPrivateImportRepository {
  async function readCompiledBank() {
    const payload = await storage.readJsonFile<PrivateReadingImportBankPayload>(READING_PRIVATE_IMPORTS_FILE, emptyPayload);
    return clone({
      ...emptyPayload,
      ...payload,
      sourceDir: payload.sourceDir || getSourceDir(),
      sourceFiles: Array.isArray(payload.sourceFiles) ? payload.sourceFiles : [],
      sets: Array.isArray(payload.sets) ? payload.sets : [],
    });
  }

  async function loadSummary(limit = 6) {
    const [compiledBank, detectedSourceFiles] = await Promise.all([
      readCompiledBank(),
      listDetectedSourceFiles(getSourceDir()),
    ]);

    const warnings: string[] = [];
    if (detectedSourceFiles.length === 0) {
      warnings.push('No private import source files detected yet. Add a JSON file under data/private-reading-imports and run npm run reading:import-private.');
    }
    if (detectedSourceFiles.length > 0 && compiledBank.sets.length === 0) {
      warnings.push('Source files exist, but no compiled reading bank is loaded yet. Run npm run reading:import-private.');
    }
    if (!sourceFilesMatch(compiledBank.sourceFiles, detectedSourceFiles)) {
      warnings.push('Detected source files and compiled source files differ. Re-run the import command after editing your local bank files.');
    }

    return {
      sourceDir: getSourceDir(),
      importCommand: 'npm run reading:import-private',
      detectedSourceFiles,
      compiledSourceFiles: clone(compiledBank.sourceFiles),
      importedSetCount: compiledBank.sets.length,
      latestImportedAt: compiledBank.importedAt,
      compiledOutputLabel: getCompiledOutputLabel(),
      sets: compiledBank.sets.slice(0, limit).map(toSetSummary),
      warnings,
    } satisfies PrivateReadingImportSummary;
  }

  return {
    readCompiledBank,
    loadSummary,
  };
}

const defaultReadingPrivateImportRepository = createReadingPrivateImportRepository();

export const readCompiledReadingPrivateBank = defaultReadingPrivateImportRepository.readCompiledBank;
export const loadReadingPrivateImportSummary = defaultReadingPrivateImportRepository.loadSummary;
