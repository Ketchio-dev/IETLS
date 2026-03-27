import { afterEach, describe, expect, it, vi } from 'vitest';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';

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

describe('POST /api/reading/assessment', () => {
  it('returns 400 for malformed JSON body', async () => {
    const response = await POST(new Request('http://localhost/api/reading/assessment', {
      method: 'POST',
      body: '{invalid-json',
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body.' });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

  it('returns 422 for non-object body', async () => {
    const req = { json: async () => null } as unknown as Request;
    const response = await POST(req);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
    expect(mocks.submitAssessmentForModule).not.toHaveBeenCalled();
  });

  it('returns a deterministic reading report payload', async () => {
    const payload = { report: { rawScore: 5 }, savedAttempts: [], recentAttempts: [], attempt: { attemptId: 'attempt-1' } };
    mocks.submitAssessmentForModule.mockResolvedValue({ ok: true, payload });

    const body = { setId: 'urban-bee-corridors', answers: {}, timeSpentSeconds: 300 };
    const response = await POST(new Request('http://localhost/api/reading/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(200);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('returns route errors for malformed submissions', async () => {
    mocks.submitAssessmentForModule.mockResolvedValue({ ok: false, error: 'Bad request', status: 400 });

    const response = await POST(new Request('http://localhost/api/reading/assessment', {
      method: 'POST',
      body: JSON.stringify({ setId: 'urban-bee-corridors' }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Bad request' });
  });
});
