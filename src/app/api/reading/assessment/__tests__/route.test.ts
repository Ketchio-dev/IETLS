import { afterEach, describe, expect, it, vi } from 'vitest';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
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

describe('POST /api/reading/assessment', () => {
  it('returns the placeholder 501 payload', async () => {
    const result: SubmitPlaceholderAssessmentResult = {
      ok: false,
      error: 'IELTS Academic Reading Placeholder is a placeholder module for now; no scoring pipeline is implemented yet.',
      status: 501,
    };
    mocks.submitAssessmentForModule.mockResolvedValue(result);

    const body = { note: 'stub' };
    const response = await POST(new Request('http://localhost/api/reading/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }));

    expect(response.status).toBe(501);
    expect(mocks.submitAssessmentForModule).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID, body);
    await expect(response.json()).resolves.toEqual({ error: result.error });
  });
});
