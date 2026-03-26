import { afterEach, describe, expect, it, vi } from 'vitest';

import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt } from '@/lib/fixtures/writing';
import type { SubmitWritingAssessmentResult } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadWritingPracticePageData: vi.fn(),
  loadWritingDashboardPageData: vi.fn(),
  loadWritingTaskData: vi.fn(),
  submitWritingAssessment: vi.fn(),
}));

vi.mock('@/lib/services/writing/application-service', () => ({
  loadWritingPracticePageData: mocks.loadWritingPracticePageData,
  loadWritingDashboardPageData: mocks.loadWritingDashboardPageData,
  loadWritingTaskData: mocks.loadWritingTaskData,
  submitWritingAssessment: mocks.submitWritingAssessment,
}));

import { POST } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/writing/assessment', () => {
  it('returns a 400 payload from the shared assessment workspace for short responses', async () => {
    const invalid: SubmitWritingAssessmentResult = {
      ok: false,
      error: 'Provide a promptId and at least 50 characters of writing.',
      status: 400,
    };
    mocks.submitAssessment.mockResolvedValue(invalid);

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
    expect(mocks.submitAssessment).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID, {
      promptId: samplePrompt.id,
      response: 'Too short',
      timeSpentMinutes: 5,
    });
  });

  it('returns a 404 payload from the shared assessment workspace for unknown prompts', async () => {
    const missing: SubmitWritingAssessmentResult = {
      ok: false,
      error: 'Unknown writing prompt requested.',
      status: 404,
    };
    mocks.submitAssessment.mockResolvedValue(missing);

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
    expect(mocks.submitAssessment).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID, {
      promptId: 'missing-prompt',
      response: 'This response is long enough to pass the minimum length gate, but it targets no real prompt in the bank.',
      timeSpentMinutes: 12,
    });
  });

  it.each([
    ['task 1', sampleTask1Prompt],
    ['task 2', samplePrompt],
  ])('preserves the %s flow when returning a scored submission payload', async (_label, prompt) => {
    const responseText = `This is a sufficiently detailed ${prompt.taskType} response that clears the length gate while keeping the route test focused on assessment-workspace wiring and task-type handoff.`;
    const payload = {
      report: {
        ...sampleAssessmentReport,
        promptId: prompt.id,
        taskType: prompt.taskType,
        summary: `${prompt.taskType} report summary`,
      },
      submission: {
        submissionId: `submission-${prompt.id}`,
        promptId: prompt.id,
        taskType: prompt.taskType,
        response: responseText,
        wordCount: 260,
        timeSpentMinutes: prompt.taskType === 'task-1' ? 20 : 40,
        createdAt: '2026-03-26T16:00:00.000Z',
      },
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
    } satisfies Extract<SubmitWritingAssessmentResult, { ok: true }>['payload'];

    mocks.submitAssessment.mockResolvedValue({
      ok: true,
      payload,
    } satisfies SubmitWritingAssessmentResult);

    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: prompt.id,
        response: responseText,
        timeSpentMinutes: payload.submission.timeSpentMinutes,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.submitAssessment).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID, {
      promptId: prompt.id,
      response: responseText,
      timeSpentMinutes: payload.submission.timeSpentMinutes,
    });
    await expect(response.json()).resolves.toEqual(payload);
  });
});
