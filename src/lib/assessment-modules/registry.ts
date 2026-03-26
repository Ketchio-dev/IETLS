import type {
  SubmitWritingAssessmentInput,
  SubmitWritingAssessmentResult,
  WritingDashboardPageData,
  WritingPracticePageData,
  WritingTaskData,
} from '@/lib/services/writing/application-service';
import type {
  SpeakingDashboardPageData,
  SpeakingPracticePageData,
  SpeakingTaskData,
  SubmitSpeakingAssessmentInput,
  SubmitSpeakingAssessmentResult,
} from '@/lib/services/speaking/types';

import { createSpeakingAssessmentModule } from './speaking-module';
import { createWritingAssessmentModule } from './writing-module';

export const WRITING_ASSESSMENT_MODULE_ID = 'writing' as const;
export const SPEAKING_ASSESSMENT_MODULE_ID = 'speaking' as const;

export interface AssessmentModuleCatalog {
  [WRITING_ASSESSMENT_MODULE_ID]: {
    dashboardPageData: WritingDashboardPageData;
    practicePageData: WritingPracticePageData;
    submitInput: SubmitWritingAssessmentInput;
    submitResult: SubmitWritingAssessmentResult;
    taskData: WritingTaskData;
  };
  [SPEAKING_ASSESSMENT_MODULE_ID]: {
    dashboardPageData: SpeakingDashboardPageData;
    practicePageData: SpeakingPracticePageData;
    submitInput: SubmitSpeakingAssessmentInput;
    submitResult: SubmitSpeakingAssessmentResult;
    taskData: SpeakingTaskData;
  };
}

export type AssessmentModuleId = keyof AssessmentModuleCatalog;
export type AssessmentSearchParams = Record<string, string | string[] | undefined>;

export interface AssessmentModuleDefinition<TModuleId extends AssessmentModuleId> {
  id: TModuleId;
  loadDashboardPageData(): Promise<AssessmentModuleCatalog[TModuleId]['dashboardPageData']>;
  loadPracticePageData(
    searchParams?: AssessmentSearchParams,
  ): Promise<AssessmentModuleCatalog[TModuleId]['practicePageData']>;
  loadTaskData(): Promise<AssessmentModuleCatalog[TModuleId]['taskData']>;
  submitAssessment(
    input: AssessmentModuleCatalog[TModuleId]['submitInput'],
  ): Promise<AssessmentModuleCatalog[TModuleId]['submitResult']>;
}

export interface AssessmentModuleRegistry {
  getModule<TModuleId extends AssessmentModuleId>(
    moduleId: TModuleId,
  ): AssessmentModuleDefinition<TModuleId> | undefined;
  listModuleIds(): AssessmentModuleId[];
  requireModule<TModuleId extends AssessmentModuleId>(moduleId: TModuleId): AssessmentModuleDefinition<TModuleId>;
}

function createModuleMap(modules: AssessmentModuleDefinition<AssessmentModuleId>[]) {
  const map = new Map<AssessmentModuleId, AssessmentModuleDefinition<AssessmentModuleId>>();

  for (const assessmentModule of modules) {
    if (map.has(assessmentModule.id)) {
      throw new Error(`Duplicate assessment module registered: ${assessmentModule.id}`);
    }

    map.set(assessmentModule.id, assessmentModule);
  }

  return map;
}

export function createAssessmentModuleRegistry(
  modules: AssessmentModuleDefinition<AssessmentModuleId>[] = [
    createWritingAssessmentModule(),
    createSpeakingAssessmentModule(),
  ],
): AssessmentModuleRegistry {
  const moduleMap = createModuleMap(modules);

  return {
    getModule<TModuleId extends AssessmentModuleId>(moduleId: TModuleId) {
      return moduleMap.get(moduleId) as AssessmentModuleDefinition<TModuleId> | undefined;
    },
    listModuleIds() {
      return Array.from(moduleMap.keys());
    },
    requireModule<TModuleId extends AssessmentModuleId>(moduleId: TModuleId) {
      const assessmentModule = moduleMap.get(moduleId) as AssessmentModuleDefinition<TModuleId> | undefined;

      if (!assessmentModule) {
        throw new Error(`Unknown assessment module requested: ${moduleId}`);
      }

      return assessmentModule;
    },
  };
}

let defaultAssessmentModuleRegistry: AssessmentModuleRegistry | undefined;

export function getAssessmentModuleRegistry() {
  defaultAssessmentModuleRegistry ??= createAssessmentModuleRegistry();
  return defaultAssessmentModuleRegistry;
}
