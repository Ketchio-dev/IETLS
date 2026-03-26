import {
  getAssessmentModuleRegistry,
  SPEAKING_ASSESSMENT_MODULE_ID,
  WRITING_ASSESSMENT_MODULE_ID,
  type AssessmentModuleCatalog,
  type AssessmentModuleId,
  type AssessmentSearchParams,
} from '@/lib/assessment-modules/registry';
import {
  speakingAssessmentWorkspaceDefinition,
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

function getAssessmentModule(moduleId: AssessmentModuleId) {
  return getAssessmentModuleRegistry().requireModule(moduleId);
}

export function listAssessmentWorkspaces(): AssessmentWorkspaceDefinition[] {
  return [writingAssessmentWorkspaceDefinition, speakingAssessmentWorkspaceDefinition];
}

export function getAssessmentWorkspace(moduleId: AssessmentModuleId = defaultAssessmentModuleId) {
  switch (moduleId) {
    case WRITING_ASSESSMENT_MODULE_ID:
      return writingAssessmentWorkspaceDefinition;
    case SPEAKING_ASSESSMENT_MODULE_ID:
      return speakingAssessmentWorkspaceDefinition;
    default:
      return writingAssessmentWorkspaceDefinition;
  }
}

export function getDefaultAssessmentWorkspace() {
  return getAssessmentWorkspace(defaultAssessmentModuleId);
}

export function loadAssessmentPracticePageData<TModuleId extends AssessmentModuleId>(
  moduleId: TModuleId,
  searchParams: AssessmentSearchParams = {},
): Promise<AssessmentModuleCatalog[TModuleId]['practicePageData']> {
  return getAssessmentModule(moduleId).loadPracticePageData(searchParams);
}

export function loadAssessmentDashboardPageData<TModuleId extends AssessmentModuleId>(
  moduleId: TModuleId,
): Promise<AssessmentModuleCatalog[TModuleId]['dashboardPageData']> {
  return getAssessmentModule(moduleId).loadDashboardPageData();
}

export function loadAssessmentTaskData<TModuleId extends AssessmentModuleId>(
  moduleId: TModuleId,
): Promise<AssessmentModuleCatalog[TModuleId]['taskData']> {
  return getAssessmentModule(moduleId).loadTaskData();
}

export function submitAssessmentForModule<TModuleId extends AssessmentModuleId>(
  moduleId: TModuleId,
  input: AssessmentModuleCatalog[TModuleId]['submitInput'],
): Promise<AssessmentModuleCatalog[TModuleId]['submitResult']> {
  return getAssessmentModule(moduleId).submitAssessment(input);
}

export const submitAssessment = submitAssessmentForModule;

export function loadDefaultAssessmentPracticePageData(
  searchParams: AssessmentSearchParams = {},
): Promise<WritingPracticePageData> {
  return loadAssessmentPracticePageData(defaultAssessmentModuleId, searchParams);
}

export function loadDefaultAssessmentDashboardPageData(): Promise<WritingDashboardPageData> {
  return loadAssessmentDashboardPageData(defaultAssessmentModuleId);
}

export function loadDefaultAssessmentTaskData(): Promise<WritingTaskData> {
  return loadAssessmentTaskData(defaultAssessmentModuleId);
}

export function submitDefaultAssessment(
  input: SubmitWritingAssessmentInput,
): Promise<SubmitWritingAssessmentResult> {
  return submitAssessmentForModule(defaultAssessmentModuleId, input);
}
