export type PlaceholderAssessmentModuleId = 'listening';

export interface PrivateImportSetSummary {
  id: string;
  title: string;
  sourceLabel: string;
  sourceFile: string;
  importedAt: string;
  questionCount: number;
  passageWordCount: number;
  types: string[];
}

export interface PrivateImportSummary {
  sourceDir: string;
  importCommand: string;
  detectedSourceFiles: string[];
  compiledSourceFiles: string[];
  importedSetCount: number;
  latestImportedAt: string | null;
  compiledOutputLabel: string;
  sets: PrivateImportSetSummary[];
  warnings: string[];
}

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
  privateImportSummary?: PrivateImportSummary;
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
  privateImportSummary?: PrivateImportSummary;
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
