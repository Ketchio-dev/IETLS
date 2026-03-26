import {
  getAssessmentModuleRegistry,
  WRITING_ASSESSMENT_MODULE_ID,
  type AssessmentSearchParams,
} from '@/lib/assessment-modules/registry';
import {
  writingAssessmentWorkspaceDefinition,
  type AssessmentWorkspaceDefinition,
} from '@/lib/assessment-modules/workspace';
import type {
  SubmitWritingAssessmentInput,
  SubmitWritingAssessmentResult,
  WritingDashboardPageData,
  WritingPracticePageData,
  WritingTaskData,
} from '@/lib/services/writing/application-service';

export const defaultAssessmentModuleId = WRITING_ASSESSMENT_MODULE_ID;

function getDefaultAssessmentModule() {
  return getAssessmentModuleRegistry().requireModule(defaultAssessmentModuleId);
}

export function listAssessmentWorkspaces(): AssessmentWorkspaceDefinition[] {
  return [writingAssessmentWorkspaceDefinition];
}

export function getDefaultAssessmentWorkspace() {
  return writingAssessmentWorkspaceDefinition;
}

export function loadDefaultAssessmentPracticePageData(
  searchParams: AssessmentSearchParams = {},
): Promise<WritingPracticePageData> {
  return getDefaultAssessmentModule().loadPracticePageData(searchParams);
}

export function loadDefaultAssessmentDashboardPageData(): Promise<WritingDashboardPageData> {
  return getDefaultAssessmentModule().loadDashboardPageData();
}

export function loadDefaultAssessmentTaskData(): Promise<WritingTaskData> {
  return getDefaultAssessmentModule().loadTaskData();
}

export function submitDefaultAssessment(
  input: SubmitWritingAssessmentInput,
): Promise<SubmitWritingAssessmentResult> {
  return getDefaultAssessmentModule().submitAssessment(input);
}
