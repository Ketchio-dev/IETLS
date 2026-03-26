import {
  getAssessmentModuleRegistry,
  type AssessmentModuleCatalog,
  type AssessmentModuleId,
  type AssessmentModuleRegistry,
  type AssessmentSearchParams,
} from '@/lib/assessment-modules/registry';

export interface AssessmentWorkspace {
  listModuleIds(): AssessmentModuleId[];
  loadDashboardPageData<TModuleId extends AssessmentModuleId>(
    moduleId: TModuleId,
  ): Promise<AssessmentModuleCatalog[TModuleId]['dashboardPageData']>;
  loadPracticePageData<TModuleId extends AssessmentModuleId>(
    moduleId: TModuleId,
    searchParams?: AssessmentSearchParams,
  ): Promise<AssessmentModuleCatalog[TModuleId]['practicePageData']>;
  loadTaskData<TModuleId extends AssessmentModuleId>(
    moduleId: TModuleId,
  ): Promise<AssessmentModuleCatalog[TModuleId]['taskData']>;
  submitAssessment<TModuleId extends AssessmentModuleId>(
    moduleId: TModuleId,
    input: AssessmentModuleCatalog[TModuleId]['submitInput'],
  ): Promise<AssessmentModuleCatalog[TModuleId]['submitResult']>;
}

export function createAssessmentWorkspace(
  registry: AssessmentModuleRegistry = getAssessmentModuleRegistry(),
): AssessmentWorkspace {
  return {
    listModuleIds() {
      return registry.listModuleIds();
    },
    loadDashboardPageData(moduleId) {
      return registry.requireModule(moduleId).loadDashboardPageData();
    },
    loadPracticePageData(moduleId, searchParams) {
      return registry.requireModule(moduleId).loadPracticePageData(searchParams);
    },
    loadTaskData(moduleId) {
      return registry.requireModule(moduleId).loadTaskData();
    },
    submitAssessment(moduleId, input) {
      return registry.requireModule(moduleId).submitAssessment(input);
    },
  };
}

let defaultAssessmentWorkspace: AssessmentWorkspace | undefined;

export function getAssessmentWorkspace() {
  defaultAssessmentWorkspace ??= createAssessmentWorkspace();
  return defaultAssessmentWorkspace;
}
