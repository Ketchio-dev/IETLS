export type WritingTaskType = 'task-2';
export type CriterionName =
  | 'Task Response'
  | 'Coherence & Cohesion'
  | 'Lexical Resource'
  | 'Grammatical Range & Accuracy';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SignalStrength = 'strong' | 'developing' | 'weak';

export interface WritingPrompt {
  id: string;
  title: string;
  taskType: WritingTaskType;
  recommendedMinutes: number;
  suggestedWordCount: number;
  prompt: string;
  planningHints: string[];
  rubricFocus: string[];
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
  rationale: string;
  confidence: ConfidenceLevel;
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
  overallBand: number;
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
  pipelineVersion: string;
  generatedAt: string;
}

export interface EssaySubmission {
  promptId: string;
  response: string;
  timeSpentMinutes: number;
}

export interface WritingSubmissionRecord extends EssaySubmission {
  submissionId: string;
  wordCount: number;
  createdAt: string;
}

export interface RecentAttemptSummary {
  submissionId: string;
  promptId: string;
  overallBand: number;
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
