import { describe, expect, it } from 'vitest';

import { sampleSpeakingPrompt, speakingPromptBank } from '@/lib/fixtures/speaking';
import { createSpeakingAssessmentRepository } from '@/lib/server/speaking-assessment-repository';
import type { JsonStoragePort, StorageFile } from '@/lib/server/storage';

import { createSpeakingApplicationService } from '../application-service';

const transcript =
  'I enjoy living in my city because public transport is reliable and there are many places where I can meet friends after work.';

function createInMemoryStoragePort(): JsonStoragePort {
  const files = new Map<StorageFile, unknown>();

  return {
    async readJsonFile<T>(file: StorageFile, fallback: T) {
      return files.has(file) ? (structuredClone(files.get(file)) as T) : fallback;
    },
    async writeJsonFile<T>(file: StorageFile, value: T) {
      files.set(file, structuredClone(value));
      return `memory://${file}`;
    },
  };
}

describe('speaking application service', () => {
  it('hydrates practice page data with seeded sessions and prompt selection', async () => {
    const service = createSpeakingApplicationService();

    const pageData = await service.loadPracticePageData({
      promptId: 'speaking-part-2-teacher',
      sessionId: 'missing-session',
    });

    expect(pageData.prompts.map((prompt) => prompt.id)).toEqual(speakingPromptBank.map((prompt) => prompt.id));
    expect(pageData.initialPromptId).toBe('speaking-part-2-teacher');
    expect(pageData.initialRecentSessions.length).toBeGreaterThan(0);
    expect(pageData.initialReport.promptId).toBe('speaking-part-2-teacher');
  });

  it('builds dashboard data from recent saved sessions', async () => {
    const service = createSpeakingApplicationService();

    const dashboardData = await service.loadDashboardPageData();

    expect(dashboardData.summary.totalSessions).toBeGreaterThan(0);
    expect(dashboardData.summary.partBreakdown['part-2']).toBeGreaterThan(0);
    expect(dashboardData.summary.sessionsWithAudio).toBeGreaterThanOrEqual(0);
    expect(dashboardData.studyFocus.length).toBeGreaterThan(0);
  });

  it('validates prompt lookups and short transcripts', async () => {
    const service = createSpeakingApplicationService({ now: () => '2026-03-26T18:15:00.000Z' });

    await expect(
      service.submitAssessment({
        promptId: sampleSpeakingPrompt.id,
        transcript: 'too short',
        durationSeconds: 22,
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'Provide a promptId and at least 30 characters of transcript.',
      status: 400,
    });

    await expect(
      service.submitAssessment({
        promptId: 'missing-prompt',
        transcript,
        durationSeconds: 40,
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'Unknown speaking prompt requested.',
      status: 404,
    });
  });

  it('persists new speaking sessions through an injected repository', async () => {
    const storage = createInMemoryStoragePort();
    const repository = createSpeakingAssessmentRepository(storage);
    const service = createSpeakingApplicationService({ now: () => '2026-03-26T18:15:00.000Z', repository });

    const saved = await service.submitAssessment({
      promptId: sampleSpeakingPrompt.id,
      transcript,
      durationSeconds: 44,
      audioArtifact: {
        fileName: 'city-response.webm',
        mimeType: 'audio/webm',
        sizeBytes: 345000,
        durationSeconds: 43,
      },
    });

    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      throw new Error('expected a saved speaking session');
    }
    expect(saved.payload.report.promptId).toBe(sampleSpeakingPrompt.id);
    expect(saved.payload.session.sessionId).toBe('speaking-live-4');
    expect(saved.payload.session.audioArtifact.fileName).toBe('city-response.webm');
    expect(saved.payload.recentSessions[0]?.audioStatus).toBe('attached');
    expect(saved.payload.savedSessions[0]?.createdAt).toBe('2026-03-26T18:15:00.000Z');

    const pageData = await service.loadPracticePageData({ promptId: sampleSpeakingPrompt.id, sessionId: 'speaking-live-4' });
    expect(pageData.initialSavedSessions[0]?.audioArtifact.fileName).toBe('city-response.webm');
    expect(pageData.initialReport.evidenceMode).toBe('transcript-plus-audio-metadata');
  });
});
