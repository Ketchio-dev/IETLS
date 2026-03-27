import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  ProgressSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  WritingDashboardSummary,
  WritingPrompt,
} from '@/lib/domain';
import { sampleAssessmentReport, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';

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
  criterionSummaries: [
    {
      criterion: 'Lexical Resource',
      averageBand: 6.8,
      latestBand: 7,
      previousBand: 6.5,
      delta: 0.5,
      trend: 'improving',
      attemptsConsidered: 4,
      recentBands: [6.2, 6.4, 6.5, 7],
      taskTypes: ['task-1', 'task-2'],
    },
    {
      criterion: 'Task Response',
      averageBand: 5.9,
      latestBand: 6,
      previousBand: 5.5,
      delta: 0.5,
      trend: 'improving',
      attemptsConsidered: 3,
      recentBands: [5.2, 5.5, 6],
      taskTypes: ['task-2'],
    },
  ],
  strongestCriterion: {
    criterion: 'Lexical Resource',
    averageBand: 6.8,
    latestBand: 7,
    previousBand: 6.5,
    delta: 0.5,
    trend: 'improving',
    attemptsConsidered: 4,
    recentBands: [6.2, 6.4, 6.5, 7],
    taskTypes: ['task-1', 'task-2'],
  },
  weakestCriterion: {
    criterion: 'Task Response',
    averageBand: 5.9,
    latestBand: 6,
    previousBand: 5.5,
    delta: 0.5,
    trend: 'improving',
    attemptsConsidered: 3,
    recentBands: [5.2, 5.5, 6],
    taskTypes: ['task-2'],
  },
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
  version: 2,
  generatedAt: '2026-03-26T17:05:00.000Z',
  basedOnSubmissionId: 'attempt-4',
  attemptsConsidered: 4,
  headline: 'Prioritise Task Response next',
  focus: 'Use the latest report to make your argument structure more explicit.',
  horizonLabel: 'Next 3 practice blocks',
  recommendedSessionLabel: '38 min from latest attempt',
  steps: [
    {
      id: 'repair-task-response',
      title: 'Repair the weakest criterion first',
      detail: 'Rewrite one body paragraph so the topic sentence matches the thesis exactly.',
      actions: [
        'Rewrite one body paragraph so the topic sentence matches the thesis exactly.',
        'Check that each example supports the position stated in the introduction.',
      ],
      criterion: 'Task Response',
      taskType: 'task-2',
      targetRange: { lower: 6.5, upper: 7 },
      promptId: writingPromptBank[3]!.id,
      submissionId: 'attempt-4',
      actionLabel: 'Resume latest report',
      sessionLabel: 'Session 1',
    },
    {
      id: 'balance-practice',
      title: 'Add one Task 1 benchmark',
      detail: 'Keep your task coverage balanced with one timed Task 1 response this week.',
      actions: [
        'Aim for 150+ words in 20 minutes.',
        'Write the overview before the detail paragraphs.',
      ],
      criterion: 'Overall',
      taskType: 'task-1',
      targetRange: null,
      promptId: sampleTask1Prompt.id,
      submissionId: null,
      actionLabel: 'Open Task 1 prompt',
      sessionLabel: 'Session 2',
    },
  ],
  carryForward: ['Keep the introduction concise and explicit.'],
};

const prompts: WritingPrompt[] = writingPromptBank;

const recentSavedAttempts: SavedAssessmentSnapshot[] = [
  {
    submissionId: 'attempt-4',
    promptId: writingPromptBank[3]!.id,
    taskType: 'task-2',
    createdAt: '2026-03-26T17:00:00.000Z',
    timeSpentMinutes: 38,
    wordCount: 286,
    report: {
      ...sampleAssessmentReport,
      promptId: writingPromptBank[3]!.id,
      reportId: 'report-4',
      essayId: 'attempt-4',
      taskType: 'task-2',
      summary: 'Latest Task 2 report summary',
      overallBand: 7,
      overallBandRange: { lower: 6.5, upper: 7 },
      evaluationTrace: {
        ...sampleAssessmentReport.evaluationTrace,
        scorerProvider: 'openrouter',
        scorerModel: 'google/gemini-3-flash',
        configuredProvider: 'openrouter',
        usedMockFallback: false,
      },
    },
  },
  {
    submissionId: 'attempt-3',
    promptId: sampleTask1Prompt.id,
    taskType: 'task-1',
    createdAt: '2026-03-25T17:00:00.000Z',
    timeSpentMinutes: 19,
    wordCount: 181,
    report: {
      ...sampleAssessmentReport,
      promptId: sampleTask1Prompt.id,
      reportId: 'report-3',
      essayId: 'attempt-3',
      taskType: 'task-1',
      summary: 'Task 1 inspection summary',
      overallBand: 6.5,
      overallBandRange: { lower: 6, upper: 6.5 },
      evaluationTrace: {
        ...sampleAssessmentReport.evaluationTrace,
        scorerProvider: 'openrouter',
        scorerModel: 'google/gemini-3-flash',
        configuredProvider: 'openrouter',
        usedMockFallback: false,
      },
    },
  },
];

describe('WritingDashboard', () => {
  it('renders aggregated metrics, criterion trends, compare support, and the persisted study plan', () => {
    render(createElement(WritingDashboard, { summary, progress, prompts, recentSavedAttempts, studyPlan }));

    expect(screen.getByRole('heading', { name: /track writing momentum across every saved assessment/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /aggregated writing metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /inspect and resume from the dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /criterion trend summaries/i })).toBeInTheDocument();
    expect(screen.getAllByText(/improving/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 task 1 • 3 task 2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\+0\.5 band vs previous/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/recent lexical resource bands: 6\.2, 6\.4, 6\.5, 7\.0/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /prioritise task response next/i })).toBeInTheDocument();
    expect(
      screen.getAllByText(/rewrite one body paragraph so the topic sentence matches the thesis exactly/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/38 min from latest attempt/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume latest report/i })).toHaveAttribute(
      'href',
      `/writing?promptId=${writingPromptBank[3]!.id}&attemptId=attempt-4`,
    );
    expect(screen.getByRole('link', { name: /open task 1 prompt/i })).toHaveAttribute(
      'href',
      `/writing?promptId=${sampleTask1Prompt.id}`,
    );
    expect(screen.getByRole('link', { name: /return to practice shell/i })).toHaveAttribute('href', '/writing');

    fireEvent.click(screen.getByRole('button', { name: /inspect here/i }));

    expect(screen.getAllByText(/task 1 inspection summary/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /resume this attempt/i })).toHaveAttribute(
      'href',
      `/writing?promptId=${sampleTask1Prompt.id}&attemptId=attempt-3`,
    );

    fireEvent.click(screen.getByRole('button', { name: /compare to inspected/i }));

    expect(screen.getByText(/compare against online education versus classroom learning/i)).toBeInTheDocument();
    expect(screen.getByText(/-0\.5 overall band/i)).toBeInTheDocument();
    expect(screen.getAllByText(/lexical resource/i).length).toBeGreaterThan(0);
  });
});
