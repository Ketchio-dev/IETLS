import {
  createWritingApplicationService,
  type SubmitWritingAssessmentInput,
  type SubmitWritingAssessmentResult,
  type WritingDashboardPageData,
  type WritingPracticePageData,
  type WritingTaskData,
} from '@/lib/services/writing/application-service';

export type AssessmentModuleId = 'writing';

type SearchParamValue = string | string[] | undefined;

export interface AssessmentWorkspaceRoutes {
  practicePath: string;
  dashboardPath: string;
  taskPath: string;
  assessmentPath: string;
}

export interface AssessmentWorkspace {
  moduleId: AssessmentModuleId;
  slug: string;
  title: string;
  description: string;
  routes: AssessmentWorkspaceRoutes;
}

export interface AssessmentModuleDefinition {
  workspace: AssessmentWorkspace;
  loadPracticePageData(searchParams?: Record<string, SearchParamValue>): Promise<WritingPracticePageData>;
  loadDashboardPageData(): Promise<WritingDashboardPageData>;
  loadTaskData(): Promise<WritingTaskData>;
  submitAssessment(input: SubmitWritingAssessmentInput): Promise<SubmitWritingAssessmentResult>;
}

const writingApplicationService = createWritingApplicationService();

const assessmentModuleRegistry = [
  {
    workspace: {
      moduleId: 'writing',
      slug: 'writing',
      title: 'IELTS Academic Writing',
      description: 'Writing Task 1 / Task 2 practice, scoring, and persisted dashboard workflows.',
      routes: {
        practicePath: '/',
        dashboardPath: '/dashboard',
        taskPath: '/api/writing/task',
        assessmentPath: '/api/writing/assessment',
      },
    },
    loadPracticePageData: writingApplicationService.loadPracticePageData,
    loadDashboardPageData: writingApplicationService.loadDashboardPageData,
    loadTaskData: writingApplicationService.loadTaskData,
    submitAssessment: writingApplicationService.submitAssessment,
  },
] as const satisfies readonly AssessmentModuleDefinition[];

const assessmentModulesById = new Map(
  assessmentModuleRegistry.map((module) => [module.workspace.moduleId, module]),
);

export function listAssessmentWorkspaces() {
  return assessmentModuleRegistry.map((module) => module.workspace);
}

export function getAssessmentModule(moduleId: AssessmentModuleId = 'writing') {
  const module = assessmentModulesById.get(moduleId);

  if (!module) {
    throw new Error(`Unknown assessment module: ${moduleId}`);
  }

  return module;
}

export function getDefaultAssessmentWorkspace() {
  return assessmentModuleRegistry[0].workspace;
}

export async function loadAssessmentWorkspacePracticePageData(
  searchParams: Record<string, SearchParamValue> = {},
) {
  return getAssessmentModule().loadPracticePageData(searchParams);
}

export async function loadAssessmentWorkspaceDashboardPageData() {
  return getAssessmentModule().loadDashboardPageData();
}

export async function loadAssessmentWorkspaceTaskData() {
  return getAssessmentModule().loadTaskData();
}

export async function submitAssessmentWorkspaceEntry(input: SubmitWritingAssessmentInput) {
  return getAssessmentModule().submitAssessment(input);
}
