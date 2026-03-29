import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

import { ReadingDashboard } from '../reading-dashboard';

afterEach(() => {
  cleanup();
});

const set = sampleReadingSets[0]!;

function buildPopulatedData(): ReadingDashboardPageData {
  return {
    moduleId: 'reading',
    moduleLabel: 'IELTS Academic Reading',
    summary: 'Review reading practice by set, timing, and question type. Use each saved set to build accuracy and pacing for the full exam.',
    routeBase: '/reading',
    importSummary: {
      sourceDir: 'data/private-reading-imports',
      importCommand: 'npm run reading:import-private',
      detectedSourceFiles: ['sample.json'],
      compiledSourceFiles: ['sample.json'],
      importedSetCount: 1,
      latestImportedAt: '2026-03-26T12:00:00.000Z',
      compiledOutputLabel: 'data/runtime/reading-private-imports.json',
      sets: [],
      warnings: [],
    },
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
    recentAttempts: [
      {
        attemptId: 'attempt-1',
        setId: set.id,
        setTitle: set.title,
        createdAt: '2026-03-26T12:00:00.000Z',
        timeSpentSeconds: 320,
        answers: {},
        report: {
          reportId: 'report-1',
          attemptId: 'attempt-1',
          setId: set.id,
          setTitle: set.title,
          rawScore: 5,
          maxScore: set.questions.length,
          percentage: 83,
          scoreLabel: '5/6',
          summary: 'Solid reading set pass with one weakness left to revisit.',
          accuracyByQuestionType: [
            { type: 'multiple_choice', correct: 2, total: 2, accuracy: 100 },
            { type: 'true_false_not_given', correct: 1, total: 2, accuracy: 50 },
          ],
          questionReviews: [],
          strengths: [],
          risks: [],
          nextSteps: [],
          warnings: [],
          generatedAt: '2026-03-26T12:00:00.000Z',
        },
      },
    ],
    dashboardSummary: {
      totalAttempts: 1,
      averagePercentage: 83,
      bestScoreLabel: '5/6',
      latestAttemptAt: '2026-03-26T12:00:00.000Z',
      averageTimeSpentSeconds: 320,
      strongestType: { type: 'multiple_choice', correct: 2, total: 2, accuracy: 100 },
      weakestType: { type: 'true_false_not_given', correct: 1, total: 2, accuracy: 50 },
    },
    studyFocus: ['Redo one true_false_not_given item from Urban bee corridors and rooftop planting and justify the answer from the passage.'],
  };
}

function buildEmptyData(): ReadingDashboardPageData {
  return {
    moduleId: 'reading',
    moduleLabel: 'IELTS Academic Reading',
    summary: 'Review reading practice by set, timing, and question type. Use each saved set to build accuracy and pacing for the full exam.',
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
    studyFocus: ['Complete one set to unlock study guidance.'],
  };
}

describe('ReadingDashboard', () => {
  it('renders metrics, study focus, and resume links for saved sets', () => {
    render(<ReadingDashboard {...buildPopulatedData()} />);

    expect(screen.getByRole('heading', { name: /reading practice metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /next action/i })).toBeInTheDocument();
    expect(screen.getAllByText(/redo one true_false_not_given item/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review this set again/i })).toBeInTheDocument();
  });

  it('renders strongest and weakest question types when attempts exist', () => {
    render(<ReadingDashboard {...buildPopulatedData()} />);

    expect(screen.getByText(/strongest:/i)).toBeInTheDocument();
    expect(screen.getByText(/multiple choice/i)).toBeInTheDocument();
    expect(screen.getByText(/weakest:/i)).toBeInTheDocument();
    expect(screen.getByText(/true false not given/i)).toBeInTheDocument();
  });

  it('renders empty-state copy when no attempts exist', () => {
    render(<ReadingDashboard {...buildEmptyData()} />);

    expect(screen.getAllByText(/no attempts yet/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no saved attempts yet\. head to the practice page to start your first set/i)).toBeInTheDocument();
    expect(screen.getByText(/no scored attempts yet/i)).toBeInTheDocument();
  });

  it('uses user-facing reading bank copy instead of developer import instructions', () => {
    render(<ReadingDashboard {...buildPopulatedData()} />);

    expect(screen.getByRole('heading', { name: /available practice sets/i })).toBeInTheDocument();
    expect(screen.getByText(/your current practice sets are ready/i)).toBeInTheDocument();
    expect(screen.getByText(/collections: 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/private imports/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/local bank status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/run npm run reading:import-private/i)).not.toBeInTheDocument();
  });
});
