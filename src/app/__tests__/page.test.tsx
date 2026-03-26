import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';
import type { WritingPracticePageData } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadPracticePageData: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/assessment-workspace', () => ({
  getAssessmentWorkspace: () => ({
    loadPracticePageData: mocks.loadPracticePageData,
  }),
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
  it('hydrates the dashboard resume selection from the shared assessment workspace', async () => {
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
    const pageData: WritingPracticePageData = {
      prompts: writingPromptBank,
      prompt: samplePrompt,
      initialHistory: recentAttempts,
      initialSavedAssessments: savedAssessments,
      initialAttemptId: 'attempt-task-1',
      initialPromptId: sampleTask1Prompt.id,
      initialReport: savedAssessments[0]!.report,
      fallbackReports: {},
    };

    mocks.loadPracticePageData.mockResolvedValue(pageData);

    render(await HomePage({
      searchParams: Promise.resolve({
        promptId: 'missing-prompt-id',
        attemptId: 'attempt-task-1',
      }),
    }));

    expect(mocks.loadPracticePageData).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID, {
      promptId: 'missing-prompt-id',
      attemptId: 'attempt-task-1',
    });
    expect(mocks.shellSpy).toHaveBeenCalledTimes(1);
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });

  it('passes through an explicitly requested prompt when it exists', async () => {
    const pageData: WritingPracticePageData = {
      prompts: writingPromptBank,
      prompt: samplePrompt,
      initialHistory: [],
      initialSavedAssessments: [],
      initialAttemptId: undefined,
      initialPromptId: sampleTask1Prompt.id,
      initialReport: sampleAssessmentReport,
      fallbackReports: {},
    };
    mocks.loadPracticePageData.mockResolvedValue(pageData);

    render(await HomePage({
      searchParams: {
        promptId: sampleTask1Prompt.id,
      },
    }));

    expect(mocks.loadPracticePageData).toHaveBeenCalledWith(WRITING_ASSESSMENT_MODULE_ID, {
      promptId: sampleTask1Prompt.id,
      attemptId: undefined,
    });
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
