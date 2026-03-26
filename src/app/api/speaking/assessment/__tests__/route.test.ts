import { afterEach, describe, expect, it, vi } from 'vitest';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleSpeakingAssessmentReport, sampleSpeakingPrompt } from '@/lib/fixtures/speaking';
import type { SubmitSpeakingAssessmentResult } from '@/lib/services/speaking/types';

const mocks = vi.hoisted(() => ({
  submitAssessmentForModule: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  submitAssessmentForModule: mocks.submitAssessmentForModule,
}));

import { POST } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/speaking/assessment', () => {
  it('returns a 400 payload for short transcripts', async () => {
    const invalid: SubmitSpeakingAssessmentResult = {
      ok: false,
      error: 'Provide a promptId and at least 30 characters of transcript.',
      status: 400,
    };
    mocks.submitAssessmentForModule.mockResolvedValue(invalid);

    const body = {
      promptId: sampleSpeakingPrompt.id,
      transcript: 'Too short',
      durationSeconds: 18,
    };
    const response = await POST(new Request('http://localhost/api/speaking/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(400);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual({
      error: 'Provide a promptId and at least 30 characters of transcript.',
    });
  });

  it('returns a scored payload for valid transcripts', async () => {
    const payload: Extract<SubmitSpeakingAssessmentResult, { ok: true }>['payload'] = {
      report: sampleSpeakingAssessmentReport,
      session: {
        sessionId: 'speaking-live-9',
        promptId: sampleSpeakingPrompt.id,
        part: sampleSpeakingPrompt.part,
        createdAt: '2026-03-26T18:20:00.000Z',
        durationSeconds: 42,
        transcript:
          'I enjoy living in my city because it is convenient and there are many useful services nearby.',
        transcriptWordCount: 15,
        report: sampleSpeakingAssessmentReport,
      },
      recentSessions: [],
      savedSessions: [],
    };
    mocks.submitAssessmentForModule.mockResolvedValue({ ok: true, payload } satisfies SubmitSpeakingAssessmentResult);

    const body = {
      promptId: sampleSpeakingPrompt.id,
      transcript:
        'I enjoy living in my city because it is convenient and there are many useful services nearby.',
      durationSeconds: 42,
    };
    const response = await POST(new Request('http://localhost/api/speaking/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(200);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
