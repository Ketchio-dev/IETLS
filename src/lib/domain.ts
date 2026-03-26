export type WritingTaskType = 'task-1' | 'task-2';
export type CriterionName =
  | 'Task Achievement'
  | 'Task Response'
  | 'Coherence & Cohesion'
  | 'Lexical Resource'
  | 'Grammatical Range & Accuracy';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SignalStrength = 'strong' | 'developing' | 'weak';
export type Task1VisualType = 'line-chart' | 'bar-chart' | 'table' | 'pie-chart' | 'mixed';

export interface BandRange {
  lower: number;
  upper: number;
}

export interface Task1VisualDatum {
  label: string;
  value: string;
  note?: string;
}

export interface Task1VisualPrompt {
  type: Task1VisualType;
  title: string;
  summary: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  units?: string;
  keyFeatures: string[];
  dataPoints: Task1VisualDatum[];
}

export interface WritingPrompt {
  id: string;
  title: string;
  taskType: WritingTaskType;
  recommendedMinutes: number;
  suggestedWordCount: number;
  questionType: string;
  keywordTargets: string[];
  prompt: string;
  planningHints: string[];
  rubricFocus: string[];
  visual?: Task1VisualPrompt;
}

export interface EvidenceSignal {
  id: string;
  criterion: CriterionName | 'Overall';
  label: string;
  strength: SignalStrength;
  detail: string;
  source: 'rule-based' | 'rubric-based' | 'model-ready';
}

export interface CriterionScore {
  criterion: CriterionName;
  band: number;
  bandRange: BandRange;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface CriterionEvaluationTrace {
  criterion: CriterionName;
  signalIds: string[];
  signalStrengths: SignalStrength[];
  signalSources: EvidenceSignal['source'][];
  notes: string[];
}

export interface EvaluationTrace {
  schemaVersion: string;
  scorerProvider: string;
  scorerModel: string;
  configuredProvider: string | null;
  usedMockFallback: boolean;
  rubricVersion: string;
  calibrationVersion: string;
  evidenceSignalCount: number;
  evidenceFingerprint: string;
  scoredAt: string;
  notes: string[];
  criterionTrace: CriterionEvaluationTrace[];
}

export interface StructuredRubricScorecard {
  schemaVersion: string;
  criterionScores: CriterionScore[];
  overallBand: number;
  overallBandRange: BandRange;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  evaluationTrace: EvaluationTrace;
}

export interface FeedbackAction {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  criterion?: CriterionName;
}

export interface AssessmentWarning {
  code: 'practice-estimate' | 'low-confidence' | 'under-length';
  message: string;
}

export interface AssessmentReport {
  reportId: string;
  essayId: string;
  promptId: string;
  taskType: WritingTaskType;
  overallBand: number;
  overallBandRange: BandRange;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  summary: string;
  estimatedWordCount: number;
  criterionScores: CriterionScore[];
  evidence: EvidenceSignal[];
  strengths: string[];
  risks: string[];
  nextSteps: FeedbackAction[];
  warnings: AssessmentWarning[];
  evaluationTrace: EvaluationTrace;
  pipelineVersion: string;
  generatedAt: string;
}

export interface EssaySubmission {
  promptId: string;
  taskType: WritingTaskType;
  response: string;
  timeSpentMinutes: number;
}

export interface WritingSubmissionRecord extends EssaySubmission {
  submissionId: string;
  wordCount: number;
  createdAt: string;
}

export interface SavedAssessmentSnapshot {
  submissionId: string;
  promptId: string;
  taskType: WritingTaskType;
  createdAt: string;
  timeSpentMinutes: number;
  wordCount: number;
  report: AssessmentReport;
}

export interface RecentAttemptSummary {
  submissionId: string;
  promptId: string;
  taskType: WritingTaskType;
  overallBand: number;
  overallBandRange: BandRange;
  confidence: ConfidenceLevel;
  estimatedWordCount: number;
  summary: string;
  createdAt: string;
}

export interface StoredAssessmentRecord {
  submission: WritingSubmissionRecord;
  report: AssessmentReport;
}

export interface AssessmentPipelineResult {
  submission: WritingSubmissionRecord;
  report: AssessmentReport;
  recentAttempts: RecentAttemptSummary[];
}

export interface ProgressSummary {
  direction: 'improving' | 'steady' | 'slipping' | 'insufficient-data';
  label: string;
  detail: string;
  delta: number;
  latestRange: BandRange | null;
  attemptsConsidered: number;
  averageWordCount: number;
}
