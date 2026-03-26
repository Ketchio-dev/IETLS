import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadSpeakingDashboardPageData: vi.fn(),
  loadSpeakingPracticePageData: vi.fn(),
  loadSpeakingTaskData: vi.fn(),
  submitSpeakingAssessment: vi.fn(),
}));

vi.mock('@/lib/services/speaking/application-service', () => ({
  loadSpeakingDashboardPageData: mocks.loadSpeakingDashboardPageData,
  loadSpeakingPracticePageData: mocks.loadSpeakingPracticePageData,
  loadSpeakingTaskData: mocks.loadSpeakingTaskData,
  submitSpeakingAssessment: mocks.submitSpeakingAssessment,
}));

import { createSpeakingAssessmentModule } from '../speaking-module';

afterEach(() => {
  vi.clearAllMocks();
});

describe('speaking assessment module', () => {
  it('delegates the generic workspace hooks back to the speaking application service', async () => {
    const assessmentModule = createSpeakingAssessmentModule();
    const searchParams = { promptId: 'speaking-part-2-teacher' };
    const submission = { promptId: 'speaking-part-2-teacher', transcript: 'placeholder transcript' };

    mocks.loadSpeakingPracticePageData.mockResolvedValue({ kind: 'practice' });
    mocks.loadSpeakingDashboardPageData.mockResolvedValue({ kind: 'dashboard' });
    mocks.loadSpeakingTaskData.mockResolvedValue({ kind: 'task' });
    mocks.submitSpeakingAssessment.mockResolvedValue({ ok: false, error: 'Unknown speaking prompt requested.', status: 404 });

    await expect(assessmentModule.loadPracticePageData(searchParams)).resolves.toEqual({ kind: 'practice' });
    await expect(assessmentModule.loadDashboardPageData()).resolves.toEqual({ kind: 'dashboard' });
    await expect(assessmentModule.loadTaskData()).resolves.toEqual({ kind: 'task' });
    await expect(assessmentModule.submitAssessment(submission)).resolves.toEqual({ ok: false, error: 'Unknown speaking prompt requested.', status: 404 });

    expect(mocks.loadSpeakingPracticePageData).toHaveBeenCalledWith(searchParams);
    expect(mocks.loadSpeakingDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.loadSpeakingTaskData).toHaveBeenCalledWith();
    expect(mocks.submitSpeakingAssessment).toHaveBeenCalledWith(submission);
  });
});
