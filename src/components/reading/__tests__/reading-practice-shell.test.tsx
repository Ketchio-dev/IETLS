import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleReadingSets } from '@/lib/fixtures/reading';
import type { ReadingPracticePageData } from '@/lib/services/reading/types';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

import { ReadingPracticeShell } from '../reading-practice-shell';

describe('ReadingPracticeShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the passage, supported question types, and submitted report', async () => {
    const set = sampleReadingSets[0]!;
    const pageData: ReadingPracticePageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      statusLabel: 'Private drill ready',
      summary: 'One-passage private Reading drills are now available from your local import bank.',
      routeBase: '/reading',
      importedSets: [set],
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
      activeSet: set,
      importSummary: {
        sourceDir: 'data/private-reading-imports',
        importCommand: 'npm run reading:import-private',
        detectedSourceFiles: ['sample.json'],
        compiledSourceFiles: ['sample.json'],
        importedSetCount: 1,
        latestImportedAt: '2026-03-26T00:00:00.000Z',
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

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
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
              { type: 'sentence_completion', correct: 2, total: 2, accuracy: 100 },
            ],
            strengths: ['Best question type so far: multiple_choice (2/2).'],
            risks: ['Weakest question type: true_false_not_given (1/2).'],
            nextSteps: ['Redo one true_false_not_given item from the same set.'],
            warnings: [],
            generatedAt: '2026-03-26T12:00:00.000Z',
            questionReviews: set.questions.map((question, index) => ({
              questionId: question.id,
              type: question.type,
              prompt: question.prompt,
              userAnswer: index === 0 ? 'C' : 'sample',
              acceptedAnswers: question.acceptedAnswers,
              isCorrect: index !== 2,
              explanation: question.explanation,
              evidenceHint: question.evidenceHint,
            })),
          },
          attempt: {
            attemptId: 'attempt-1',
            setId: set.id,
            setTitle: set.title,
            createdAt: '2026-03-26T12:00:00.000Z',
            timeSpentSeconds: 320,
            answers: { [set.questions[0]!.id]: 'C' },
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
                { type: 'sentence_completion', correct: 2, total: 2, accuracy: 100 },
              ],
              strengths: [],
              risks: [],
              nextSteps: [],
              warnings: [],
              generatedAt: '2026-03-26T12:00:00.000Z',
              questionReviews: [],
            },
          },
          recentAttempts: [],
          savedAttempts: [],
        }),
      }),
    );

    render(<ReadingPracticeShell {...pageData} />);

    expect(screen.getByRole('heading', { name: /passage-centred reading drill/i })).toBeInTheDocument();
    expect(screen.getAllByText(/urban bee corridors and rooftop planting/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/true false not given/i)[0]).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(set.questions[3]!.prompt), { target: { value: 'water' } });
    fireEvent.click(screen.getByRole('button', { name: /submit reading drill/i }));

    await waitFor(() => expect(screen.getByText('5/6')).toBeInTheDocument());
    expect(screen.getAllByText(/accepted answers:/i)[0]).toBeInTheDocument();
  });
});
