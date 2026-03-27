import { afterEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt, sampleSubmission, sampleTask1Prompt } from '@/lib/fixtures/writing';
import { createSubmissionRecord } from '@/lib/services/assessment';
import { extractWritingEvidence } from '@/lib/services/writing/evidence-extractor';
import {
  WRITING_RUBRIC_SCHEMA_VERSION,
  scoreWritingWithAdapter,
  scoreWritingWithMockAdapter,
  WritingScorerUnavailableError,
} from '@/lib/services/writing/scorer-adapter';

function buildEvidence() {
  return extractWritingEvidence(samplePrompt, createSubmissionRecord(sampleSubmission));
}

function buildOpenRouterPayload() {
  return {
    schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
    overallBand: 7,
    overallBandRange: {
      lower: 6.5,
      upper: 7.5,
    },
    confidence: 'medium' as const,
    confidenceReasons: ['Clear position and supporting examples.', 'Sentence variety evidence is still mixed.'],
    criterionScores: [
      {
        criterion: 'Task Response',
        band: 7,
        bandRange: { lower: 6.5, upper: 7.5 },
        rationale: 'The essay maintains a clear position and addresses both views.',
        confidence: 'high' as const,
      },
      {
        criterion: 'Coherence & Cohesion',
        band: 6.5,
        bandRange: { lower: 6, upper: 7 },
        rationale: 'Paragraphing is logical, but some transitions remain predictable.',
        confidence: 'medium' as const,
      },
      {
        criterion: 'Lexical Resource',
        band: 7,
        bandRange: { lower: 6.5, upper: 7.5 },
        rationale: 'Topic vocabulary is precise and mostly natural.',
        confidence: 'medium' as const,
      },
      {
        criterion: 'Grammatical Range & Accuracy',
        band: 6.5,
        bandRange: { lower: 6, upper: 7 },
        rationale: 'Complex forms appear, though control is uneven.',
        confidence: 'medium' as const,
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('scoreWritingWithAdapter', () => {
  it('uses OpenRouter when configured and returns provider metadata', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('IELTS_SCORER_MODEL', 'google/gemini-3-flash');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'gen-123',
        model: 'google/gemini-3-flash',
        usage: { total_tokens: 321 },
        choices: [
          {
            message: {
              content: JSON.stringify(buildOpenRouterPayload()),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.evaluationTrace.scorerProvider).toBe('openrouter');
    expect(result.evaluationTrace.scorerModel).toBe('google/gemini-3-flash');
    expect(result.evaluationTrace.usedMockFallback).toBe(false);
    expect(result.evaluationTrace.configuredProvider).toBe('openrouter');
    expect(result.overallBand).toBe(7);
    expect(result.criterionScores).toHaveLength(4);
    expect(result.evaluationTrace.notes.join(' ')).toContain('OpenRouter');
  });

  it('keeps Gemini 3 Flash as the default OpenRouter scorer model', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'gen-456',
        model: 'google/gemini-3-flash',
        usage: { total_tokens: 222 },
        choices: [
          {
            message: {
              content: JSON.stringify(buildOpenRouterPayload()),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"model":"google/gemini-3-flash"'),
      }),
    );
  });

  it('uses a Task 1 system prompt when scoring Academic Task 1', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'gen-789',
        model: 'google/gemini-3-flash',
        usage: { total_tokens: 180 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...buildOpenRouterPayload(),
                criterionScores: [
                  {
                    criterion: 'Task Achievement',
                    band: 7,
                    bandRange: { lower: 6.5, upper: 7.5 },
                    rationale: 'The report captures the main features clearly.',
                    confidence: 'high' as const,
                  },
                  {
                    criterion: 'Coherence & Cohesion',
                    band: 6.5,
                    bandRange: { lower: 6, upper: 7 },
                    rationale: 'Paragraphing is logical.',
                    confidence: 'medium' as const,
                  },
                  {
                    criterion: 'Lexical Resource',
                    band: 7,
                    bandRange: { lower: 6.5, upper: 7.5 },
                    rationale: 'Trend language is mostly precise.',
                    confidence: 'medium' as const,
                  },
                  {
                    criterion: 'Grammatical Range & Accuracy',
                    band: 6.5,
                    bandRange: { lower: 6, upper: 7 },
                    rationale: 'Complex forms appear, though control is uneven.',
                    confidence: 'medium' as const,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await scoreWritingWithAdapter(
      sampleTask1Prompt,
      extractWritingEvidence(sampleTask1Prompt, {
        promptId: sampleTask1Prompt.id,
        taskType: sampleTask1Prompt.taskType,
        response:
          'Overall, passenger numbers peak at 8:00 and 18:00, while usage is lowest at the beginning and end of the day.',
        timeSpentMinutes: 18,
      }),
      'Overall, passenger numbers peak at 8:00 and 18:00, while usage is lowest at the beginning and end of the day.',
    );

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = typeof request?.body === 'string' ? JSON.parse(request.body) : null;

    expect(body?.messages?.[0]?.content).toContain('Task 1 scorer');
  });

  it('fails closed when OpenRouter config is missing', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
    await expect(scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response)).rejects.toThrow(
      WritingScorerUnavailableError,
    );
  });

  it('fails closed when OpenRouter output does not satisfy the contract', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'google/gemini-3-flash',
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
                overallBand: 7,
                overallBandRange: { lower: 6.5, upper: 7.5 },
                confidence: 'medium',
                confidenceReasons: ['Incomplete payload'],
                criterionScores: [
                  {
                    criterion: 'Task Response',
                    band: 7,
                    bandRange: { lower: 6.5, upper: 7.5 },
                    rationale: 'Only one criterion returned.',
                    confidence: 'medium',
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const scoringPromise = scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    await expect(scoringPromise).rejects.toThrow(
      'Live writing scorer returned an invalid response. Please try again.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when overallBand differs from criterion average by more than 1.5', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    // criterionScores average: (5 + 5 + 5 + 5) / 4 = 5.0, overallBand: 8.0, diff = 3.0 > 1.5
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'gen-consistency-check',
        model: 'google/gemini-3-flash',
        usage: { total_tokens: 200 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
                overallBand: 8,
                overallBandRange: { lower: 7.5, upper: 8.5 },
                confidence: 'high' as const,
                confidenceReasons: ['Inconsistent overall band.'],
                criterionScores: [
                  {
                    criterion: 'Task Response',
                    band: 5,
                    bandRange: { lower: 4.5, upper: 5.5 },
                    rationale: 'Addresses the task but lacks depth.',
                    confidence: 'medium' as const,
                  },
                  {
                    criterion: 'Coherence & Cohesion',
                    band: 5,
                    bandRange: { lower: 4.5, upper: 5.5 },
                    rationale: 'Basic paragraph structure present.',
                    confidence: 'medium' as const,
                  },
                  {
                    criterion: 'Lexical Resource',
                    band: 5,
                    bandRange: { lower: 4.5, upper: 5.5 },
                    rationale: 'Limited range of vocabulary.',
                    confidence: 'medium' as const,
                  },
                  {
                    criterion: 'Grammatical Range & Accuracy',
                    band: 5,
                    bandRange: { lower: 4.5, upper: 5.5 },
                    rationale: 'Mostly simple structures with some errors.',
                    confidence: 'medium' as const,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const scoringPromise = scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    await expect(scoringPromise).rejects.toThrow(
      'Live writing scorer returned an invalid response. Please try again.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns usedMockFallback false when scoreWritingWithMockAdapter is called with no configured provider', () => {
    const result = scoreWritingWithMockAdapter(samplePrompt, buildEvidence(), { configuredProvider: null });

    expect(result.evaluationTrace.usedMockFallback).toBe(false);
    expect(result.evaluationTrace.scorerProvider).toBe('mock-rule-based');
    expect(result.evaluationTrace.configuredProvider).toBeNull();
  });

  it('includes provider model and local evidence signals notes when OpenRouter returns a valid score', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'gen-notes-check',
        model: 'google/gemini-3-flash',
        usage: { total_tokens: 310 },
        choices: [
          {
            message: {
              content: JSON.stringify(buildOpenRouterPayload()),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    const notesText = result.evaluationTrace.notes.join(' ');
    expect(notesText).toContain('provider model');
    expect(notesText).toContain('local evidence signals only');
  });

  it('fails closed when OpenRouter times out', async () => {
    vi.useFakeTimers();
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('OPENROUTER_TIMEOUT_MS', '1');

    const fetchMock = vi.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('The operation was aborted.');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const scoringPromise = scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);
    const rejectionExpectation = expect(scoringPromise).rejects.toThrow(
      'Live writing scorer timed out. Please try again.',
    );

    await vi.advanceTimersByTimeAsync(5);

    await rejectionExpectation;
  });
});
