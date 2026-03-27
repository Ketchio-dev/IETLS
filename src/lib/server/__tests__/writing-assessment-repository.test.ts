import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import {
  createWritingAssessmentRepository,
  getDashboardStudyPlan,
  listPrompts,
  listRecentAttempts,
  saveAssessmentResult,
  seedPrompt,
  seedPrompts,
} from '@/lib/server/writing-assessment-repository';
import type { JsonStoragePort, JsonStorageUpdater, StorageFile } from '@/lib/server/storage';
import { runAssessmentPipeline } from '@/lib/services/assessment';

let tempDir = '';

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

describe('writing assessment repository', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ielts-writing-repo-'));
    vi.stubEnv('IELTS_DATA_DIR', tempDir);
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'mock');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('persists prompts and recent attempts for later sessions', async () => {
    await seedPrompt(samplePrompt);
    const result = await runAssessmentPipeline(samplePrompt, {
      promptId: samplePrompt.id,
      taskType: samplePrompt.taskType,
      response: 'In my opinion, public transport should receive more funding because it reduces congestion and pollution. However, some road investment still matters for freight and safety. Overall, governments should prioritise transit while targeting only the worst road bottlenecks.',
      timeSpentMinutes: 29,
    });

    const stored = await saveAssessmentResult(result);
    const attempts = await listRecentAttempts(5);

    expect(stored.report.promptId).toBe(samplePrompt.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.submissionId).toBe(stored.submission.submissionId);
  });

  it('seeds and lists the prompt bank', async () => {
    await seedPrompts(writingPromptBank);

    const prompts = await listPrompts();

    expect(prompts).toHaveLength(writingPromptBank.length);
    expect(prompts.map((item) => item.id)).toEqual(writingPromptBank.map((item) => item.id));
  });

  it('persists and reuses the dashboard study plan snapshot', async () => {
    await seedPrompts(writingPromptBank);
    const prompts = await listPrompts();

    const firstPlan = await getDashboardStudyPlan(prompts, []);
    const secondPlan = await getDashboardStudyPlan(prompts, []);

    expect(secondPlan).toEqual(firstPlan);
    expect(firstPlan.version).toBe(2);
    expect(firstPlan.attemptsConsidered).toBe(0);
    expect(firstPlan.steps).toHaveLength(3);
  });

  it('supports swapping the file adapter for an injected storage port', async () => {
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());

    await repository.seedPrompts(writingPromptBank);
    const prompts = await repository.listPrompts();
    const result = await runAssessmentPipeline(samplePrompt, {
      promptId: samplePrompt.id,
      taskType: samplePrompt.taskType,
      response:
        'Public transport deserves more funding because it moves large numbers of commuters efficiently, lowers congestion, and cuts pollution. Roads still matter for freight and emergency access, but cities usually gain more when buses, rail, and coordinated ticketing make daily travel faster and more reliable.',
      timeSpentMinutes: 31,
    });

    const stored = await repository.saveAssessmentResult(result);
    const attempts = await repository.listRecentAttempts(5);
    const savedAssessments = await repository.listSavedAssessments(5);
    const firstPlan = await repository.getDashboardStudyPlan(prompts, savedAssessments);
    const secondPlan = await repository.getDashboardStudyPlan(prompts, savedAssessments);

    expect(stored.report.promptId).toBe(samplePrompt.id);
    expect(attempts).toHaveLength(1);
    expect(savedAssessments[0]?.submissionId).toBe(stored.submission.submissionId);
    expect(secondPlan).toEqual(firstPlan);
    expect(firstPlan.basedOnSubmissionId).toBe(stored.submission.submissionId);
  });

  it('preserves concurrent prompt seeds without dropping either prompt', async () => {
    const repository = createWritingAssessmentRepository();
    const [firstPrompt, secondPrompt] = writingPromptBank;

    await Promise.all([repository.seedPrompt(firstPrompt!), repository.seedPrompt(secondPrompt!)]);

    const prompts = await repository.listPrompts();

    expect(prompts.map((item) => item.id).sort()).toEqual([firstPrompt!.id, secondPrompt!.id].sort());
  });
});
