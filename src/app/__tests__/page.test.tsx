import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';

const mocks = vi.hoisted(() => ({
  seedPrompts: vi.fn(),
  listPrompts: vi.fn(),
  listRecentAttempts: vi.fn(),
  listSavedAssessments: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/server/writing-assessment-repository', () => ({
  seedPrompts: mocks.seedPrompts,
  listPrompts: mocks.listPrompts,
  listRecentAttempts: mocks.listRecentAttempts,
  listSavedAssessments: mocks.listSavedAssessments,
}));

vi.mock('@/components/writing/writing-practice-shell', () => ({
  WritingPracticeShell: (props: unknown) => {
    mocks.shellSpy(props);
    return null;
  },
}));

import HomePage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('hydrates the dashboard resume selection from the saved assessment query params', async () => {
    const recentAttempts = [
      {
        submissionId: 'attempt-task-1',
        promptId: sampleTask1Prompt.id,
        taskType: sampleTask1Prompt.taskType,
        overallBand: 6.5,
        overallBandRange: { lower: 6, upper: 6.5 },
        confidence: 'medium' as const,
        estimatedWordCount: 181,
        summary: 'Resume target report summary',
        createdAt: '2026-03-26T15:00:00.000Z',
      },
    ];
    const savedAssessments = [
      {
        submissionId: 'attempt-task-1',
        promptId: sampleTask1Prompt.id,
        taskType: sampleTask1Prompt.taskType,
        createdAt: '2026-03-26T15:00:00.000Z',
        timeSpentMinutes: 19,
        wordCount: 181,
        report: {
          ...sampleAssessmentReport,
          promptId: sampleTask1Prompt.id,
          taskType: sampleTask1Prompt.taskType,
          summary: 'Resume target report summary',
        },
      },
    ];

    mocks.seedPrompts.mockResolvedValue(writingPromptBank);
    mocks.listPrompts.mockResolvedValue(writingPromptBank);
    mocks.listRecentAttempts.mockResolvedValue(recentAttempts);
    mocks.listSavedAssessments.mockResolvedValue(savedAssessments);

    render(await HomePage({
      searchParams: Promise.resolve({
        promptId: 'missing-prompt-id',
        attemptId: 'attempt-task-1',
      }),
    }));

    expect(mocks.seedPrompts).toHaveBeenCalledWith(writingPromptBank);
    expect(mocks.listPrompts).toHaveBeenCalledWith();
    expect(mocks.listRecentAttempts).toHaveBeenCalledWith(50);
    expect(mocks.listSavedAssessments).toHaveBeenCalledWith(50);
    expect(mocks.shellSpy).toHaveBeenCalledTimes(1);
    expect(mocks.shellSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialHistory: recentAttempts,
        initialAttemptId: 'attempt-task-1',
        initialPromptId: sampleTask1Prompt.id,
        initialReport: savedAssessments[0]?.report,
        initialSavedAssessments: savedAssessments,
        prompt: samplePrompt,
        prompts: writingPromptBank,
      }),
    );
  });

  it('prefers an explicitly requested prompt when it exists in the seeded prompt bank', async () => {
    mocks.seedPrompts.mockResolvedValue(writingPromptBank);
    mocks.listPrompts.mockResolvedValue(writingPromptBank);
    mocks.listRecentAttempts.mockResolvedValue([]);
    mocks.listSavedAssessments.mockResolvedValue([]);

    render(await HomePage({
      searchParams: {
        promptId: sampleTask1Prompt.id,
      },
    }));

    expect(mocks.shellSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialAttemptId: undefined,
        initialPromptId: sampleTask1Prompt.id,
        initialReport: sampleAssessmentReport,
        initialSavedAssessments: [],
      }),
    );
  });
});
