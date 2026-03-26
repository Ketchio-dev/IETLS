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

export interface AssessmentWorkspace {
  moduleId: string;
  moduleLabel: string;
  practicePath: string;
  dashboardPath: string;
  taskApiPath: string;
  assessmentApiPath: string;
}

export interface AssessmentModuleDefinition {
  id: string;
  workspace: AssessmentWorkspace;
  loadPracticePageData(
    searchParams?: Record<string, SearchParamValue>,
  ): Promise<WritingPracticePageData>;
  loadDashboardPageData(): Promise<WritingDashboardPageData>;
  loadTaskData(): Promise<WritingTaskData>;
  submitAssessment(input: SubmitWritingAssessmentInput): Promise<SubmitWritingAssessmentResult>;
}

const assessmentModules = {
  writing: {
    id: 'writing',
    workspace: {
      moduleId: 'writing',
      moduleLabel: 'IELTS Academic Writing',
      practicePath: '/',
      dashboardPath: '/dashboard',
      taskApiPath: '/api/writing/task',
      assessmentApiPath: '/api/writing/assessment',
    },
    loadPracticePageData: loadWritingPracticePageData,
    loadDashboardPageData: loadWritingDashboardPageData,
    loadTaskData: loadWritingTaskData,
    submitAssessment: submitWritingAssessment,
  },
} satisfies Record<string, AssessmentModuleDefinition>;

export type AssessmentModuleId = keyof typeof assessmentModules;

export function listAssessmentModules() {
  return Object.values(assessmentModules);
}

export function getAssessmentModule(moduleId: AssessmentModuleId): AssessmentModuleDefinition {
  return assessmentModules[moduleId];
}

export function getDefaultAssessmentModule(): AssessmentModuleDefinition {
  return listAssessmentModules()[0]!;
}

export function buildPracticeWorkspaceHref(
  workspace: AssessmentWorkspace,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${workspace.practicePath}?${query}` : workspace.practicePath;
}
