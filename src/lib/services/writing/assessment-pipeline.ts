import { randomUUID } from 'node:crypto';

import type { AssessmentPipelineResult, AssessmentReport, EssaySubmission, WritingPrompt, WritingSubmissionRecord } from '@/lib/domain';

import { summarizeStrengths, summarizeRisks, buildSummary, buildWarnings, generateFeedbackActions } from './feedback-generator';
import { extractWritingEvidence } from './evidence-extractor';
import { countWords, clampBand } from './metrics';
import { deriveOverallConfidence, predictCriterionScores } from './scoring-model';

export function createSubmissionRecord(submission: EssaySubmission): WritingSubmissionRecord {
  return {
    ...submission,
    submissionId: randomUUID(),
    wordCount: countWords(submission.response),
    createdAt: new Date().toISOString(),
  };
}

export function buildAssessmentReport(prompt: WritingPrompt, submission: WritingSubmissionRecord): AssessmentReport {
  const evidence = extractWritingEvidence(prompt, submission);
  const criterionScores = predictCriterionScores(prompt, evidence);
  const overallBand = clampBand(
    criterionScores.reduce((sum, item) => sum + item.band, 0) / criterionScores.length,
  );
  const { confidence, reasons } = deriveOverallConfidence(criterionScores, evidence);

  return {
    reportId: randomUUID(),
    essayId: submission.submissionId,
    promptId: submission.promptId,
    overallBand,
    confidence,
    confidenceReasons: reasons,
    summary: buildSummary(overallBand, confidence, submission.wordCount),
    estimatedWordCount: submission.wordCount,
    criterionScores,
    evidence,
    strengths: summarizeStrengths(evidence),
    risks: summarizeRisks(evidence),
    nextSteps: generateFeedbackActions(criterionScores, evidence),
    warnings: buildWarnings(submission.wordCount, confidence),
    pipelineVersion: 'writing-task-2/v2-architecture-split',
    generatedAt: new Date().toISOString(),
  };
}

export function runAssessmentPipeline(prompt: WritingPrompt, submission: EssaySubmission): Omit<AssessmentPipelineResult, 'recentAttempts'> {
  const submissionRecord = createSubmissionRecord(submission);
  const report = buildAssessmentReport(prompt, submissionRecord);

  return {
    submission: submissionRecord,
    report,
  };
}
