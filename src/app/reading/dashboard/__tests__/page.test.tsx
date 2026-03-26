import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

const mocks = vi.hoisted(() => ({
  loadAssessmentDashboardPageData: vi.fn(),
  dashboardSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentDashboardPageData: mocks.loadAssessmentDashboardPageData,
}));

vi.mock('@/components/reading/reading-dashboard', () => ({
  ReadingDashboard: (props: unknown) => {
    mocks.dashboardSpy(props);
    return null;
  },
}));

import ReadingDashboardPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingDashboardPage', () => {
  it('hydrates the reading dashboard through the shared assessment workspace', async () => {
    const pageData: ReadingDashboardPageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      summary: 'Review private Reading drill performance by imported set, timing, and question type.',
      routeBase: '/reading',
      importSummary: {
        sourceDir: 'data/private-reading-imports',
        importCommand: 'npm run reading:import-private',
        detectedSourceFiles: [],
        compiledSourceFiles: [],
        importedSetCount: 0,
        latestImportedAt: null,
        compiledOutputLabel: 'data/runtime/reading-private-imports.json',
        sets: [],
        warnings: [],
      },
      availableSets: [],
      recentAttempts: [],
      dashboardSummary: {
        totalAttempts: 0,
        averagePercentage: null,
        bestScoreLabel: null,
        latestAttemptAt: null,
        averageTimeSpentSeconds: 0,
        strongestType: null,
        weakestType: null,
      },
      studyFocus: ['Complete one drill.'],
    };
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await ReadingDashboardPage());

    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });
});
