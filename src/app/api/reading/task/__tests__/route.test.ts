import { afterEach, describe, expect, it, vi } from 'vitest';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';

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

describe('GET /api/reading/task', () => {
  it('returns placeholder task data through the shared assessment workspace', async () => {
    const payload = { moduleId: 'reading', title: 'Reading module placeholder' };
    mocks.loadAssessmentTaskData.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.loadAssessmentTaskData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID);
    await expect(response.json()).resolves.toEqual(payload);
  });
});
