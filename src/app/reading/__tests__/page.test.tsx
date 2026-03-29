import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingPracticePageData } from '@/lib/services/reading/types';

const mocks = vi.hoisted(() => ({
  loadAssessmentPracticePageData: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentPracticePageData: mocks.loadAssessmentPracticePageData,
}));

vi.mock('@/components/reading/reading-practice-shell', () => ({
  ReadingPracticeShell: (props: unknown) => {
    mocks.shellSpy(props);
    return null;
  },
}));

import ReadingPage from '../page';

function buildReadingPageData(): ReadingPracticePageData {
  const set = sampleReadingSets[0]!;
  return {
    moduleId: 'reading',
    moduleLabel: 'IELTS Academic Reading',
    statusLabel: 'Reading set ready',
    summary: 'One-passage Reading practice sets are now available from your local import bank.',
    routeBase: '/reading',
    availableSets: [
      {
        id: set.id,
        title: set.title,
        sourceLabel: set.sourceLabel,
        sourceFile: set.sourceFile,
        importedAt: set.importedAt,
        questionCount: set.questions.length,
        passageWordCount: set.passageWordCount,
        types: Array.from(new Set(set.questions.map((question) => question.type))),
      },
    ],
    importedSets: [set],
    activeSet: set,
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
    initialReport: null,
    initialAnswers: {},
    initialTimeSpentSeconds: 0,
    recentAttempts: [],
    savedAttempts: [],
    initialSetId: set.id,
    initialAttemptId: null,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingPage', () => {
  it('hydrates the reading practice page through the shared assessment workspace', async () => {
    const pageData = buildReadingPageData();
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    render(await ReadingPage({ searchParams: Promise.resolve({}) }));

    expect(mocks.loadAssessmentPracticePageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID, {});
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });

  it('wraps content in the shared app-shell layout with a breadcrumb', async () => {
    mocks.loadAssessmentPracticePageData.mockResolvedValue(buildReadingPageData());
    const { container } = render(await ReadingPage({ searchParams: Promise.resolve({}) }));

    expect(container.querySelector('main.app-shell')).not.toBeNull();
    const breadcrumb = container.querySelector('nav.page-breadcrumb.page-breadcrumb--reading');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb!.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(breadcrumb!.querySelector('a.breadcrumb-link')?.getAttribute('href')).toBe('/');
    expect(breadcrumb!.querySelector('.breadcrumb-current')?.textContent).toBe('Reading practice');
  });

  it('renders a reading overview header with counts and a dashboard shortcut', async () => {
    const pageData = buildReadingPageData();
    pageData.recentAttempts = [
      {
        attemptId: 'attempt-1',
        setId: pageData.activeSet!.id,
        setTitle: pageData.activeSet!.title,
        createdAt: '2026-03-27T13:00:00.000Z',
        rawScore: 31,
        maxScore: 40,
        percentage: 77.5,
        scoreLabel: '31 / 40',
        timeSpentSeconds: 1110,
      },
    ];
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    const { container } = render(await ReadingPage({ searchParams: Promise.resolve({}) }));

    const header = container.querySelector('.practice-page-header--reading');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('IELTS Academic Reading');
    expect(header!.textContent).toContain('Practice IELTS Reading with scored practice sets');
    expect(header!.textContent).toContain('1 set');
    expect(header!.textContent).toContain('1 recent attempt');
    expect(header!.querySelector('a.practice-meta-link')?.getAttribute('href')).toBe('/reading/dashboard');
  });
});
