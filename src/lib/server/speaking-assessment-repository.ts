import { sampleSpeakingSavedSessions } from '@/lib/fixtures/speaking';
import type { SpeakingSessionSnapshot } from '@/lib/services/speaking/types';

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';

const SPEAKING_SESSIONS_FILE: StorageFile = 'speakingSessions';

export interface SpeakingAssessmentRepository {
  listSavedSessions(limit?: number): Promise<SpeakingSessionSnapshot[]>;
  saveSession(session: SpeakingSessionSnapshot, limit?: number): Promise<SpeakingSessionSnapshot[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortSessions(sessions: SpeakingSessionSnapshot[]) {
  return sessions.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createSpeakingAssessmentRepository(
  storage: JsonStoragePort = getStoragePort(),
  seedSessions: SpeakingSessionSnapshot[] = sampleSpeakingSavedSessions,
): SpeakingAssessmentRepository {
  async function readStoredSessions() {
    const stored = await storage.readJsonFile<SpeakingSessionSnapshot[]>(SPEAKING_SESSIONS_FILE, []);
    if (stored.length > 0) {
      return sortSessions(stored);
    }

    const seeded = sortSessions(clone(seedSessions));
    await storage.writeJsonFile(SPEAKING_SESSIONS_FILE, seeded);
    return seeded;
  }

  async function listSavedSessions(limit = 12) {
    const stored = await readStoredSessions();
    return stored.slice(0, limit).map((session) => clone(session));
  }

  async function saveSession(session: SpeakingSessionSnapshot, limit = 12) {
    const updated = await storage.updateJsonFile(
      SPEAKING_SESSIONS_FILE,
      sortSessions(clone(seedSessions)),
      (stored) => sortSessions([clone(session), ...stored.filter((item) => item.sessionId !== session.sessionId)]),
    );
    return updated.slice(0, limit).map((item) => clone(item));
  }

  return {
    listSavedSessions,
    saveSession,
  };
}

const defaultSpeakingAssessmentRepository = createSpeakingAssessmentRepository();

export const listSpeakingSavedSessions = defaultSpeakingAssessmentRepository.listSavedSessions;
export const saveSpeakingSession = defaultSpeakingAssessmentRepository.saveSession;
