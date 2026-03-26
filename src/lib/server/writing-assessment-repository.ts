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

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';

const PROMPTS_FILE: StorageFile = 'prompts';
const ASSESSMENTS_FILE: StorageFile = 'assessments';
const STUDY_PLAN_FILE: StorageFile = 'studyPlan';
const STUDY_PLAN_VERSION = 2;

export interface PersistedAssessmentResult extends StoredAssessmentRecord {
  recentAttempts: RecentAttemptSummary[];
  savedAssessments: SavedAssessmentSnapshot[];
}

export interface WritingAssessmentRepository {
  seedPrompt(prompt: WritingPrompt): Promise<WritingPrompt>;
  seedPrompts(prompts: WritingPrompt[]): Promise<WritingPrompt[]>;
  listPrompts(): Promise<WritingPrompt[]>;
  listRecentAttempts(limit?: number): Promise<RecentAttemptSummary[]>;
  listSavedAssessments(limit?: number): Promise<SavedAssessmentSnapshot[]>;
  getDashboardStudyPlan(
    prompts: WritingPrompt[],
    savedAssessments: SavedAssessmentSnapshot[],
  ): Promise<StudyPlanSnapshot>;
  saveAssessmentResult(result: Omit<AssessmentPipelineResult, 'recentAttempts'>): Promise<PersistedAssessmentResult>;
}

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

export function createWritingAssessmentRepository(
  storage: JsonStoragePort = getStoragePort(),
): WritingAssessmentRepository {
  async function readStoredAssessments() {
    return storage.readJsonFile<StoredAssessmentRecord[]>(ASSESSMENTS_FILE, []);
  }

  const seedPrompt = async (prompt: WritingPrompt) => {
    const prompts = await storage.readJsonFile<WritingPrompt[]>(PROMPTS_FILE, []);
    if (prompts.some((item) => item.id === prompt.id)) {
      return prompt;
    }

    await storage.writeJsonFile(PROMPTS_FILE, [...prompts, prompt]);
    return prompt;
  };

  const seedPrompts = async (prompts: WritingPrompt[]) => {
    for (const prompt of prompts) {
      await seedPrompt(prompt);
    }

    return prompts;
  };

  const listPrompts = async (): Promise<WritingPrompt[]> => {
    const prompts = await storage.readJsonFile<WritingPrompt[]>(PROMPTS_FILE, []);
    return prompts.slice();
  };

  const listRecentAttempts = async (limit = 5): Promise<RecentAttemptSummary[]> => {
    const records = await readStoredAssessments();
    return records
      .slice()
      .sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt))
      .slice(0, limit)
      .map(toSummary);
  };

  const listSavedAssessments = async (limit = 5): Promise<SavedAssessmentSnapshot[]> => {
    const records = await readStoredAssessments();
    return records
      .slice()
      .sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt))
      .slice(0, limit)
      .map(toSavedAssessment);
  };

  const getDashboardStudyPlan = async (
    prompts: WritingPrompt[],
    savedAssessments: SavedAssessmentSnapshot[],
  ): Promise<StudyPlanSnapshot> => {
    const storedPlan = await storage.readJsonFile<StudyPlanSnapshot | null>(STUDY_PLAN_FILE, null);
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
    await storage.writeJsonFile(STUDY_PLAN_FILE, nextPlan);
    return nextPlan;
  };

  const saveAssessmentResult = async (
    result: Omit<AssessmentPipelineResult, 'recentAttempts'>,
  ): Promise<PersistedAssessmentResult> => {
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
    await storage.writeJsonFile(ASSESSMENTS_FILE, updated);

    return {
      ...stored,
      recentAttempts: updated.slice(0, 5).map(toSummary),
      savedAssessments: updated.slice(0, 5).map(toSavedAssessment),
    };
  };

  return {
    seedPrompt,
    seedPrompts,
    listPrompts,
    listRecentAttempts,
    listSavedAssessments,
    getDashboardStudyPlan,
    saveAssessmentResult,
  };
}

const defaultWritingAssessmentRepository = createWritingAssessmentRepository();

export const seedPrompt = defaultWritingAssessmentRepository.seedPrompt;
export const seedPrompts = defaultWritingAssessmentRepository.seedPrompts;
export const listPrompts = defaultWritingAssessmentRepository.listPrompts;
export const listRecentAttempts = defaultWritingAssessmentRepository.listRecentAttempts;
export const listSavedAssessments = defaultWritingAssessmentRepository.listSavedAssessments;
export const getDashboardStudyPlan = defaultWritingAssessmentRepository.getDashboardStudyPlan;
export const saveAssessmentResult = defaultWritingAssessmentRepository.saveAssessmentResult;
