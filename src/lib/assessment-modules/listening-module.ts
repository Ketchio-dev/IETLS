import {
  loadListeningDashboardPageData,
  loadListeningPracticePageData,
  loadListeningTaskData,
  submitListeningAssessment,
} from '@/lib/services/assessment-placeholders/application-service';

import { LISTENING_ASSESSMENT_MODULE_ID, type AssessmentModuleDefinition } from './registry';

export function createListeningAssessmentModule(): AssessmentModuleDefinition<typeof LISTENING_ASSESSMENT_MODULE_ID> {
  return {
    id: LISTENING_ASSESSMENT_MODULE_ID,
    loadDashboardPageData: loadListeningDashboardPageData,
    loadPracticePageData: loadListeningPracticePageData,
    loadTaskData: loadListeningTaskData,
    submitAssessment: submitListeningAssessment,
  };
}
