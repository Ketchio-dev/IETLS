import { afterEach, describe, expect, it, vi } from 'vitest';

import { samplePrompt, sampleSubmission, sampleTask1Prompt } from '@/lib/fixtures/writing';
import { createSubmissionRecord } from '@/lib/services/assessment';
import { extractWritingEvidence } from '@/lib/services/writing/evidence-extractor';
import { WRITING_RUBRIC_SCHEMA_VERSION, scoreWritingWithAdapter } from '@/lib/services/writing/scorer-adapter';

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

  it('falls back to the mock scorer when OpenRouter config is missing', async () => {
    vi.stubEnv('IELTS_SCORER_PROVIDER', 'openrouter');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.evaluationTrace.scorerProvider).toBe('mock-rule-based');
    expect(result.evaluationTrace.usedMockFallback).toBe(true);
    expect(result.evaluationTrace.notes[0]).toContain('OPENROUTER_API_KEY is missing');
  });

  it('falls back to the mock scorer when OpenRouter output does not satisfy the contract', async () => {
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

    const result = await scoreWritingWithAdapter(samplePrompt, buildEvidence(), sampleSubmission.response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.evaluationTrace.scorerProvider).toBe('mock-rule-based');
    expect(result.evaluationTrace.usedMockFallback).toBe(true);
    expect(result.evaluationTrace.notes[0]).toContain('did not match the writing rubric scorecard contract');
  });
});
