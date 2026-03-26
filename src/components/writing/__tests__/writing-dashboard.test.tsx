import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';

import { WritingDashboard } from '../writing-dashboard';

afterEach(() => {
  cleanup();
});

const summary: WritingDashboardSummary = {
  totalAttempts: 4,
  taskCounts: { 'task-1': 1, 'task-2': 3 },
  latestRange: { lower: 6.5, upper: 7 },
  bestBand: 7,
  averageBand: 6.4,
  averageWordCount: 271,
  totalPracticeMinutes: 123,
  activeDays: 3,
  latestAttemptAt: '2026-03-26T17:00:00.000Z',
  providerBreakdown: [{ provider: 'Openrouter', count: 4, liveCount: 3, fallbackCount: 1 }],
  strongestCriterion: { criterion: 'Lexical Resource', averageBand: 6.8 },
  weakestCriterion: { criterion: 'Task Response', averageBand: 5.9 },
};

const progress: ProgressSummary = {
  direction: 'improving',
  label: 'Improving',
  detail: 'Your recent saved attempts are moving upward.',
  delta: 0.5,
  latestRange: { lower: 6.5, upper: 7 },
  attemptsConsidered: 4,
  averageWordCount: 271,
};

const studyPlan: StudyPlanSnapshot = {
  generatedAt: '2026-03-26T17:05:00.000Z',
  basedOnSubmissionId: 'attempt-4',
  attemptsConsidered: 4,
  headline: 'Prioritise Task Response next',
  focus: 'Use the latest report to make your argument structure more explicit.',
  steps: [
    {
      id: 'repair-task-response',
      title: 'Repair the weakest criterion first',
      detail: 'Rewrite one body paragraph so the topic sentence matches the thesis exactly.',
      taskType: 'task-2',
    },
    {
      id: 'balance-practice',
      title: 'Add one Task 1 benchmark',
      detail: 'Keep your task coverage balanced with one timed Task 1 response this week.',
      taskType: 'task-1',
    },
  ],
};

describe('WritingDashboard', () => {
  it('renders aggregated metrics and the persisted study plan', () => {
    render(createElement(WritingDashboard, { summary, progress, studyPlan }));

    expect(screen.getByRole('heading', { name: /track writing momentum across every saved assessment/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /aggregated writing metrics/i })).toBeInTheDocument();
    expect(screen.getByText(/improving/i)).toBeInTheDocument();
    expect(screen.getByText(/1 task 1 • 3 task 2/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /prioritise task response next/i })).toBeInTheDocument();
    expect(screen.getByText(/rewrite one body paragraph so the topic sentence matches the thesis exactly/i)).toBeInTheDocument();
    expect(screen.getByText(/use the latest saved report first/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to practice shell/i })).toHaveAttribute('href', '/');
  });
});
