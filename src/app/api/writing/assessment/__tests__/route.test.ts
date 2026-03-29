import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt } from '@/lib/fixtures/writing';
import type { SubmitWritingAssessmentResult } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  submitDefaultAssessment: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  submitDefaultAssessment: mocks.submitDefaultAssessment,
}));

import { POST } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/writing/assessment', () => {
  it('returns 400 for invalid JSON before reaching the assessment workspace', async () => {
    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: '{invalid-json',
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body.' });
    expect(mocks.submitDefaultAssessment).not.toHaveBeenCalled();
  });

  it('returns 422 for malformed payloads before reaching the assessment workspace', async () => {
    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: samplePrompt.id,
        response: ['not-a-string'],
        timeSpentMinutes: '15',
      }),
    }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
    expect(mocks.submitDefaultAssessment).not.toHaveBeenCalled();
  });

  it('returns 422 for negative timeSpentMinutes before reaching the assessment workspace', async () => {
    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: samplePrompt.id,
        response: 'This response is comfortably longer than fifty characters so the route can reject the invalid duration value.',
        timeSpentMinutes: -1,
      }),
    }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
    expect(mocks.submitDefaultAssessment).not.toHaveBeenCalled();
  });

  it('returns a 400 payload from the shared assessment workspace for short responses', async () => {
    const invalid: SubmitWritingAssessmentResult = {
      ok: false,
      error: 'Provide at least 250 words for Task 2 writing.',
      status: 400,
    };
    mocks.submitDefaultAssessment.mockResolvedValue(invalid);

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
      error: 'Provide at least 250 words for Task 2 writing.',
    });
    expect(mocks.submitDefaultAssessment).toHaveBeenCalledWith({
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
    mocks.submitDefaultAssessment.mockResolvedValue(missing);

    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: 'missing-prompt',
        response: 'This response is long enough to pass the minimum length gate because it contains substantially more than the required number of words for the current task, but it still targets no real prompt in the bank and should therefore return the missing prompt error from the shared workspace path.',
        timeSpentMinutes: 12,
      }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Unknown writing prompt requested.' });
    expect(mocks.submitDefaultAssessment).toHaveBeenCalledWith({
      promptId: 'missing-prompt',
      response: 'This response is long enough to pass the minimum length gate because it contains substantially more than the required number of words for the current task, but it still targets no real prompt in the bank and should therefore return the missing prompt error from the shared workspace path.',
      timeSpentMinutes: 12,
    });
  });

  it.each([
    ['task 1', sampleTask1Prompt],
    ['task 2', samplePrompt],
  ])('preserves the %s flow when returning a scored submission payload', async (_label, prompt) => {
    const responseText = `This is a sufficiently detailed ${prompt.taskType} response that clears the length gate while keeping the route test focused on assessment-workspace wiring and task-type handoff.`;
    const longResponse = prompt.taskType === 'task-1'
      ? `${responseText} Overall, the biggest change happens in the morning, while a smaller peak appears in the evening. Passenger numbers then fall again at night, and the report groups the main movements instead of listing every figure separately.`
      : `${responseText} Governments should prioritise public transport because it reduces congestion, lowers emissions, and improves access for workers who cannot rely on private cars. New roads still matter for safety and freight, but targeted investment in buses, rail, and metro networks usually brings wider social benefits in the long term.`;
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
        response: longResponse,
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

    mocks.submitDefaultAssessment.mockResolvedValue({
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
    expect(mocks.submitDefaultAssessment).toHaveBeenCalledWith({
      promptId: prompt.id,
      response: responseText,
      timeSpentMinutes: payload.submission.timeSpentMinutes,
    });
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('passes through scorer-unavailable responses from the shared assessment workspace', async () => {
    mocks.submitDefaultAssessment.mockResolvedValue({
      ok: false,
      error: 'Live writing scorer timed out. Please try again.',
      status: 503,
    } satisfies SubmitWritingAssessmentResult);

    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: samplePrompt.id,
        response: 'This response is comfortably longer than fifty characters so the route can surface provider outages.',
        timeSpentMinutes: 18,
      }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Live writing scorer timed out. Please try again.',
    });
  });

  it('fails closed when the writing assessment workspace throws unexpectedly', async () => {
    mocks.submitDefaultAssessment.mockRejectedValue(new Error('boom'));

    const response = await POST(new Request('http://localhost/api/writing/assessment', {
      method: 'POST',
      body: JSON.stringify({
        promptId: samplePrompt.id,
        response: 'This response is comfortably longer than fifty characters so the route can surface unexpected scoring failures as a generic internal error.',
        timeSpentMinutes: 18,
      }),
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to score the Writing assessment right now.',
    });
  });
});
