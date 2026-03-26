import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleAssessmentReport, samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import type {
  SubmitWritingAssessmentInput,
  SubmitWritingAssessmentResult,
  WritingDashboardPageData,
  WritingPracticePageData,
  WritingTaskData,
} from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadWritingPracticePageData: vi.fn(),
  loadWritingDashboardPageData: vi.fn(),
  loadWritingTaskData: vi.fn(),
  submitWritingAssessment: vi.fn(),
}));

vi.mock('@/lib/services/writing/application-service', () => ({
  loadWritingPracticePageData: mocks.loadWritingPracticePageData,
  loadWritingDashboardPageData: mocks.loadWritingDashboardPageData,
  loadWritingTaskData: mocks.loadWritingTaskData,
  submitWritingAssessment: mocks.submitWritingAssessment,
}));

import {
  defaultAssessmentModuleId,
  getDefaultAssessmentWorkspace,
  listAssessmentWorkspaces,
  loadDefaultAssessmentDashboardPageData,
  loadDefaultAssessmentPracticePageData,
  loadDefaultAssessmentTaskData,
  submitDefaultAssessment,
} from '../assessment-workspace';

afterEach(() => {
  vi.clearAllMocks();
});

describe('assessment workspace registry', () => {
  it('registers writing as the default assessment workspace with stable routes', () => {
    expect(defaultAssessmentModuleId).toBe('writing');
    expect(getDefaultAssessmentWorkspace()).toEqual({
      id: 'writing',
      label: 'IELTS Academic Writing',
      summary:
        'Timed writing practice with persisted reports, dashboard trends, and Gemini 3 Flash scoring by default.',
      routes: {
        practice: '/',
        dashboard: '/dashboard',
        taskApi: '/api/writing/task',
        assessmentApi: '/api/writing/assessment',
      },
    });
    expect(listAssessmentWorkspaces()).toEqual([getDefaultAssessmentWorkspace()]);
  });

  it('delegates the default page loaders to the writing application-service boundary', async () => {
    const practicePageData: WritingPracticePageData = {
      prompts: writingPromptBank,
      prompt: samplePrompt,
      initialHistory: [],
      initialSavedAssessments: [],
      initialReport: sampleAssessmentReport,
      fallbackReports: {},
    };
    const dashboardPageData: WritingDashboardPageData = {
      prompts: writingPromptBank,
      recentSavedAttempts: [],
      summary: {
        totalAttempts: 0,
        taskCounts: { 'task-1': 0, 'task-2': 0 },
        latestRange: null,
        bestBand: null,
        averageBand: null,
        averageWordCount: 0,
        totalPracticeMinutes: 0,
        activeDays: 0,
        latestAttemptAt: null,
        providerBreakdown: [],
        criterionSummaries: [],
        strongestCriterion: null,
        weakestCriterion: null,
      },
      progress: {
        direction: 'insufficient-data',
        label: 'Not enough data',
        detail: 'Complete more attempts to unlock progress tracking.',
        delta: 0,
        latestRange: null,
        attemptsConsidered: 0,
        averageWordCount: 0,
      },
      studyPlan: {
        version: 2,
        generatedAt: '2026-03-26T19:00:00.000Z',
        basedOnSubmissionId: null,
        attemptsConsidered: 0,
        headline: 'Start with one Task 1 and one Task 2 attempt',
        focus: 'Seed the workspace with two saved attempts before comparing trends.',
        horizonLabel: 'First 2 sessions',
        recommendedSessionLabel: '1 x Task 1 + 1 x Task 2',
        steps: [],
        carryForward: [],
      },
    };
    const taskData: WritingTaskData = {
      prompt: samplePrompt,
      prompts: writingPromptBank,
    };

    mocks.loadWritingPracticePageData.mockResolvedValue(practicePageData);
    mocks.loadWritingDashboardPageData.mockResolvedValue(dashboardPageData);
    mocks.loadWritingTaskData.mockResolvedValue(taskData);

    await expect(
      loadDefaultAssessmentPracticePageData({ promptId: samplePrompt.id, attemptId: 'attempt-1' }),
    ).resolves.toEqual(practicePageData);
    await expect(loadDefaultAssessmentDashboardPageData()).resolves.toEqual(dashboardPageData);
    await expect(loadDefaultAssessmentTaskData()).resolves.toEqual(taskData);

    expect(mocks.loadWritingPracticePageData).toHaveBeenCalledWith({
      promptId: samplePrompt.id,
      attemptId: 'attempt-1',
    });
    expect(mocks.loadWritingDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.loadWritingTaskData).toHaveBeenCalledWith();
  });

  it('delegates assessment submission to the registered writing module', async () => {
    const response =
      'This response is intentionally long enough to pass the submission gate while keeping the registry delegation test focused.';
    const input: SubmitWritingAssessmentInput = {
      promptId: samplePrompt.id,
      response,
      timeSpentMinutes: 24,
    };
    const result: SubmitWritingAssessmentResult = {
      ok: true,
      payload: {
        report: sampleAssessmentReport,
        submission: {
          submissionId: 'submission-1',
          promptId: samplePrompt.id,
          taskType: samplePrompt.taskType,
          response,
          wordCount: 210,
          timeSpentMinutes: 24,
          createdAt: '2026-03-26T19:00:00.000Z',
        },
        recentAttempts: [],
        savedAssessments: [],
      },
    };

    mocks.submitWritingAssessment.mockResolvedValue(result);

    await expect(submitDefaultAssessment(input)).resolves.toEqual(result);
    expect(mocks.submitWritingAssessment).toHaveBeenCalledWith(input);
  });
});
