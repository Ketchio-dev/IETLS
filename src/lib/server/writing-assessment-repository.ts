import { randomUUID } from 'node:crypto';

import type { AssessmentPipelineResult, RecentAttemptSummary, StoredAssessmentRecord, WritingPrompt } from '@/lib/domain';

import { readJsonFile, writeJsonFile } from './storage';

const PROMPTS_FILE = 'writing-prompts.json';
const ASSESSMENTS_FILE = 'writing-assessments.json';

function toSummary(record: StoredAssessmentRecord): RecentAttemptSummary {
  return {
    submissionId: record.submission.submissionId,
    promptId: record.submission.promptId,
    overallBand: record.report.overallBand,
    confidence: record.report.confidence,
    estimatedWordCount: record.report.estimatedWordCount,
    summary: record.report.summary,
    createdAt: record.submission.createdAt,
  };
}

export async function seedPrompt(prompt: WritingPrompt) {
  const prompts = await readJsonFile<WritingPrompt[]>(PROMPTS_FILE, []);
  if (prompts.some((item) => item.id === prompt.id)) {
    return prompt;
  }

  await writeJsonFile(PROMPTS_FILE, [...prompts, prompt]);
  return prompt;
}

export async function listRecentAttempts(limit = 5): Promise<RecentAttemptSummary[]> {
  const records = await readJsonFile<StoredAssessmentRecord[]>(ASSESSMENTS_FILE, []);
  return records
    .slice()
    .sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt))
    .slice(0, limit)
    .map(toSummary);
}

export async function saveAssessmentResult(result: Omit<AssessmentPipelineResult, 'recentAttempts'>) {
  const records = await readJsonFile<StoredAssessmentRecord[]>(ASSESSMENTS_FILE, []);
  const stored: StoredAssessmentRecord = {
    submission: result.submission,
    report: {
      ...result.report,
      reportId: result.report.reportId || randomUUID(),
    },
  };

  const updated = [stored, ...records];
  await writeJsonFile(ASSESSMENTS_FILE, updated);

  return {
    ...stored,
    recentAttempts: updated.slice(0, 5).map(toSummary),
  };
}
