import { randomUUID } from 'node:crypto';

import type { AssessmentPipelineResult, AssessmentReport, EssaySubmission, StructuredRubricScorecard, WritingPrompt, WritingSubmissionRecord } from '@/lib/domain';

import { summarizeStrengths, summarizeRisks, buildSummary, buildWarnings, generateFeedbackActions } from './feedback-generator';
import { extractWritingEvidence } from './evidence-extractor';
import { countWords } from './metrics';
import { scoreWritingWithAdapter, scoreWritingWithMockAdapter } from './scorer-adapter';

const PIPELINE_VERSION_BY_TASK_TYPE = {
  'task-1': 'writing-task-1/v1-openrouter-adapter',
  'task-2': 'writing-task-2/v4-openrouter-adapter',
} as const;

export function createSubmissionRecord(submission: EssaySubmission): WritingSubmissionRecord {
  return {
    ...submission,
    submissionId: randomUUID(),
    wordCount: countWords(submission.response),
    createdAt: new Date().toISOString(),
  };
}

function buildAssessmentReportFromScorecard(
  submission: WritingSubmissionRecord,
  evidence: ReturnType<typeof extractWritingEvidence>,
  scorecard: StructuredRubricScorecard,
): AssessmentReport {
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
    pipelineVersion: PIPELINE_VERSION_BY_TASK_TYPE[prompt.taskType],
    generatedAt: new Date().toISOString(),
  };
}

export async function buildAssessmentReport(prompt: WritingPrompt, submission: WritingSubmissionRecord): Promise<AssessmentReport> {
  const evidence = extractWritingEvidence(prompt, submission);
  const scorecard = await scoreWritingWithAdapter(prompt, evidence, submission.response);

  return buildAssessmentReportFromScorecard(submission, evidence, scorecard);
}

export function buildMockAssessmentReport(prompt: WritingPrompt, submission: WritingSubmissionRecord): AssessmentReport {
  const evidence = extractWritingEvidence(prompt, submission);
  const scorecard = scoreWritingWithMockAdapter(prompt, evidence, {
    configuredProvider: 'mock',
  });

  return buildAssessmentReportFromScorecard(submission, evidence, scorecard);
}

export async function runAssessmentPipeline(
  prompt: WritingPrompt,
  submission: EssaySubmission,
): Promise<Omit<AssessmentPipelineResult, 'recentAttempts'>> {
  const submissionRecord = createSubmissionRecord(submission);
  const report = await buildAssessmentReport(prompt, submissionRecord);

  return {
    submission: submissionRecord,
    report,
  };
}

export function runMockAssessmentPipeline(
  prompt: WritingPrompt,
  submission: EssaySubmission,
): Omit<AssessmentPipelineResult, 'recentAttempts'> {
  const submissionRecord = createSubmissionRecord(submission);
  const report = buildMockAssessmentReport(prompt, submissionRecord);

  return {
    submission: submissionRecord,
    report,
  };
}
