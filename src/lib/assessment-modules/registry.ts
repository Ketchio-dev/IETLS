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
import { type AssessmentWorkspace, writingAssessmentWorkspace } from '@/lib/assessment-modules/workspace';

type SearchParamValue = string | string[] | undefined;

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
    workspace: writingAssessmentWorkspace,
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
