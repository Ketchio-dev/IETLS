import { describe, expect, it } from 'vitest';

import { sampleSpeakingSavedSessions } from '@/lib/fixtures/speaking';
import { createSpeakingAssessmentRepository } from '@/lib/server/speaking-assessment-repository';
import type { JsonStoragePort, JsonStorageUpdater, StorageFile } from '@/lib/server/storage';

function createInMemoryStoragePort(): JsonStoragePort {
  const files = new Map<StorageFile, unknown>();
  const queues = new Map<StorageFile, Promise<void>>();

  function queueWrite<T>(file: StorageFile, operation: () => Promise<T>) {
    const previous = queues.get(file) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const release = current.then(
      () => undefined,
      () => undefined,
    );

    queues.set(file, release);
    void release.finally(() => {
      if (queues.get(file) === release) {
        queues.delete(file);
      }
    });

    return current;
  }

  return {
    async readJsonFile<T>(file: StorageFile, fallback: T) {
      return files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
    },
    async writeJsonFile<T>(file: StorageFile, value: T) {
      return queueWrite(file, async () => {
        files.set(file, structuredClone(value));
        return `memory://${file}`;
      });
    },
    async updateJsonFile<T>(file: StorageFile, fallback: T, update: JsonStorageUpdater<T>) {
      return queueWrite(file, async () => {
        const current = files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
        const next = await update(structuredClone(current));
        files.set(file, structuredClone(next));
        return next;
      });
    },
  };
}

describe('speaking assessment repository', () => {
  it('stores and lists saved speaking sessions in reverse chronological order', async () => {
    const repository = createSpeakingAssessmentRepository(createInMemoryStoragePort(), sampleSpeakingSavedSessions, {
      demoSeedsEnabled: true,
    });

    await repository.saveSession(sampleSpeakingSavedSessions[2]!, 10);
    await repository.saveSession(sampleSpeakingSavedSessions[0]!, 10);

    const sessions = await repository.listSavedSessions(10);

    expect(sessions).toHaveLength(3);
    expect(sessions[0]?.sessionId).toBe(sampleSpeakingSavedSessions[0]!.sessionId);
    expect(sessions[2]?.sessionId).toBe(sampleSpeakingSavedSessions[2]!.sessionId);
  });

  it('preserves concurrent session saves without dropping either result', async () => {
    const repository = createSpeakingAssessmentRepository(createInMemoryStoragePort(), sampleSpeakingSavedSessions, {
      demoSeedsEnabled: true,
    });

    await Promise.all([
      repository.saveSession(sampleSpeakingSavedSessions[1]!, 10),
      repository.saveSession(sampleSpeakingSavedSessions[2]!, 10),
    ]);

    const sessions = await repository.listSavedSessions(10);

    expect(sessions.map((session) => session.sessionId)).toEqual([
      sampleSpeakingSavedSessions[0]!.sessionId,
      sampleSpeakingSavedSessions[1]!.sessionId,
      sampleSpeakingSavedSessions[2]!.sessionId,
    ]);
  });

  it('does not auto-seed sample sessions when demo mode is disabled', async () => {
    const repository = createSpeakingAssessmentRepository(createInMemoryStoragePort(), sampleSpeakingSavedSessions, {
      demoSeedsEnabled: false,
    });

    const sessions = await repository.listSavedSessions(10);

    expect(sessions).toEqual([]);
  });
});
