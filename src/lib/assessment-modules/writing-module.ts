import {
  loadWritingDashboardPageData,
  loadWritingPracticePageData,
  loadWritingTaskData,
  submitWritingAssessment,
} from '@/lib/services/writing/application-service';

import { WRITING_ASSESSMENT_MODULE_ID, type AssessmentModuleDefinition } from './registry';

export function createWritingAssessmentModule(): AssessmentModuleDefinition<typeof WRITING_ASSESSMENT_MODULE_ID> {
  return {
    id: WRITING_ASSESSMENT_MODULE_ID,
    loadDashboardPageData: loadWritingDashboardPageData,
    loadPracticePageData: loadWritingPracticePageData,
    loadTaskData: loadWritingTaskData,
    submitAssessment: submitWritingAssessment,
  };
}
