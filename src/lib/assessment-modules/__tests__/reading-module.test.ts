import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadDashboardPageData: vi.fn(),
  loadPracticePageData: vi.fn(),
  loadTaskData: vi.fn(),
  submitAssessment: vi.fn(),
}));

vi.mock('@/lib/services/assessment-placeholders/application-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/assessment-placeholders/application-service')>(
    '@/lib/services/assessment-placeholders/application-service',
  );

  return {
    ...actual,
    loadReadingDashboardPageData: mocks.loadDashboardPageData,
    loadReadingPracticePageData: mocks.loadPracticePageData,
    loadReadingTaskData: mocks.loadTaskData,
    submitReadingAssessment: mocks.submitAssessment,
  };
});

import { createReadingAssessmentModule } from '../reading-module';

afterEach(() => {
  vi.clearAllMocks();
});

describe('reading assessment module', () => {
  it('delegates generic workspace hooks to the reading placeholder application service', async () => {
    const assessmentModule = createReadingAssessmentModule();
    mocks.loadPracticePageData.mockResolvedValue({ kind: 'practice' });
    mocks.loadDashboardPageData.mockResolvedValue({ kind: 'dashboard' });
    mocks.loadTaskData.mockResolvedValue({ kind: 'task' });
    mocks.submitAssessment.mockResolvedValue({ ok: false, error: 'placeholder', status: 501 });

    await expect(assessmentModule.loadPracticePageData({})).resolves.toEqual({ kind: 'practice' });
    await expect(assessmentModule.loadDashboardPageData()).resolves.toEqual({ kind: 'dashboard' });
    await expect(assessmentModule.loadTaskData()).resolves.toEqual({ kind: 'task' });
    await expect(assessmentModule.submitAssessment({ note: 'placeholder' })).resolves.toEqual({
      ok: false,
      error: 'placeholder',
      status: 501,
    });
  });
});
