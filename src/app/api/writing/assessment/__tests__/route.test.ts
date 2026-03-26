import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt } from '@/lib/fixtures/writing';

const mocks = vi.hoisted(() => ({
  seedPrompt: vi.fn(),
  saveAssessmentResult: vi.fn(),
  runAssessmentPipeline: vi.fn(),
}));

vi.mock('@/lib/server/writing-assessment-repository', () => ({
  seedPrompt: mocks.seedPrompt,
  saveAssessmentResult: mocks.saveAssessmentResult,
}));

vi.mock('@/lib/services/assessment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/assessment')>();

  return {
    ...actual,
    runAssessmentPipeline: mocks.runAssessmentPipeline,
  };
});

import { POST } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/writing/assessment', () => {
  it('rejects short responses before touching persistence or scoring', async () => {
    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: samplePrompt.id,
        response: 'Too short',
        timeSpentMinutes: 5,
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Provide a promptId and at least 50 characters of writing.',
    });
    expect(mocks.seedPrompt).not.toHaveBeenCalled();
    expect(mocks.runAssessmentPipeline).not.toHaveBeenCalled();
    expect(mocks.saveAssessmentResult).not.toHaveBeenCalled();
  });

  it('rejects unknown prompts before running the scoring pipeline', async () => {
    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'missing-prompt',
        response: 'This response is long enough to pass the minimum length gate, but it targets no real prompt in the bank.',
        timeSpentMinutes: 12,
      }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Unknown writing prompt requested.' });
    expect(mocks.seedPrompt).not.toHaveBeenCalled();
    expect(mocks.runAssessmentPipeline).not.toHaveBeenCalled();
    expect(mocks.saveAssessmentResult).not.toHaveBeenCalled();
  });

  it.each([
    ['task 1', sampleTask1Prompt],
    ['task 2', samplePrompt],
  ])('preserves the %s flow when persisting a scored submission', async (_label, prompt) => {
    const responseText = `This is a sufficiently detailed ${prompt.taskType} response that clears the length gate while keeping the route test focused on persistence wiring and task-type handoff.`;
    const pipelineResult = {
      submission: {
        submissionId: `submission-${prompt.id}`,
        promptId: prompt.id,
        taskType: prompt.taskType,
        response: responseText,
        wordCount: 260,
        timeSpentMinutes: prompt.taskType === 'task-1' ? 20 : 40,
        createdAt: '2026-03-26T16:00:00.000Z',
      },
      report: {
        ...sampleAssessmentReport,
        promptId: prompt.id,
        taskType: prompt.taskType,
        summary: `${prompt.taskType} report summary`,
      },
    };
    const stored = {
      ...pipelineResult,
      recentAttempts: [
        {
          submissionId: `submission-${prompt.id}`,
          promptId: prompt.id,
          taskType: prompt.taskType,
          overallBand: 6.5,
          overallBandRange: { lower: 6, upper: 6.5 },
          confidence: 'medium' as const,
          estimatedWordCount: 260,
          summary: `${prompt.taskType} report summary`,
          createdAt: '2026-03-26T16:00:00.000Z',
        },
      ],
      savedAssessments: [
        {
          submissionId: `submission-${prompt.id}`,
          promptId: prompt.id,
          taskType: prompt.taskType,
          createdAt: '2026-03-26T16:00:00.000Z',
          timeSpentMinutes: prompt.taskType === 'task-1' ? 20 : 40,
          wordCount: 260,
          report: {
            ...sampleAssessmentReport,
            promptId: prompt.id,
            taskType: prompt.taskType,
            summary: `${prompt.taskType} report summary`,
          },
        },
      ],
    };

    mocks.seedPrompt.mockResolvedValue(prompt);
    mocks.runAssessmentPipeline.mockResolvedValue(pipelineResult);
    mocks.saveAssessmentResult.mockResolvedValue(stored);

    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: prompt.id,
        response: responseText,
        timeSpentMinutes: pipelineResult.submission.timeSpentMinutes,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.seedPrompt).toHaveBeenCalledWith(prompt);
    expect(mocks.runAssessmentPipeline).toHaveBeenCalledWith(prompt, {
      promptId: prompt.id,
      taskType: prompt.taskType,
      response: responseText,
      timeSpentMinutes: pipelineResult.submission.timeSpentMinutes,
    });
    expect(mocks.saveAssessmentResult).toHaveBeenCalledWith(pipelineResult);
    await expect(response.json()).resolves.toEqual({
      report: stored.report,
      submission: stored.submission,
      recentAttempts: stored.recentAttempts,
      savedAssessments: stored.savedAssessments,
    });
  });
});
