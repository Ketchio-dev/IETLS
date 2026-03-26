import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadDashboardPageData: vi.fn(),
  loadPracticePageData: vi.fn(),
  loadTaskData: vi.fn(),
  submitAssessment: vi.fn(),
}));

vi.mock('@/lib/services/reading/application-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/reading/application-service')>(
    '@/lib/services/reading/application-service',
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
  it('delegates generic workspace hooks to the real reading application service', async () => {
    const assessmentModule = createReadingAssessmentModule();
    mocks.loadPracticePageData.mockResolvedValue({ kind: 'practice' });
    mocks.loadDashboardPageData.mockResolvedValue({ kind: 'dashboard' });
    mocks.loadTaskData.mockResolvedValue({ kind: 'task' });
    mocks.submitAssessment.mockResolvedValue({ ok: false, error: 'placeholder', status: 404 });

    await expect(assessmentModule.loadPracticePageData({})).resolves.toEqual({ kind: 'practice' });
    await expect(assessmentModule.loadDashboardPageData()).resolves.toEqual({ kind: 'dashboard' });
    await expect(assessmentModule.loadTaskData()).resolves.toEqual({ kind: 'task' });
    await expect(
      assessmentModule.submitAssessment({ setId: 'urban-bee-corridors', answers: {}, timeSpentSeconds: 10 }),
    ).resolves.toEqual({
      ok: false,
      error: 'placeholder',
      status: 404,
    });
  });
});
