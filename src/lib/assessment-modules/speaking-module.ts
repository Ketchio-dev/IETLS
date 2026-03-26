import {
  loadSpeakingDashboardPageData,
  loadSpeakingPracticePageData,
  loadSpeakingTaskData,
  submitSpeakingAssessment,
} from '@/lib/services/speaking/application-service';

import { SPEAKING_ASSESSMENT_MODULE_ID, type AssessmentModuleDefinition } from './registry';

export function createSpeakingAssessmentModule(): AssessmentModuleDefinition<typeof SPEAKING_ASSESSMENT_MODULE_ID> {
  return {
    id: SPEAKING_ASSESSMENT_MODULE_ID,
    loadDashboardPageData: loadSpeakingDashboardPageData,
    loadPracticePageData: loadSpeakingPracticePageData,
    loadTaskData: loadSpeakingTaskData,
    submitAssessment: submitSpeakingAssessment,
  };
}
