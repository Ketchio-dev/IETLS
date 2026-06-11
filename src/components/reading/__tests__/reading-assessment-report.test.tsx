import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReadingAssessmentReport } from '@/lib/services/reading/types';

import { ReadingAssessmentReportPanel } from '../reading-assessment-report';

function buildReport(): ReadingAssessmentReport {
  return {
    reportId: 'report-1',
    attemptId: 'attempt-1',
    setId: 'reading-set-1',
    setTitle: 'Urban bee corridors and rooftop planting',
    rawScore: 5,
    maxScore: 6,
    percentage: 83,
    scoreLabel: '5/6',
    summary: 'Solid reading set pass with one weakness left to revisit.',
    accuracyByQuestionType: [
      { type: 'multiple_choice', correct: 2, total: 2, accuracy: 100 },
      { type: 'true_false_not_given', correct: 1, total: 2, accuracy: 50 },
    ],
    questionReviews: [
      {
        questionId: 'q-1',
        type: 'true_false_not_given',
        prompt: 'Statement 1',
        userAnswer: 'FALSE',
        acceptedAnswers: ['TRUE'],
        isCorrect: false,
        explanation: 'The passage supports the statement directly.',
        evidenceHint: 'Paragraph 2 explains the opposite outcome.',
      },
    ],
    strengths: ['Best question type so far: multiple_choice (2/2).'],
    risks: ['Weakest question type: true_false_not_given (1/2).'],
    nextSteps: ['Redo one true_false_not_given item and explain the evidence sentence out loud.'],
    warnings: ['Reading scores here are set results, not official IELTS scores.'],
    generatedAt: '2026-03-29T04:00:00.000Z',
  };
}

describe('ReadingAssessmentReportPanel', () => {
  it('renders a retry CTA when a retry href is provided', () => {
    render(
      <ReadingAssessmentReportPanel
        report={buildReport()}
        retryHref="/reading?setId=reading-set-1&attemptId=attempt-1&retry=incorrect"
      />,
    );

    expect(screen.getByRole('link', { name: /retry missed questions/i })).toHaveAttribute(
      'href',
      '/reading?setId=reading-set-1&attemptId=attempt-1&retry=incorrect',
    );
    expect(screen.getByRole('link', { name: /continue to writing practice/i })).toBeInTheDocument();
  });
});
