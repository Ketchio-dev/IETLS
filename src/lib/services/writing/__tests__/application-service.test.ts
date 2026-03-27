import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AssessmentPipelineResult, AssessmentReport, WritingPrompt } from '@/lib/domain';
import {
  sampleAssessmentReport,
  samplePrompt,
  sampleTask1Prompt,
  writingPromptBank,
} from '@/lib/fixtures/writing';
import { createWritingAssessmentRepository } from '@/lib/server/writing-assessment-repository';
import type { JsonStoragePort, JsonStorageUpdater, StorageFile } from '@/lib/server/storage';
import { runAssessmentPipeline } from '@/lib/services/assessment';

import { createWritingApplicationService } from '../application-service';
import { WritingScorerUnavailableError } from '../scorer-adapter';

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

function createPipelineResult(prompt: WritingPrompt, index: number): AssessmentPipelineResult {
  const createdAt = `2026-03-26T1${index}:00:00.000Z`;
  const report: AssessmentReport = {
    ...sampleAssessmentReport,
    reportId: `report-${index}`,
    essayId: `essay-${index}`,
    promptId: prompt.id,
    taskType: prompt.taskType,
    overallBand: 6.5 + index * 0.1,
    summary: `Saved report ${index}`,
    generatedAt: createdAt,
    evaluationTrace: {
      ...sampleAssessmentReport.evaluationTrace,
      scoredAt: createdAt,
      scorerProvider: 'openrouter',
      scorerModel: 'google/gemini-3-flash',
      usedMockFallback: false,
    },
  };

  return {
    submission: {
      submissionId: `submission-${index}`,
      promptId: prompt.id,
      taskType: prompt.taskType,
      response:
        'This practice response is intentionally long enough to pass validation and exercise persistence.',
      timeSpentMinutes: 20 + index,
      wordCount: 180 + index,
      createdAt,
    },
    report,
    recentAttempts: [],
  };
}

function buildValidResponse(prompt: WritingPrompt) {
  return prompt.taskType === 'task-1'
    ? 'The line graph illustrates how many passengers use a London Underground station at different times of the day. Overall, the station is busiest during the morning rush hour, while a slightly smaller peak appears in the early evening. By contrast, the lowest figures are recorded at the beginning and end of the day, so the pattern is clearly dominated by commuting behaviour. At 6:00, only around 100 people use the station, but the number then rises sharply to about 200 at 7:00 before reaching a high of roughly 400 at 8:00. After this point, usage falls steadily through the late morning and hits approximately 180 by 10:00, before recovering a little to around 200 at midday. In the afternoon, the figure remains moderate for several hours, generally fluctuating between 220 and 300 passengers. It then climbs again to nearly 380 at 18:00, which is the second highest point on the graph. Following this evening peak, the number drops rapidly and returns to a low level by 22:00. Overall, the main features are the dramatic morning rise, the more limited evening recovery, and the relatively quiet periods at both ends of the day.'
    : 'Governments should prioritise public transport because buses, rail systems, and metro networks can move large numbers of people more efficiently than private cars. Better services also reduce congestion, lower emissions, and improve access for workers, students, and older residents who do not drive. Supporters of new roads often argue that road building is necessary for commerce, emergency access, and regional development. That point is partly valid, especially where freight traffic depends on safe highways and ring roads. However, expanding road capacity alone rarely solves urban congestion for long because additional space quickly attracts more vehicles. By contrast, reliable public transport changes behaviour at scale when it is affordable, frequent, and well connected to residential areas. For example, commuters are more willing to leave their cars at home if buses arrive on time, stations are safe, and ticketing is simple across different modes. Public investment in trains and buses can also support poorer households because it lowers transport costs and improves access to education, healthcare, and employment. In addition, dense cities simply cannot accommodate endless growth in car use without sacrificing public space, air quality, and productivity. While certain highway projects are justified for freight, safety, or remote communities, these cases are more limited than advocates sometimes suggest. In my view, governments should invest mainly in public transport while reserving targeted road spending for safety improvements, bottlenecks, and essential logistics corridors. This approach produces broader economic and environmental benefits over time, and it is more sustainable than responding to every transport problem by building more roads.';
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('writing application service', () => {
  it('hydrates practice-shell resume state through the application boundary', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'mock');
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());
    const service = createWritingApplicationService({ repository });
    const result = await runAssessmentPipeline(sampleTask1Prompt, {
      promptId: sampleTask1Prompt.id,
      taskType: sampleTask1Prompt.taskType,
      response:
        'The line chart shows that passenger numbers rise sharply in the morning, fall at midday, and recover later in the day before easing again at night.',
      timeSpentMinutes: 19,
    });
    const stored = await repository.saveAssessmentResult(result);

    const pageData = await service.loadPracticePageData({
      promptId: 'missing-prompt',
      attemptId: stored.submission.submissionId,
    });

    expect(pageData.prompts.map((prompt) => prompt.id)).toEqual(writingPromptBank.map((prompt) => prompt.id));
    expect(pageData.initialAttemptId).toBe(stored.submission.submissionId);
    expect(pageData.initialPromptId).toBe(sampleTask1Prompt.id);
    expect(pageData.initialReport.summary).toBe(stored.report.summary);
  });

  it('builds dashboard page data from persisted assessments and keeps the recent slice narrow', async () => {
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());
    const runPipeline = vi
      .fn()
      .mockImplementation(async (prompt: WritingPrompt) => createPipelineResult(prompt, runPipeline.mock.calls.length));
    const service = createWritingApplicationService({ repository, runPipeline });

    for (let index = 0; index < 7; index += 1) {
      const prompt = writingPromptBank[index % writingPromptBank.length] ?? samplePrompt;
      const submission = await service.submitAssessment({
        promptId: prompt.id,
        response: buildValidResponse(prompt),
        timeSpentMinutes: 30,
      });

      expect(submission.ok).toBe(true);
    }

    const dashboardData = await service.loadDashboardPageData();

    expect(dashboardData.summary.totalAttempts).toBe(7);
    expect(dashboardData.recentSavedAttempts).toHaveLength(6);
    expect(dashboardData.studyPlan.basedOnSubmissionId).toBe('submission-7');
    expect(dashboardData.progress.attemptsConsidered).toBe(3);
  });

  it('returns task payload from the seeded prompt bank', async () => {
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());
    const service = createWritingApplicationService({ repository });

    const taskData = await service.loadTaskData();

    expect(taskData.prompt.id).toBe(samplePrompt.id);
    expect(taskData.prompts.map((prompt) => prompt.id)).toEqual(writingPromptBank.map((prompt) => prompt.id));
  });

  it('validates and persists assessment submissions inside the service boundary', async () => {
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());
    const runPipeline = vi.fn(async (prompt: WritingPrompt) => createPipelineResult(prompt, 0));
    const service = createWritingApplicationService({ repository, runPipeline });

    const invalid = await service.submitAssessment({
      promptId: sampleTask1Prompt.id,
      response: 'too short',
      timeSpentMinutes: 12,
    });
    const underLengthTask2 = await service.submitAssessment({
      promptId: samplePrompt.id,
      response:
        'This draft has enough words to look like an essay, but it still stays under the official task two minimum because it does not develop enough supporting detail for a stable estimate.',
      timeSpentMinutes: 12,
    });
    const invalidDuration = await service.submitAssessment({
      promptId: samplePrompt.id,
      response: buildValidResponse(samplePrompt),
      timeSpentMinutes: Number.NaN,
    });
    const missing = await service.submitAssessment({
      promptId: 'missing-prompt',
      response:
        'This response is comfortably longer than the minimum word target so the error comes from the prompt lookup rather than the task-aware length gate inside the writing service.',
      timeSpentMinutes: 12,
    });
    const saved = await service.submitAssessment({
      promptId: samplePrompt.id,
      response: buildValidResponse(samplePrompt),
      timeSpentMinutes: 28,
    });

    expect(invalid).toEqual({
      ok: false,
      error: 'Provide at least 150 words for Task 1 writing.',
      status: 400,
    });
    expect(underLengthTask2).toEqual({
      ok: false,
      error: 'Provide at least 250 words for Task 2 writing.',
      status: 400,
    });
    expect(invalidDuration).toEqual({
      ok: false,
      error: 'Provide a finite, non-negative timeSpentMinutes value.',
      status: 400,
    });
    expect(missing).toEqual({
      ok: false,
      error: 'Unknown writing prompt requested.',
      status: 404,
    });
    expect(saved.ok).toBe(true);
    expect(runPipeline).toHaveBeenCalledTimes(1);
    if (!saved.ok) {
      throw new Error('expected persisted submission');
    }
    expect(saved.payload.savedAssessments[0]?.submissionId).toBe('submission-0');
    expect((await repository.listSavedAssessments(5))[0]?.submissionId).toBe('submission-0');
  });

  it('surfaces live-scorer failures as a retryable service error instead of persisting a mock result', async () => {
    const repository = createWritingAssessmentRepository(createInMemoryStoragePort());
    const runPipeline = vi.fn(async () => {
      throw new WritingScorerUnavailableError('Live writing scorer timed out. Please try again.');
    });
    const service = createWritingApplicationService({ repository, runPipeline });

    const result = await service.submitAssessment({
      promptId: samplePrompt.id,
      response: buildValidResponse(samplePrompt),
      timeSpentMinutes: 21,
    });

    expect(result).toEqual({
      ok: false,
      error: 'Live writing scorer timed out. Please try again.',
      status: 503,
    });
    expect(await repository.listSavedAssessments(5)).toEqual([]);
  });
});
