import {
  loadReadingDashboardPageData,
  loadReadingPracticePageData,
  loadReadingTaskData,
  submitReadingAssessment,
} from '@/lib/services/assessment-placeholders/application-service';

import { READING_ASSESSMENT_MODULE_ID, type AssessmentModuleDefinition } from './registry';

export function createReadingAssessmentModule(): AssessmentModuleDefinition<typeof READING_ASSESSMENT_MODULE_ID> {
  return {
    id: READING_ASSESSMENT_MODULE_ID,
    loadDashboardPageData: loadReadingDashboardPageData,
    loadPracticePageData: loadReadingPracticePageData,
    loadTaskData: loadReadingTaskData,
    submitAssessment: submitReadingAssessment,
  };
}
