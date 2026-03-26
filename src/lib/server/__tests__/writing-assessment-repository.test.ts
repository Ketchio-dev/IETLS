import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt } from '@/lib/fixtures/writing';
import { saveAssessmentResult, listRecentAttempts, seedPrompt } from '@/lib/server/writing-assessment-repository';
import { runAssessmentPipeline } from '@/lib/services/assessment';

let tempDir = '';

describe('writing assessment repository', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ielts-writing-repo-'));
    vi.stubEnv('IELTS_DATA_DIR', tempDir);
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
      response: 'In my opinion, public transport should receive more funding because it reduces congestion and pollution. However, some road investment still matters for freight and safety. Overall, governments should prioritise transit while targeting only the worst road bottlenecks.',
      timeSpentMinutes: 29,
    });

    const stored = await saveAssessmentResult(result);
    const attempts = await listRecentAttempts(5);

    expect(stored.report.promptId).toBe(samplePrompt.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.submissionId).toBe(stored.submission.submissionId);
  });
});
