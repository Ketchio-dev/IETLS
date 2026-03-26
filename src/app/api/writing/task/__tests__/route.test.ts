import { afterEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';

const mocks = vi.hoisted(() => ({
  loadDefaultAssessmentTaskData: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadDefaultAssessmentTaskData: mocks.loadDefaultAssessmentTaskData,
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
    mocks.loadDefaultAssessmentTaskData.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.loadDefaultAssessmentTaskData).toHaveBeenCalledWith();
    await expect(response.json()).resolves.toEqual(payload);
  });
});
