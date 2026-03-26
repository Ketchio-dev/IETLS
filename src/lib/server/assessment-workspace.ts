import {
  loadWritingDashboardPageData,
  loadWritingPracticePageData,
  loadWritingTaskData,
  submitWritingAssessment,
  type SubmitWritingAssessmentInput,
  type SubmitWritingAssessmentResult,
  type WritingDashboardPageData,
  type WritingPracticePageData,
  type WritingTaskData,
} from '@/lib/services/writing/application-service';

type SearchParamValue = string | string[] | undefined;

export interface AssessmentWorkspaceRoutes {
  practice: string;
  dashboard: string;
  taskApi: string;
  assessmentApi: string;
}

export interface AssessmentWorkspaceDefinition {
  id: string;
  label: string;
  summary: string;
  routes: AssessmentWorkspaceRoutes;
}

interface AssessmentModuleDefinition<PracticePageData, DashboardPageData, TaskData, SubmitInput, SubmitResult> {
  workspace: AssessmentWorkspaceDefinition;
  loadPracticePageData(searchParams?: Record<string, SearchParamValue>): Promise<PracticePageData>;
  loadDashboardPageData(): Promise<DashboardPageData>;
  loadTaskData(): Promise<TaskData>;
  submitAssessment(input: SubmitInput): Promise<SubmitResult>;
}

type AssessmentModuleRegistry = {
  writing: AssessmentModuleDefinition<
    WritingPracticePageData,
    WritingDashboardPageData,
    WritingTaskData,
    SubmitWritingAssessmentInput,
    SubmitWritingAssessmentResult
  >;
};

export type AssessmentModuleId = keyof AssessmentModuleRegistry;

const assessmentModuleRegistry: AssessmentModuleRegistry = {
  writing: {
    workspace: {
      id: 'writing',
      label: 'IELTS Academic Writing',
      summary: 'Timed writing practice with persisted reports, dashboard trends, and Gemini 3 Flash scoring by default.',
      routes: {
        practice: '/',
        dashboard: '/dashboard',
        taskApi: '/api/writing/task',
        assessmentApi: '/api/writing/assessment',
      },
    },
    loadPracticePageData: loadWritingPracticePageData,
    loadDashboardPageData: loadWritingDashboardPageData,
    loadTaskData: loadWritingTaskData,
    submitAssessment: submitWritingAssessment,
  },
};

export const defaultAssessmentModuleId: AssessmentModuleId = 'writing';

export function listAssessmentWorkspaces(): AssessmentWorkspaceDefinition[] {
  return Object.values(assessmentModuleRegistry).map((module) => module.workspace);
}

export function getAssessmentModule(moduleId: AssessmentModuleId = defaultAssessmentModuleId) {
  return assessmentModuleRegistry[moduleId];
}

export function getDefaultAssessmentWorkspace() {
  return getAssessmentModule().workspace;
}

export function loadDefaultAssessmentPracticePageData(
  searchParams: Record<string, SearchParamValue> = {},
) {
  return getAssessmentModule().loadPracticePageData(searchParams);
}

export function loadDefaultAssessmentDashboardPageData() {
  return getAssessmentModule().loadDashboardPageData();
}

export function loadDefaultAssessmentTaskData() {
  return getAssessmentModule().loadTaskData();
}

export function submitDefaultAssessment(input: SubmitWritingAssessmentInput) {
  return getAssessmentModule().submitAssessment(input);
}
