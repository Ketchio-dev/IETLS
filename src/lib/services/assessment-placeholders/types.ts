import type { PrivateReadingImportSummary } from '@/lib/services/reading-imports/types';

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
  privateImportSummary?: PrivateReadingImportSummary;
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
  privateImportSummary?: PrivateReadingImportSummary;
}

export interface PlaceholderAssessmentTaskData {
  moduleId: PlaceholderAssessmentModuleId;
  title: string;
  description: string;
  plannedMilestones: string[];
  privateImportSummary?: PrivateReadingImportSummary;
}

export interface SubmitPlaceholderAssessmentInput {
  note?: string | string[];
}

export interface SubmitPlaceholderAssessmentResult {
  ok: false;
  error: string;
  status: 501;
}
