import { randomUUID } from 'node:crypto';

import type { AssessmentPipelineResult, AssessmentReport, EssaySubmission, WritingPrompt, WritingSubmissionRecord } from '@/lib/domain';

import { summarizeStrengths, summarizeRisks, buildSummary, buildWarnings, generateFeedbackActions } from './feedback-generator';
import { extractWritingEvidence } from './evidence-extractor';
import { countWords } from './metrics';
import { scoreWritingWithAdapter } from './scorer-adapter';

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
  const scorecard = scoreWritingWithAdapter(prompt, evidence);

  return {
    reportId: randomUUID(),
    essayId: submission.submissionId,
    promptId: submission.promptId,
    overallBand: scorecard.overallBand,
    overallBandRange: scorecard.overallBandRange,
    confidence: scorecard.confidence,
    confidenceReasons: scorecard.confidenceReasons,
    summary: buildSummary(scorecard.overallBandRange, submission.wordCount),
    estimatedWordCount: submission.wordCount,
    criterionScores: scorecard.criterionScores,
    evidence,
    strengths: summarizeStrengths(evidence),
    risks: summarizeRisks(evidence),
    nextSteps: generateFeedbackActions(scorecard.criterionScores, evidence),
    warnings: buildWarnings(submission.wordCount, scorecard.confidence),
    evaluationTrace: scorecard.evaluationTrace,
    pipelineVersion: 'writing-task-2/v3-scorer-adapter-range-reporting',
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
