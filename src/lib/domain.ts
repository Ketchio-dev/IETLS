export type WritingTaskType = 'task-2';

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
  name: string;
  strength: 'strong' | 'developing' | 'weak';
  detail: string;
}

export interface CriterionScore {
  criterion: 'Task Response' | 'Coherence & Cohesion' | 'Lexical Resource' | 'Grammatical Range & Accuracy';
  band: number;
  rationale: string;
}

export interface FeedbackAction {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AssessmentReport {
  essayId: string;
  promptId: string;
  overallBand: number;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  estimatedWordCount: number;
  criterionScores: CriterionScore[];
  evidence: EvidenceSignal[];
  strengths: string[];
  risks: string[];
  nextSteps: FeedbackAction[];
  generatedAt: string;
}

export interface EssaySubmission {
  promptId: string;
  response: string;
  timeSpentMinutes: number;
}
