export type PlaceholderAssessmentModuleId = 'reading' | 'listening';

export interface PlaceholderAssessmentPracticePageData {
  moduleId: PlaceholderAssessmentModuleId;
  moduleLabel: string;
  statusLabel: string;
  summary: string;
  practiceTitle: string;
  practiceDescription: string;
  routeBase: string;
  plannedMilestones: string[];
  currentGuardrails: string[];
}

export interface PlaceholderAssessmentDashboardPageData {
  moduleId: PlaceholderAssessmentModuleId;
  moduleLabel: string;
  statusLabel: string;
  summary: string;
  dashboardTitle: string;
  dashboardDescription: string;
  routeBase: string;
  statusCards: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  nextSteps: string[];
}

export interface PlaceholderAssessmentTaskData {
  moduleId: PlaceholderAssessmentModuleId;
  title: string;
  description: string;
  plannedMilestones: string[];
}

export interface SubmitPlaceholderAssessmentInput {
  note?: string | string[];
}

export interface SubmitPlaceholderAssessmentResult {
  ok: false;
  error: string;
  status: 501;
}
