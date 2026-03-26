import { afterEach, describe, expect, it, vi } from 'vitest';

import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';

const mocks = vi.hoisted(() => ({
  loadTaskData: vi.fn(),
}));

vi.mock('@/lib/assessment-workspace', () => ({
  getAssessmentWorkspace: () => ({
    loadTaskData: mocks.loadTaskData,
  }),
}));

import { GET } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/writing/task', () => {
  it('delegates prompt loading through the shared assessment workspace', async () => {
    const payload = {
      prompt: samplePrompt,
      prompts: writingPromptBank,
    };
    mocks.loadTaskData.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.loadTaskData).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
