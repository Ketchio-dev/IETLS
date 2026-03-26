import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LISTENING_ASSESSMENT_MODULE_ID,
  READING_ASSESSMENT_MODULE_ID,
  SPEAKING_ASSESSMENT_MODULE_ID,
  WRITING_ASSESSMENT_MODULE_ID,
} from '@/lib/assessment-modules/registry';
import { sampleAssessmentReport, samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import type {
  SubmitWritingAssessmentInput,
  SubmitWritingAssessmentResult,
  WritingDashboardPageData,
  WritingPracticePageData,
  WritingTaskData,
} from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  assessmentModule: {
    loadPracticePageData: vi.fn(),
    loadDashboardPageData: vi.fn(),
    loadTaskData: vi.fn(),
    submitAssessment: vi.fn(),
  },
  requireModule: vi.fn(),
}));

vi.mock('@/lib/assessment-modules/registry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/assessment-modules/registry')>('@/lib/assessment-modules/registry');

  return {
    ...actual,
    getAssessmentModuleRegistry: () => ({
      getModule: vi.fn(),
      listModuleIds: vi.fn(() => [
        actual.WRITING_ASSESSMENT_MODULE_ID,
        actual.SPEAKING_ASSESSMENT_MODULE_ID,
        actual.READING_ASSESSMENT_MODULE_ID,
        actual.LISTENING_ASSESSMENT_MODULE_ID,
      ]),
      requireModule: mocks.requireModule,
    }),
  };
});

import {
  defaultAssessmentModuleId,
  getAssessmentWorkspace,
  getDefaultAssessmentWorkspace,
  listAssessmentWorkspaces,
  loadAssessmentDashboardPageData,
  loadAssessmentPracticePageData,
  loadAssessmentTaskData,
  loadDefaultAssessmentDashboardPageData,
  loadDefaultAssessmentPracticePageData,
  loadDefaultAssessmentTaskData,
  submitAssessmentForModule,
  submitDefaultAssessment,
} from '../assessment-workspace';

afterEach(() => {
  vi.clearAllMocks();
  mocks.requireModule.mockReturnValue(mocks.assessmentModule);
});

describe('assessment workspace registry', () => {
  it('keeps writing default while exposing speaking, reading, and listening workspaces', () => {
    expect(defaultAssessmentModuleId).toBe(WRITING_ASSESSMENT_MODULE_ID);
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
    expect(getAssessmentWorkspace(SPEAKING_ASSESSMENT_MODULE_ID)).toEqual({
      id: 'speaking',
      label: 'IELTS Academic Speaking Alpha',
      summary:
        'Transcript-first speaking practice that validates the second module seam before audio capture lands.',
      routes: {
        practice: '/speaking',
        dashboard: '/speaking/dashboard',
        taskApi: '/api/speaking/task',
        assessmentApi: '/api/speaking/assessment',
      },
    });
    expect(getAssessmentWorkspace(READING_ASSESSMENT_MODULE_ID)).toEqual({
      id: 'reading',
      label: 'IELTS Academic Reading',
      summary: 'Passage-centred drill practice with deterministic scoring, evidence-backed review, and imported local bank support.',
      routes: {
        practice: '/reading',
        dashboard: '/reading/dashboard',
        taskApi: '/api/reading/task',
        assessmentApi: '/api/reading/assessment',
      },
    });
    expect(getAssessmentWorkspace(LISTENING_ASSESSMENT_MODULE_ID)).toEqual({
      id: 'listening',
      label: 'IELTS Academic Listening Placeholder',
      summary: 'Placeholder route coverage for future Listening scripts, audio, and timing-validation work.',
      routes: {
        practice: '/listening',
        dashboard: '/listening/dashboard',
        taskApi: '/api/listening/task',
        assessmentApi: '/api/listening/assessment',
      },
    });
    expect(listAssessmentWorkspaces()).toEqual([
      getDefaultAssessmentWorkspace(),
      getAssessmentWorkspace(SPEAKING_ASSESSMENT_MODULE_ID),
      getAssessmentWorkspace(READING_ASSESSMENT_MODULE_ID),
      getAssessmentWorkspace(LISTENING_ASSESSMENT_MODULE_ID),
    ]);
  });

  it('delegates the default writing page loaders through the registered module', async () => {
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

    mocks.assessmentModule.loadPracticePageData.mockResolvedValue(practicePageData);
    mocks.assessmentModule.loadDashboardPageData.mockResolvedValue(dashboardPageData);
    mocks.assessmentModule.loadTaskData.mockResolvedValue(taskData);

    await expect(
      loadDefaultAssessmentPracticePageData({ promptId: samplePrompt.id, attemptId: 'attempt-1' }),
    ).resolves.toEqual(practicePageData);
    await expect(loadDefaultAssessmentDashboardPageData()).resolves.toEqual(dashboardPageData);
    await expect(loadDefaultAssessmentTaskData()).resolves.toEqual(taskData);
  });

  it('delegates generic loaders and submissions for non-default modules too', async () => {
    mocks.assessmentModule.loadPracticePageData.mockResolvedValue({ moduleId: 'reading' });
    mocks.assessmentModule.loadDashboardPageData.mockResolvedValue({ moduleId: 'reading' });
    mocks.assessmentModule.loadTaskData.mockResolvedValue({ moduleId: 'reading' });
    mocks.assessmentModule.submitAssessment.mockResolvedValue({ ok: true, payload: { moduleId: 'reading', scored: true } });

    await expect(loadAssessmentPracticePageData(READING_ASSESSMENT_MODULE_ID)).resolves.toEqual({ moduleId: 'reading' });
    await expect(loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID)).resolves.toEqual({ moduleId: 'reading' });
    await expect(loadAssessmentTaskData(READING_ASSESSMENT_MODULE_ID)).resolves.toEqual({ moduleId: 'reading' });
    await expect(
      submitAssessmentForModule(READING_ASSESSMENT_MODULE_ID, { setId: 'urban-bee-corridors', answers: {}, timeSpentSeconds: 300 }),
    ).resolves.toEqual({
      ok: true,
      payload: { moduleId: 'reading', scored: true },
    });
  });

  it('delegates assessment submission to the default writing module', async () => {
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

    mocks.assessmentModule.submitAssessment.mockResolvedValue(result);

    await expect(submitDefaultAssessment(input)).resolves.toEqual(result);
    expect(mocks.requireModule).toHaveBeenCalledWith(defaultAssessmentModuleId);
    expect(mocks.assessmentModule.submitAssessment).toHaveBeenCalledWith(input);
  });
});
