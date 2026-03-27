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

function buildReadingDashboardPageData(): ReadingDashboardPageData {
  return {
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
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingDashboardPage', () => {
  it('hydrates the reading dashboard through the shared assessment workspace', async () => {
    const pageData = buildReadingDashboardPageData();
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    render(await ReadingDashboardPage());

    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID);
    expect(mocks.dashboardSpy).toHaveBeenCalledWith(pageData);
  });

  it('renders a reading breadcrumb, overview header, and cross-dashboard tabs', async () => {
    const pageData = buildReadingDashboardPageData();
    pageData.availableSets = [{ id: 'set-1', title: 'Set 1', sourceLabel: 'Private', sourceFile: 'set-1.json', importedAt: '2026-03-27T00:00:00.000Z', questionCount: 6, passageWordCount: 550, types: ['multiple_choice'] }];
    pageData.dashboardSummary.totalAttempts = 2;
    mocks.loadAssessmentDashboardPageData.mockResolvedValue(pageData);

    const { container } = render(await ReadingDashboardPage());

    const breadcrumb = container.querySelector('nav.page-breadcrumb.page-breadcrumb--reading');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb!.textContent).toContain('Home');
    expect(breadcrumb!.textContent).toContain('Reading');
    expect(breadcrumb!.textContent).toContain('Dashboard');

    const header = container.querySelector('.dashboard-header-section--reading');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('Reading dashboard');
    expect(header!.textContent).toContain('2 attempts tracked across 1 imported set');
    expect(header!.querySelector('.dashboard-resume-cta--reading')?.getAttribute('href')).toBe('/reading');

    const tabs = container.querySelector('.dashboard-tab-bar');
    expect(tabs).not.toBeNull();
    expect(tabs!.textContent).toContain('Reading dashboard');
    expect(tabs!.textContent).toContain('Writing dashboard');
  });
});
