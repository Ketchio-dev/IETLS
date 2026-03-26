import { describe, expect, it } from 'vitest';

import { sampleSpeakingSavedSessions } from '@/lib/fixtures/speaking';
import { createSpeakingAssessmentRepository } from '@/lib/server/speaking-assessment-repository';
import type { JsonStoragePort, StorageFile } from '@/lib/server/storage';

function createInMemoryStoragePort(): JsonStoragePort {
  const files = new Map<StorageFile, unknown>();

  return {
    async readJsonFile<T>(file: StorageFile, fallback: T) {
      return files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
    },
    async writeJsonFile<T>(file: StorageFile, value: T) {
      files.set(file, structuredClone(value));
      return `memory://${file}`;
    },
  };
}

describe('speaking assessment repository', () => {
  it('stores and lists saved speaking sessions in reverse chronological order', async () => {
    const repository = createSpeakingAssessmentRepository(createInMemoryStoragePort());

    await repository.saveSession(sampleSpeakingSavedSessions[2]!, 10);
    await repository.saveSession(sampleSpeakingSavedSessions[0]!, 10);

    const sessions = await repository.listSavedSessions(10);

    expect(sessions).toHaveLength(3);
    expect(sessions[0]?.sessionId).toBe(sampleSpeakingSavedSessions[0]!.sessionId);
    expect(sessions[2]?.sessionId).toBe(sampleSpeakingSavedSessions[2]!.sessionId);
  });
});
