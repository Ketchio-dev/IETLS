import type {
  AssessmentPipelineResult,
  AssessmentReport,
  ProgressSummary,
  RecentAttemptSummary,
  SavedAssessmentSnapshot,
  StudyPlanSnapshot,
  WritingDashboardSummary,
  WritingPrompt,
} from '@/lib/domain';
import {
  sampleAssessmentReport,
  sampleAssessmentReportsByPromptId,
  samplePrompt,
  writingPromptBank,
} from '@/lib/fixtures/writing';
import {
  createWritingAssessmentRepository,
  type WritingAssessmentRepository,
} from '@/lib/server/writing-assessment-repository';
import { runAssessmentPipeline } from '@/lib/services/assessment';

import { buildDashboardSummary } from './dashboard';
import { buildProgressSummary } from './progress-summary';
import { WritingScorerUnavailableError } from './scorer-adapter';

type SearchParamValue = string | string[] | undefined;
type AssessmentPipelineRunner = typeof runAssessmentPipeline;

export interface WritingPracticePageData {
  prompts: WritingPrompt[];
  prompt: WritingPrompt;
  initialReport: AssessmentReport;
  initialHistory: RecentAttemptSummary[];
  initialSavedAssessments: SavedAssessmentSnapshot[];
  initialPromptId?: string;
  initialAttemptId?: string;
  fallbackReports: Record<string, AssessmentReport>;
}

export interface WritingDashboardPageData {
  prompts: WritingPrompt[];
  recentSavedAttempts: SavedAssessmentSnapshot[];
  summary: WritingDashboardSummary;
  progress: ProgressSummary;
  studyPlan: StudyPlanSnapshot;
}

export interface WritingTaskData {
  prompt: WritingPrompt;
  prompts: WritingPrompt[];
}

export interface SubmitWritingAssessmentInput {
  promptId?: SearchParamValue;
  response?: SearchParamValue;
  timeSpentMinutes?: unknown;
}

export type SubmitWritingAssessmentResult =
  | {
      ok: true;
      payload: {
        report: AssessmentReport;
        submission: AssessmentPipelineResult['submission'];
        recentAttempts: RecentAttemptSummary[];
        savedAssessments: SavedAssessmentSnapshot[];
      };
    }
  | {
      ok: false;
      error: string;
      status: 400 | 404 | 503;
    };

interface WritingApplicationServiceOptions {
  repository?: WritingAssessmentRepository;
  promptBank?: WritingPrompt[];
  defaultPrompt?: WritingPrompt;
  defaultReport?: AssessmentReport;
  fallbackReports?: Record<string, AssessmentReport>;
  runPipeline?: AssessmentPipelineRunner;
}

function getSingleSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function createWritingApplicationService({
  repository = createWritingAssessmentRepository(),
  promptBank = writingPromptBank,
  defaultPrompt = samplePrompt,
  defaultReport = sampleAssessmentReport,
  fallbackReports = sampleAssessmentReportsByPromptId,
  runPipeline = runAssessmentPipeline,
}: WritingApplicationServiceOptions = {}) {
  async function ensurePromptBank() {
    await repository.seedPrompts(promptBank);
    return repository.listPrompts();
  }

  function getDefaultPrompt(prompts: WritingPrompt[]) {
    return prompts.find((item) => item.id === defaultPrompt.id) ?? prompts[0] ?? defaultPrompt;
  }

  async function loadPracticePageData(
    searchParams: Record<string, SearchParamValue> = {},
  ): Promise<WritingPracticePageData> {
    const prompts = await ensurePromptBank();
    const [initialHistory, initialSavedAssessments] = await Promise.all([
      repository.listRecentAttempts(50),
      repository.listSavedAssessments(50),
    ]);
    const requestedPromptId = getSingleSearchParam(searchParams.promptId);
    const requestedAttemptId = getSingleSearchParam(searchParams.attemptId);
    const initialSelectedAssessment =
      initialSavedAssessments.find((attempt) => attempt.submissionId === requestedAttemptId) ?? null;
    const initialSelectedPromptId =
      prompts.some((item) => item.id === requestedPromptId)
        ? requestedPromptId
        : initialSelectedAssessment?.promptId ?? getDefaultPrompt(prompts).id;

    return {
      prompts,
      prompt: getDefaultPrompt(prompts),
      initialHistory,
      initialSavedAssessments,
      initialPromptId: initialSelectedPromptId,
      initialAttemptId: initialSelectedAssessment?.submissionId,
      initialReport: initialSelectedAssessment?.report ?? initialSavedAssessments[0]?.report ?? defaultReport,
      fallbackReports,
    };
  }

  async function loadDashboardPageData(): Promise<WritingDashboardPageData> {
    const prompts = await ensurePromptBank();
    const [recentAttempts, savedAssessments] = await Promise.all([
      repository.listRecentAttempts(12),
      repository.listSavedAssessments(50),
    ]);

    return {
      prompts,
      recentSavedAttempts: savedAssessments.slice(0, 6),
      summary: buildDashboardSummary(savedAssessments),
      progress: buildProgressSummary(recentAttempts),
      studyPlan: await repository.getDashboardStudyPlan(prompts, savedAssessments),
    };
  }

  async function loadTaskData(): Promise<WritingTaskData> {
    const prompts = await ensurePromptBank();

    return {
      prompt: getDefaultPrompt(prompts),
      prompts,
    };
  }

  async function submitAssessment(input: SubmitWritingAssessmentInput): Promise<SubmitWritingAssessmentResult> {
    const promptId = getSingleSearchParam(input.promptId) ?? '';
    const response = getSingleSearchParam(input.response) ?? '';
    const timeSpentMinutes = typeof input.timeSpentMinutes === 'number' ? input.timeSpentMinutes : 0;

    if (!promptId || response.trim().length < 50) {
      return {
        ok: false,
        error: 'Provide a promptId and at least 50 characters of writing.',
        status: 400,
      };
    }

    if (!Number.isFinite(timeSpentMinutes) || timeSpentMinutes < 0) {
      return {
        ok: false,
        error: 'Provide a finite, non-negative timeSpentMinutes value.',
        status: 400,
      };
    }

    const prompts = await ensurePromptBank();
    const prompt = prompts.find((item) => item.id === promptId);

    if (!prompt) {
      return {
        ok: false,
        error: 'Unknown writing prompt requested.',
        status: 404,
      };
    }

    await repository.seedPrompt(prompt);
    try {
      const result = await runPipeline(prompt, {
        promptId,
        taskType: prompt.taskType,
        response,
        timeSpentMinutes,
      });
      const stored = await repository.saveAssessmentResult(result);

      return {
        ok: true,
        payload: {
          report: stored.report,
          submission: stored.submission,
          recentAttempts: stored.recentAttempts,
          savedAssessments: stored.savedAssessments,
        },
      };
    } catch (error) {
      if (error instanceof WritingScorerUnavailableError) {
        return {
          ok: false,
          error: error.message,
          status: 503,
        };
      }

      throw error;
    }
  }

  return {
    loadPracticePageData,
    loadDashboardPageData,
    loadTaskData,
    submitAssessment,
  };
}

const defaultWritingApplicationService = createWritingApplicationService();

export const loadWritingPracticePageData = defaultWritingApplicationService.loadPracticePageData;
export const loadWritingDashboardPageData = defaultWritingApplicationService.loadDashboardPageData;
export const loadWritingTaskData = defaultWritingApplicationService.loadTaskData;
export const submitWritingAssessment = defaultWritingApplicationService.submitAssessment;
