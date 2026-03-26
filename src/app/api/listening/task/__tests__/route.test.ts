import { afterEach, describe, expect, it, vi } from 'vitest';

import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';

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

describe('GET /api/listening/task', () => {
  it('returns placeholder task data through the shared assessment workspace', async () => {
    const payload = { moduleId: 'listening', title: 'Listening module placeholder' };
    mocks.loadAssessmentTaskData.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.loadAssessmentTaskData).toHaveBeenCalledWith(LISTENING_ASSESSMENT_MODULE_ID);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
