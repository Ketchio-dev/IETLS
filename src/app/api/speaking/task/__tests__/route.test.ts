import { afterEach, describe, expect, it, vi } from 'vitest';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleSpeakingPrompt, speakingPromptBank } from '@/lib/fixtures/speaking';

const mocks = vi.hoisted(() => ({
  loadAssessmentTaskData: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentTaskData: mocks.loadAssessmentTaskData,
}));

import { GET } from '../route';

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/speaking/task', () => {
  it('returns prompt-bank task data through the shared assessment workspace', async () => {
    const payload = { prompt: sampleSpeakingPrompt, prompts: speakingPromptBank };
    mocks.loadAssessmentTaskData.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.loadAssessmentTaskData).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
