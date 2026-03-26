import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import {
  getDashboardStudyPlan,
  listPrompts,
  listRecentAttempts,
  saveAssessmentResult,
  seedPrompt,
  seedPrompts,
} from '@/lib/server/writing-assessment-repository';
import { runAssessmentPipeline } from '@/lib/services/assessment';

let tempDir = '';

describe('writing assessment repository', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ielts-writing-repo-'));
    vi.stubEnv('IELTS_DATA_DIR', tempDir);
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'mock');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('persists prompts and recent attempts for later sessions', async () => {
    await seedPrompt(samplePrompt);
    const result = await runAssessmentPipeline(samplePrompt, {
      promptId: samplePrompt.id,
      taskType: samplePrompt.taskType,
      response: 'In my opinion, public transport should receive more funding because it reduces congestion and pollution. However, some road investment still matters for freight and safety. Overall, governments should prioritise transit while targeting only the worst road bottlenecks.',
      timeSpentMinutes: 29,
    });

    const stored = await saveAssessmentResult(result);
    const attempts = await listRecentAttempts(5);

    expect(stored.report.promptId).toBe(samplePrompt.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.submissionId).toBe(stored.submission.submissionId);
  });

  it('seeds and lists the prompt bank', async () => {
    await seedPrompts(writingPromptBank);

    const prompts = await listPrompts();

    expect(prompts).toHaveLength(writingPromptBank.length);
    expect(prompts.map((item) => item.id)).toEqual(writingPromptBank.map((item) => item.id));
  });

  it('persists and reuses the dashboard study plan snapshot', async () => {
    await seedPrompts(writingPromptBank);
    const prompts = await listPrompts();

    const firstPlan = await getDashboardStudyPlan(prompts, []);
    const secondPlan = await getDashboardStudyPlan(prompts, []);

    expect(secondPlan).toEqual(firstPlan);
    expect(firstPlan.version).toBe(2);
    expect(firstPlan.attemptsConsidered).toBe(0);
    expect(firstPlan.steps).toHaveLength(3);
  });
});
