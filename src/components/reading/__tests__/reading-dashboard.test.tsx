import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';

import { ReadingDashboard } from '../reading-dashboard';

describe('ReadingDashboard', () => {
  it('renders metrics, study focus, and resume links for saved drills', () => {
    const set = sampleReadingSets[0]!;
    const pageData: ReadingDashboardPageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      summary: 'Review private Reading drill performance by imported set, timing, and question type.',
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
            summary: 'Solid private drill pass with one weakness left to revisit.',
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

    render(<ReadingDashboard {...pageData} />);

    expect(screen.getByRole('heading', { name: /track score movement, pacing, and question-type accuracy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reading drill metrics/i })).toBeInTheDocument();
    expect(screen.getAllByText(/redo one true_false_not_given item/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume in practice shell/i })).toBeInTheDocument();
  });
});
