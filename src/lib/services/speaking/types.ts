import type { BandRange, ConfidenceLevel } from '@/lib/domain';

export type SpeakingPart = 'part-1' | 'part-2' | 'part-3';
export type SpeakingEvidenceMode = 'transcript-only' | 'transcript-plus-audio-metadata';

export type SpeakingCriterionName =
  | 'Fluency & Coherence'
  | 'Lexical Resource'
  | 'Grammatical Range & Accuracy'
  | 'Pronunciation';

export interface SpeakingPrompt {
  id: string;
  title: string;
  part: SpeakingPart;
  topic: string;
  prompt: string;
  cueCard?: string[];
  followUps: string[];
  recommendedSeconds: number;
  keywordTargets?: string[];
  focusAreas: string[];
}

export interface SpeakingAudioArtifact {
  status: 'missing' | 'attached';
  source: 'none' | 'upload';
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
}

export interface SpeakingAudioArtifactInput {
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
}

export interface SpeakingCriterionScore {
  criterion: SpeakingCriterionName;
  band: number;
  bandRange: BandRange;
  confidence: ConfidenceLevel;
  rationale: string;
}

export interface SpeakingAssessmentReport {
  reportId: string;
  sessionId: string;
  promptId: string;
  part: SpeakingPart;
  overallBand: number;
  overallBandRange: BandRange;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  summary: string;
  transcriptWordCount: number;
  estimatedDurationSeconds: number;
  evidenceMode: SpeakingEvidenceMode;
  criterionScores: SpeakingCriterionScore[];
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  warnings: string[];
  providerLabel: string;
  scorerModel: string;
  usedMockScorer: boolean;
  generatedAt: string;
}

export interface SpeakingSessionSnapshot {
  sessionId: string;
  promptId: string;
  part: SpeakingPart;
  createdAt: string;
  durationSeconds: number;
  transcript: string;
  transcriptSource: 'seed' | 'manual';
  transcriptWordCount: number;
  audioArtifact: SpeakingAudioArtifact;
  report: SpeakingAssessmentReport;
}

export interface SpeakingRecentSessionSummary {
  sessionId: string;
  promptId: string;
  part: SpeakingPart;
  overallBand: number;
  overallBandRange: BandRange;
  confidence: ConfidenceLevel;
  summary: string;
  durationSeconds: number;
  transcriptWordCount: number;
  audioStatus: SpeakingAudioArtifact['status'];
  evidenceMode: SpeakingEvidenceMode;
  createdAt: string;
}

export interface SpeakingDashboardSummary {
  totalSessions: number;
  averageBand: number | null;
  bestBand: number | null;
  latestRange: BandRange | null;
  averageDurationSeconds: number;
  latestAttemptAt: string | null;
  lowConfidenceCount: number;
  sessionsWithAudio: number;
  partBreakdown: Record<SpeakingPart, number>;
}

export interface SpeakingPracticePageData {
  prompts: SpeakingPrompt[];
  prompt: SpeakingPrompt;
  initialReport: SpeakingAssessmentReport;
  initialTranscript: string;
  initialDurationSeconds: number;
  initialRecentSessions: SpeakingRecentSessionSummary[];
  initialSavedSessions: SpeakingSessionSnapshot[];
  initialPromptId?: string;
  initialSessionId: string | null;
  fallbackReports?: Record<string, SpeakingAssessmentReport>;
}

export interface SpeakingDashboardPageData {
  prompts?: SpeakingPrompt[];
  recentSessions: SpeakingSessionSnapshot[];
  summary: SpeakingDashboardSummary;
  studyFocus: string[];
}

export interface SpeakingTaskData {
  prompt: SpeakingPrompt;
  prompts: SpeakingPrompt[];
}

export interface SubmitSpeakingAssessmentInput {
  promptId?: string | string[];
  transcript?: string | string[];
  durationSeconds?: unknown;
  audioArtifact?: SpeakingAudioArtifactInput;
}

export type SubmitSpeakingAssessmentResult =
  | {
      ok: true;
      payload: {
        report: SpeakingAssessmentReport;
        session: SpeakingSessionSnapshot;
        recentSessions: SpeakingRecentSessionSummary[];
        savedSessions: SpeakingSessionSnapshot[];
      };
    }
  | {
      ok: false;
      error: string;
      status: 400 | 404;
    };
