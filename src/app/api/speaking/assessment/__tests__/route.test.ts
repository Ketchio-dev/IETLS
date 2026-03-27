import { afterEach, describe, expect, it, vi } from 'vitest';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleSpeakingAssessmentReport, sampleSpeakingPrompt } from '@/lib/fixtures/speaking';
import type { SubmitSpeakingAssessmentResult } from '@/lib/services/speaking/types';

const mocks = vi.hoisted(() => ({
  submitAssessmentForModule: vi.fn(),
  isSpeakingAlphaEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  submitAssessmentForModule: mocks.submitAssessmentForModule,
}));

vi.mock('@/lib/server/module-flags', () => ({
  isSpeakingAlphaEnabled: mocks.isSpeakingAlphaEnabled,
}));

import { POST } from '../route';

afterEach(() => {
  vi.clearAllMocks();
  mocks.isSpeakingAlphaEnabled.mockReturnValue(true);
});

describe('POST /api/speaking/assessment', () => {
  it('returns 400 for malformed JSON body', async () => {
    const response = await POST(new Request('http://localhost/api/speaking/assessment', {
      method: 'POST',
      body: '{invalid-json',
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body.' });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

  it('returns 503 when speaking alpha is disabled for this environment', async () => {
    mocks.isSpeakingAlphaEnabled.mockReturnValue(false);

    const response = await POST(
      new Request('http://localhost/api/speaking/assessment', {
        method: 'POST',
        body: JSON.stringify({
          promptId: sampleSpeakingPrompt.id,
          transcript: 'This transcript would otherwise be valid, but the module is disabled in this environment.',
          durationSeconds: 42,
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Speaking alpha is disabled in this environment until the STT/audio pipeline is ready.',
    });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

  it('returns 422 for non-object body', async () => {
    const req = { json: async () => null } as unknown as Request;
    const response = await POST(req);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

  it('returns 422 for malformed audio artifact payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/speaking/assessment', {
        method: 'POST',
        body: JSON.stringify({
          promptId: sampleSpeakingPrompt.id,
          transcript:
            'I enjoy living in my city because it is convenient and there are many useful services nearby.',
          durationSeconds: 42,
          audioArtifact: {
            fileName: 'city-response.webm',
            mimeType: 'audio/webm',
            sizeBytes: '345000',
          },
        }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

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
    const response = await POST(
      new Request('http://localhost/api/speaking/assessment', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual({
      error: 'Provide a promptId and at least 30 characters of transcript.',
    });
  });

  it('returns a scored payload for valid transcripts and audio metadata', async () => {
    const payload: Extract<SubmitSpeakingAssessmentResult, { ok: true }>['payload'] = {
      report: sampleSpeakingAssessmentReport,
      session: {
        sessionId: 'speaking-session-123e4567-e89b-12d3-a456-426614174000',
        promptId: sampleSpeakingPrompt.id,
        part: sampleSpeakingPrompt.part,
        createdAt: '2026-03-26T18:20:00.000Z',
        durationSeconds: 42,
        transcript:
          'I enjoy living in my city because it is convenient and there are many useful services nearby.',
        transcriptWordCount: 15,
        transcriptSource: 'manual',
        audioArtifact: {
          status: 'attached',
          source: 'upload',
          fileName: 'city-response.webm',
          mimeType: 'audio/webm',
          sizeBytes: 345000,
          durationSeconds: 41,
        },
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
      audioArtifact: {
        fileName: 'city-response.webm',
        mimeType: 'audio/webm',
        sizeBytes: 345000,
        durationSeconds: 41,
      },
    };
    const response = await POST(
      new Request('http://localhost/api/speaking/assessment', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('fails closed when the speaking workspace throws unexpectedly', async () => {
    mocks.submitAssessmentForModule.mockRejectedValue(new Error('boom'));

    const response = await POST(
      new Request('http://localhost/api/speaking/assessment', {
        method: 'POST',
        body: JSON.stringify({
          promptId: sampleSpeakingPrompt.id,
          transcript:
            'I enjoy living in my city because it is convenient and there are many useful services nearby.',
          durationSeconds: 42,
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Unable to score the Speaking assessment right now.' });
  });
});
