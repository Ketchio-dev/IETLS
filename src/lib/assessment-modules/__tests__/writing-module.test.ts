import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadWritingDashboardPageData: vi.fn(),
  loadWritingPracticePageData: vi.fn(),
  loadWritingTaskData: vi.fn(),
  submitWritingAssessment: vi.fn(),
}));

vi.mock('@/lib/services/writing/application-service', () => ({
  loadWritingDashboardPageData: mocks.loadWritingDashboardPageData,
  loadWritingPracticePageData: mocks.loadWritingPracticePageData,
  loadWritingTaskData: mocks.loadWritingTaskData,
  submitWritingAssessment: mocks.submitWritingAssessment,
}));

import { createWritingAssessmentModule } from '../writing-module';

afterEach(() => {
  vi.clearAllMocks();
});

describe('writing assessment module', () => {
  it('delegates the generic workspace hooks back to the existing writing application service', async () => {
    const assessmentModule = createWritingAssessmentModule();
    const searchParams = { promptId: 'task-1-prompt', attemptId: 'attempt-9' };
    const submission = {
      promptId: 'task-2-prompt',
      response: 'This is a long enough response for the writing module delegation check.',
      timeSpentMinutes: 37,
    };

    mocks.loadWritingPracticePageData.mockResolvedValue({ kind: 'practice' });
    mocks.loadWritingDashboardPageData.mockResolvedValue({ kind: 'dashboard' });
    mocks.loadWritingTaskData.mockResolvedValue({ kind: 'task' });
    mocks.submitWritingAssessment.mockResolvedValue({ ok: true, payload: { kind: 'submit' } });

    await expect(assessmentModule.loadPracticePageData(searchParams)).resolves.toEqual({ kind: 'practice' });
    await expect(assessmentModule.loadDashboardPageData()).resolves.toEqual({ kind: 'dashboard' });
    await expect(assessmentModule.loadTaskData()).resolves.toEqual({ kind: 'task' });
    await expect(assessmentModule.submitAssessment(submission)).resolves.toEqual({ ok: true, payload: { kind: 'submit' } });

    expect(mocks.loadWritingPracticePageData).toHaveBeenCalledWith(searchParams);
    expect(mocks.loadWritingDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.loadWritingTaskData).toHaveBeenCalledWith();
    expect(mocks.submitWritingAssessment).toHaveBeenCalledWith(submission);
  });
});
