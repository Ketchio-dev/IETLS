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

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReadingPage', () => {
  it('hydrates the reading drill through the shared assessment workspace', async () => {
    const set = sampleReadingSets[0]!;
    const pageData: ReadingPracticePageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      statusLabel: 'Private drill ready',
      summary: 'One-passage private Reading drills are now available from your local import bank.',
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
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    render(await ReadingPage({ searchParams: Promise.resolve({}) }));

    expect(mocks.loadAssessmentPracticePageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID, {});
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
