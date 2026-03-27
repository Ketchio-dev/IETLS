import { afterEach, describe, expect, it, vi } from 'vitest';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import type { SubmitPlaceholderAssessmentResult } from '@/lib/services/assessment-placeholders/application-service';

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

describe('POST /api/listening/assessment', () => {
  it('returns 400 for malformed JSON body', async () => {
    const response = await POST(new Request('http://localhost/api/listening/assessment', {
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

  it('returns the placeholder 501 payload', async () => {
    const result: SubmitPlaceholderAssessmentResult = {
      ok: false,
      error: 'IELTS Academic Listening Placeholder is a placeholder module for now; no scoring pipeline is implemented yet.',
      status: 501,
    };
    mocks.submitAssessmentForModule.mockResolvedValue(result);

    const body = { note: 'stub' };
    const response = await POST(new Request('http://localhost/api/listening/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(501);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(LISTENING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual({ error: result.error });
  });
});
