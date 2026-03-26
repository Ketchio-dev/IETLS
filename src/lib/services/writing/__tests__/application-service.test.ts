import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AssessmentPipelineResult, AssessmentReport, WritingPrompt } from '@/lib/domain';
import {
  sampleAssessmentReport,
  samplePrompt,
  sampleTask1Prompt,
  writingPromptBank,
} from '@/lib/fixtures/writing';
import { createWritingAssessmentRepository } from '@/lib/server/writing-assessment-repository';
import type { JsonStoragePort, StorageFile } from '@/lib/server/storage';
import { runAssessmentPipeline } from '@/lib/services/assessment';

import { createWritingApplicationService } from '../application-service';

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
        response:
          'This draft is comfortably longer than fifty characters so the application service can persist it.',
        timeSpentMinutes: 30,
      });

      expect(submission.ok).toBe(true);
    }

    const dashboardData = await service.loadDashboardPageData();

    expect(dashboardData.summary.totalAttempts).toBe(7);
    expect(dashboardData.recentSavedAttempts).toHaveLength(6);
    expect(dashboardData.studyPlan.basedOnSubmissionId).toBe('submission-6');
    expect(dashboardData.progress.attemptsConsidered).toBe(7);
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
      promptId: samplePrompt.id,
      response: 'too short',
      timeSpentMinutes: 12,
    });
    const missing = await service.submitAssessment({
      promptId: 'missing-prompt',
      response:
        'This response is comfortably longer than the minimum so the error comes from the prompt lookup.',
      timeSpentMinutes: 12,
    });
    const saved = await service.submitAssessment({
      promptId: samplePrompt.id,
      response:
        'This response is comfortably longer than fifty characters so the service can persist the submission.',
      timeSpentMinutes: 28,
    });

    expect(invalid).toEqual({
      ok: false,
      error: 'Provide a promptId and at least 50 characters of writing.',
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
});
