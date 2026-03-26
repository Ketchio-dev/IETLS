import type {
  ImportedReadingSet,
  ImportedReadingSetSummary,
  PrivateReadingImportSummary,
} from '@/lib/services/reading-imports/types';

export type ReadingPracticeSet = ImportedReadingSet;

export interface ReadingQuestionReview {
  questionId: string;
  type: string;
  prompt: string;
  userAnswer: string;
  acceptedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  evidenceHint: string;
}

export interface ReadingAccuracyByType {
  type: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface ReadingAssessmentReport {
  reportId: string;
  attemptId: string;
  setId: string;
  setTitle: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  scoreLabel: string;
  summary: string;
  accuracyByQuestionType: ReadingAccuracyByType[];
  questionReviews: ReadingQuestionReview[];
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  warnings: string[];
  generatedAt: string;
}

export interface ReadingAttemptSnapshot {
  attemptId: string;
  setId: string;
  setTitle: string;
  createdAt: string;
  timeSpentSeconds: number;
  answers: Record<string, string>;
  report: ReadingAssessmentReport;
}

export interface ReadingAttemptSummary {
  attemptId: string;
  setId: string;
  setTitle: string;
  createdAt: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
  scoreLabel: string;
  timeSpentSeconds: number;
}

export interface ReadingDashboardSummary {
  totalAttempts: number;
  averagePercentage: number | null;
  bestScoreLabel: string | null;
  latestAttemptAt: string | null;
  averageTimeSpentSeconds: number;
  strongestType: ReadingAccuracyByType | null;
  weakestType: ReadingAccuracyByType | null;
}

export interface ReadingPracticePageData {
  moduleId: 'reading';
  moduleLabel: string;
  statusLabel: string;
  summary: string;
  routeBase: string;
  availableSets: ImportedReadingSetSummary[];
  importedSets: ImportedReadingSet[];
  activeSet: ImportedReadingSet | null;
  importSummary: PrivateReadingImportSummary;
  initialReport: ReadingAssessmentReport | null;
  initialAnswers: Record<string, string>;
  initialTimeSpentSeconds: number;
  recentAttempts: ReadingAttemptSummary[];
  savedAttempts: ReadingAttemptSnapshot[];
  initialSetId: string | null;
  initialAttemptId: string | null;
}

export interface ReadingDashboardPageData {
  moduleId: 'reading';
  moduleLabel: string;
  summary: string;
  routeBase: string;
  importSummary: PrivateReadingImportSummary;
  availableSets: ImportedReadingSetSummary[];
  recentAttempts: ReadingAttemptSnapshot[];
  dashboardSummary: ReadingDashboardSummary;
  studyFocus: string[];
}

export interface ReadingTaskData {
  moduleId: 'reading';
  title: string;
  description: string;
  activeSet: ImportedReadingSet | null;
  importedSets: ImportedReadingSet[];
  availableSets: ImportedReadingSetSummary[];
  importSummary: PrivateReadingImportSummary;
}

export interface SubmitReadingAssessmentInput {
  setId?: string | string[];
  answers?: unknown;
  timeSpentSeconds?: unknown;
}

export type SubmitReadingAssessmentResult =
  | {
      ok: true;
      payload: {
        report: ReadingAssessmentReport;
        attempt: ReadingAttemptSnapshot;
        recentAttempts: ReadingAttemptSummary[];
        savedAttempts: ReadingAttemptSnapshot[];
      };
    }
  | {
      ok: false;
      error: string;
      status: 400 | 404;
    };
