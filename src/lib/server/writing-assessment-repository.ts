import { randomUUID } from 'node:crypto';

import type {
  AssessmentPipelineResult,
  AssessmentReport,
  BandRange,
  RecentAttemptSummary,
  SavedAssessmentSnapshot,
  StoredAssessmentRecord,
  StudyPlanSnapshot,
  WritingPrompt,
} from '@/lib/domain';

import { buildStudyPlan } from '@/lib/services/writing/dashboard';
import { clampBand } from '@/lib/services/writing/metrics';

import { readJsonFile, writeJsonFile } from './storage';

const PROMPTS_FILE = 'writing-prompts.json';
const ASSESSMENTS_FILE = 'writing-assessments.json';
const STUDY_PLAN_FILE = 'writing-study-plan.json';
const STUDY_PLAN_VERSION = 2;

function ensureBandRange(range: BandRange | undefined, overallBand: number): BandRange {
  if (range) {
    return range;
  }

  return {
    lower: clampBand(overallBand - 0.5),
    upper: clampBand(overallBand + 0.5),
  };
}

function normalizeReport(report: AssessmentReport): AssessmentReport {
  return {
    ...report,
    overallBandRange: ensureBandRange(report.overallBandRange, report.overallBand),
  };
}

function toSummary(record: StoredAssessmentRecord): RecentAttemptSummary {
  const report = normalizeReport(record.report);

  return {
    submissionId: record.submission.submissionId,
    promptId: record.submission.promptId,
    taskType: record.submission.taskType,
    overallBand: report.overallBand,
    overallBandRange: report.overallBandRange,
    confidence: report.confidence,
    estimatedWordCount: report.estimatedWordCount,
    summary: report.summary,
    createdAt: record.submission.createdAt,
  };
}

function toSavedAssessment(record: StoredAssessmentRecord): SavedAssessmentSnapshot {
  return {
    submissionId: record.submission.submissionId,
    promptId: record.submission.promptId,
    taskType: record.submission.taskType,
    createdAt: record.submission.createdAt,
    timeSpentMinutes: record.submission.timeSpentMinutes,
    wordCount: record.submission.wordCount,
    report: normalizeReport(record.report),
  };
}

async function readStoredAssessments() {
  return readJsonFile<StoredAssessmentRecord[]>(ASSESSMENTS_FILE, []);
}

export async function seedPrompt(prompt: WritingPrompt) {
  const prompts = await readJsonFile<WritingPrompt[]>(PROMPTS_FILE, []);
  if (prompts.some((item) => item.id === prompt.id)) {
    return prompt;
  }

  await writeJsonFile(PROMPTS_FILE, [...prompts, prompt]);
  return prompt;
}

export async function seedPrompts(prompts: WritingPrompt[]) {
  for (const prompt of prompts) {
    await seedPrompt(prompt);
  }

  return prompts;
}

export async function listPrompts(): Promise<WritingPrompt[]> {
  const prompts = await readJsonFile<WritingPrompt[]>(PROMPTS_FILE, []);
  return prompts.slice();
}

export async function listRecentAttempts(limit = 5): Promise<RecentAttemptSummary[]> {
  const records = await readStoredAssessments();
  return records
    .slice()
    .sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt))
    .slice(0, limit)
    .map(toSummary);
}

export async function listSavedAssessments(limit = 5): Promise<SavedAssessmentSnapshot[]> {
  const records = await readStoredAssessments();
  return records
    .slice()
    .sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt))
    .slice(0, limit)
    .map(toSavedAssessment);
}

export async function getDashboardStudyPlan(
  prompts: WritingPrompt[],
  savedAssessments: SavedAssessmentSnapshot[],
): Promise<StudyPlanSnapshot> {
  const storedPlan = await readJsonFile<StudyPlanSnapshot | null>(STUDY_PLAN_FILE, null);
  const latestSubmissionId = savedAssessments[0]?.submissionId ?? null;

  if (
    storedPlan &&
    storedPlan.version === STUDY_PLAN_VERSION &&
    storedPlan.basedOnSubmissionId === latestSubmissionId &&
    storedPlan.attemptsConsidered === savedAssessments.length
  ) {
    return storedPlan;
  }

  const nextPlan = buildStudyPlan(savedAssessments, prompts);
  await writeJsonFile(STUDY_PLAN_FILE, nextPlan);
  return nextPlan;
}

export async function saveAssessmentResult(result: Omit<AssessmentPipelineResult, 'recentAttempts'>) {
  const records = await readStoredAssessments();
  const stored: StoredAssessmentRecord = {
    submission: result.submission,
    report: {
      ...result.report,
      reportId: result.report.reportId || randomUUID(),
      overallBandRange: ensureBandRange(result.report.overallBandRange, result.report.overallBand),
    },
  };

  const updated = [stored, ...records];
  await writeJsonFile(ASSESSMENTS_FILE, updated);

  return {
    ...stored,
    recentAttempts: updated.slice(0, 5).map(toSummary),
    savedAssessments: updated.slice(0, 5).map(toSavedAssessment),
  };
}
