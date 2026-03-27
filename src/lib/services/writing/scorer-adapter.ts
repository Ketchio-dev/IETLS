import type {
  ConfidenceLevel,
  CriterionName,
  CriterionScore,
  EvidenceSignal,
  StructuredRubricScorecard,
  WritingPrompt,
  WritingTaskType,
} from '@/lib/domain';

import { clampBand } from './metrics';
import {
  deriveOverallBandRange,
  deriveOverallConfidence,
  getCriteriaForTaskType,
  getCriterionEvidence,
  predictCriterionScores,
} from './scoring-model';

export const WRITING_RUBRIC_SCHEMA_VERSION = 'writing-rubric-scorecard/v1';
const CALIBRATION_VERSION = 'seed-v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-flash';
const OPENROUTER_TIMEOUT_MS = 15_000;
const WRITING_CRITERIA_BY_TASK_TYPE: Record<WritingTaskType, CriterionName[]> = {
  'task-1': [
    'Task Achievement',
    'Coherence & Cohesion',
    'Lexical Resource',
    'Grammatical Range & Accuracy',
  ],
  'task-2': [
    'Task Response',
    'Coherence & Cohesion',
    'Lexical Resource',
    'Grammatical Range & Accuracy',
  ],
};
const ALL_WRITING_CRITERIA: CriterionName[] = [
  'Task Achievement',
  'Task Response',
  'Coherence & Cohesion',
  'Lexical Resource',
  'Grammatical Range & Accuracy',
];
const RUBRIC_VERSION_BY_TASK_TYPE = {
  'task-1': 'ielts-academic-writing-task-1/v1',
  'task-2': 'ielts-academic-writing-task-2/v1',
} as const;

const criterionScoreSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['criterion', 'band', 'bandRange', 'rationale', 'confidence'],
  properties: {
    criterion: {
      type: 'string',
      enum: ALL_WRITING_CRITERIA,
    },
    band: { type: 'number' },
    bandRange: {
      type: 'object',
      additionalProperties: false,
      required: ['lower', 'upper'],
      properties: {
        lower: { type: 'number' },
        upper: { type: 'number' },
      },
    },
    rationale: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
} as const;

const providerRubricResponseSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'WritingRubricScorecardPayload',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'criterionScores', 'overallBand', 'overallBandRange', 'confidence', 'confidenceReasons'],
  properties: {
    schemaVersion: { type: 'string', const: WRITING_RUBRIC_SCHEMA_VERSION },
    overallBand: { type: 'number' },
    overallBandRange: {
      type: 'object',
      additionalProperties: false,
      required: ['lower', 'upper'],
      properties: {
        lower: { type: 'number' },
        upper: { type: 'number' },
      },
    },
    criterionScores: {
      type: 'array',
      items: criterionScoreSchema,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    confidenceReasons: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

export const writingRubricOutputSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'WritingRubricScorecard',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'criterionScores', 'overallBand', 'overallBandRange', 'confidence', 'confidenceReasons', 'evaluationTrace'],
  properties: {
    ...providerRubricResponseSchema.properties,
    evaluationTrace: {
      type: 'object',
      required: ['schemaVersion', 'scorerProvider', 'scorerModel', 'usedMockFallback', 'rubricVersion', 'calibrationVersion', 'evidenceSignalCount', 'criterionTrace'],
    },
  },
} as const;

interface ProviderRubricResponse {
  schemaVersion: string;
  criterionScores: CriterionScore[];
  overallBand: number;
  overallBandRange: StructuredRubricScorecard['overallBandRange'];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
}

interface OpenRouterConfig {
  apiKey: string | null;
  baseUrl: string;
  model: string;
  referer: string | null;
  title: string | null;
  timeoutMs: number;
}

interface MockScorecardOptions {
  configuredProvider: string | null;
  fallbackReason?: string;
}

interface WritingScorerAdapterInput {
  prompt: WritingPrompt;
  evidence: EvidenceSignal[];
  responseText: string;
}

export interface WritingScorerAdapter {
  provider: string;
  model: string;
  schemaVersion: string;
  score(input: WritingScorerAdapterInput): Promise<StructuredRubricScorecard>;
}

function buildEvidenceFingerprint(evidence: EvidenceSignal[]) {
  return evidence.map((item) => `${item.id}:${item.strength}:${item.source}`).join('|');
}

function getRubricVersion(prompt: WritingPrompt) {
  return RUBRIC_VERSION_BY_TASK_TYPE[prompt.taskType];
}

function getSystemPrompt(taskType: WritingTaskType) {
  return taskType === 'task-1'
    ? 'You are an IELTS Academic Writing Task 1 scorer. Return strict JSON only. Do not include markdown or prose outside the JSON object.'
    : 'You are an IELTS Academic Writing Task 2 scorer. Return strict JSON only. Do not include markdown or prose outside the JSON object.';
}

function buildCriterionTrace(
  prompt: WritingPrompt,
  criterion: CriterionName,
  evidence: EvidenceSignal[],
) {
  const relevantSignals = getCriterionEvidence(criterion, evidence, prompt.taskType);

  return {
    criterion,
    signalIds: relevantSignals.map((item) => item.id),
    signalStrengths: relevantSignals.map((item) => item.strength),
    signalSources: relevantSignals.map((item) => item.source),
    notes: relevantSignals.length
      ? [`${relevantSignals.length} rubric signal(s) contributed to this range.`]
      : ['No direct rubric signals matched this criterion, so a fallback midpoint was applied.'],
  };
}

function createMockScorecard(prompt: WritingPrompt, evidence: EvidenceSignal[], options: MockScorecardOptions) {
  const criterionScores = predictCriterionScores(prompt, evidence);
  const overallBand = clampBand(
    criterionScores.reduce((sum, item) => sum + item.band, 0) / criterionScores.length,
  );
  const overallBandRange = deriveOverallBandRange(criterionScores);
  const { confidence, reasons } = deriveOverallConfidence(criterionScores, evidence);
  const usedMockFallback = Boolean(options.fallbackReason) || (options.configuredProvider !== null && options.configuredProvider !== 'mock');

  return {
    schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
    criterionScores,
    overallBand,
    overallBandRange,
    confidence,
    confidenceReasons: reasons,
    evaluationTrace: {
      schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
      scorerProvider: 'mock-rule-based',
      scorerModel: 'heuristic-v1',
      configuredProvider: options.configuredProvider,
      usedMockFallback,
      rubricVersion: getRubricVersion(prompt),
      calibrationVersion: CALIBRATION_VERSION,
      evidenceSignalCount: evidence.length,
      evidenceFingerprint: buildEvidenceFingerprint(evidence),
      scoredAt: new Date().toISOString(),
      notes: buildMockNotes(options),
      criterionTrace: criterionScores.map((score) => buildCriterionTrace(prompt, score.criterion, evidence)),
    },
  } satisfies StructuredRubricScorecard;
}

function buildMockNotes(options: MockScorecardOptions) {
  if (options.fallbackReason) {
    return [options.fallbackReason];
  }

  if (options.configuredProvider === 'mock') {
    return ['Using the built-in mock scorer adapter.'];
  }

  return [
    options.configuredProvider
      ? `Configured scorer "${options.configuredProvider}" is unavailable, so the mock scorer was used.`
      : 'No external scorer is configured yet, so the mock scorer provided the structured rubric output.',
  ];
}

function getConfiguredProvider() {
  const configuredProvider = process.env.IELTS_SCORER_PROVIDER?.trim().toLowerCase();
  return configuredProvider || null;
}

function getOpenRouterConfig(): OpenRouterConfig {
  const timeoutMs = Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '', 10);

  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL,
    model: process.env.IELTS_SCORER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    referer: process.env.OPENROUTER_HTTP_REFERER?.trim() || null,
    title: process.env.OPENROUTER_APP_TITLE?.trim() || null,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : OPENROUTER_TIMEOUT_MS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBandValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 9 && Number.isInteger(value * 2);
}

function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return value === 'high' || value === 'medium' || value === 'low';
}

function isCriterionNameForTaskType(
  value: unknown,
  taskType: WritingTaskType,
): value is CriterionName {
  return typeof value === 'string' && WRITING_CRITERIA_BY_TASK_TYPE[taskType].includes(value as CriterionName);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function isBandRange(value: unknown): value is StructuredRubricScorecard['overallBandRange'] {
  return (
    isRecord(value)
    && isBandValue(value.lower)
    && isBandValue(value.upper)
    && value.lower <= value.upper
  );
}

function normalizeCriterionScores(
  value: unknown,
  taskType: WritingTaskType,
): CriterionScore[] | null {
  const criteria = WRITING_CRITERIA_BY_TASK_TYPE[taskType];

  if (!Array.isArray(value) || value.length !== criteria.length) {
    return null;
  }

  const byCriterion = new Map<CriterionName, CriterionScore>();

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    if (
      !isCriterionNameForTaskType(item.criterion, taskType)
      || !isBandValue(item.band)
      || !isBandRange(item.bandRange)
      || typeof item.rationale !== 'string'
      || item.rationale.trim().length === 0
      || !isConfidenceLevel(item.confidence)
    ) {
      return null;
    }

    if (byCriterion.has(item.criterion)) {
      return null;
    }

    byCriterion.set(item.criterion, {
      criterion: item.criterion,
      band: item.band,
      bandRange: item.bandRange,
      rationale: item.rationale.trim(),
      confidence: item.confidence,
    });
  }

  if (byCriterion.size !== criteria.length) {
    return null;
  }

  return criteria.map((criterion) => byCriterion.get(criterion) ?? null).filter(Boolean) as CriterionScore[];
}

function normalizeProviderRubricResponse(
  value: unknown,
  taskType: WritingTaskType,
): ProviderRubricResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.schemaVersion !== WRITING_RUBRIC_SCHEMA_VERSION
    || !isBandValue(value.overallBand)
    || !isBandRange(value.overallBandRange)
    || !isConfidenceLevel(value.confidence)
    || !isStringArray(value.confidenceReasons)
  ) {
    return null;
  }

  const criterionScores = normalizeCriterionScores(value.criterionScores, taskType);

  if (!criterionScores) {
    return null;
  }

  const criterionAverage = criterionScores.reduce((sum, s) => sum + s.band, 0) / criterionScores.length;
  const overallBand = value.overallBand as number;

  if (Math.abs(overallBand - criterionAverage) > 1.5) {
    return null;
  }

  return {
    schemaVersion: value.schemaVersion,
    criterionScores,
    overallBand,
    overallBandRange: value.overallBandRange,
    confidence: value.confidence,
    confidenceReasons: value.confidenceReasons,
  };
}

function extractJsonPayload(rawContent: string) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  return trimmed;
}

function getAssistantMessageContent(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const text = value
    .map((item) => {
      if (!isRecord(item)) {
        return '';
      }

      if (item.type === 'text' && typeof item.text === 'string') {
        return item.text;
      }

      return '';
    })
    .join('')
    .trim();

  return text || null;
}

function buildOpenRouterScoringPrompt(prompt: WritingPrompt, evidence: EvidenceSignal[], responseText: string) {
  const criteria = getCriteriaForTaskType(prompt.taskType);
  const criteriaText = criteria.join(', ');
  const taskInstruction = prompt.taskType === 'task-1'
    ? 'Score this IELTS Academic Writing Task 1 response.'
    : 'Score this IELTS Academic Writing Task 2 response.';

  return [
    `${taskInstruction} Return only JSON that matches the provided schema.`,
    `Use only these exact criteria names: ${criteriaText}.`,
    'Use IELTS whole or half bands from 0 to 9.',
    `Prompt title: ${prompt.title}`,
    `Prompt: ${prompt.prompt}`,
    `Rubric focus: ${prompt.rubricFocus.join('; ')}`,
    ...(prompt.visual
      ? [
          'Structured visual prompt:',
          JSON.stringify(prompt.visual, null, 2),
        ]
      : []),
    'Essay response:',
    responseText,
    'Evidence signals:',
    JSON.stringify(evidence, null, 2),
  ].join('\n\n');
}

async function requestOpenRouterScore(input: WritingScorerAdapterInput, config: OpenRouterConfig) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (config.referer) {
      headers['HTTP-Referer'] = config.referer;
    }

    if (config.title) {
      headers['X-Title'] = config.title;
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: 1_200,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'writing_rubric_scorecard_payload',
            strict: true,
            schema: providerRubricResponseSchema,
          },
        },
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(input.prompt.taskType),
          },
          {
            role: 'user',
            content: buildOpenRouterScoringPrompt(input.prompt, input.evidence, input.responseText),
          },
        ],
      }),
    });

    const body = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message = isRecord(body.error) && typeof body.error.message === 'string'
        ? body.error.message
        : `HTTP ${response.status}`;
      throw new Error(`OpenRouter request failed: ${message}`);
    }

    const choice = Array.isArray(body.choices) ? body.choices[0] : null;
    const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;
    const content = getAssistantMessageContent(message?.content);

    if (!content) {
      throw new Error('OpenRouter response did not include a JSON message payload.');
    }

    const parsed = JSON.parse(extractJsonPayload(content)) as unknown;
    const payload = normalizeProviderRubricResponse(parsed, input.prompt.taskType);

    if (!payload) {
      throw new Error('OpenRouter output did not match the writing rubric scorecard contract.');
    }

    const responseModel = typeof body.model === 'string' && body.model.trim().length > 0 ? body.model : config.model;
    const totalTokens = isRecord(body.usage) && typeof body.usage.total_tokens === 'number' ? body.usage.total_tokens : null;
    const responseId = typeof body.id === 'string' && body.id.trim().length > 0 ? body.id : null;

    return {
      ...payload,
      evaluationTrace: {
        schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
        scorerProvider: 'openrouter',
        scorerModel: responseModel,
        configuredProvider: 'openrouter',
        usedMockFallback: false,
        rubricVersion: getRubricVersion(input.prompt),
        calibrationVersion: CALIBRATION_VERSION,
        evidenceSignalCount: input.evidence.length,
        evidenceFingerprint: buildEvidenceFingerprint(input.evidence),
        scoredAt: new Date().toISOString(),
        notes: [
          'OpenRouter returned a structured rubric scorecard. Criterion scores and overall band were produced by the provider model, not local heuristics.',
          'The criterionTrace below reflects local evidence signals only; it does not describe how the provider arrived at its scores.',
          ...(responseId ? [`OpenRouter response id: ${responseId}.`] : []),
          ...(totalTokens !== null ? [`OpenRouter total tokens: ${totalTokens}.`] : []),
        ],
        criterionTrace: payload.criterionScores.map((score) =>
          buildCriterionTrace(input.prompt, score.criterion, input.evidence),
        ),
      },
    } satisfies StructuredRubricScorecard;
  } finally {
    clearTimeout(timeout);
  }
}

const mockScorerAdapter: WritingScorerAdapter = {
  provider: 'mock-rule-based',
  model: 'heuristic-v1',
  schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
  async score({ prompt, evidence }) {
    return createMockScorecard(prompt, evidence, {
      configuredProvider: getConfiguredProvider(),
    });
  },
};

const openRouterScorerAdapter: WritingScorerAdapter = {
  provider: 'openrouter',
  model: DEFAULT_OPENROUTER_MODEL,
  schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
  async score(input) {
    const configuredProvider = getConfiguredProvider();
    const config = getOpenRouterConfig();

    if (!config.apiKey) {
      return createMockScorecard(input.prompt, input.evidence, {
        configuredProvider,
        fallbackReason: 'OpenRouter fallback: OPENROUTER_API_KEY is missing, so the mock scorer was used.',
      });
    }

    try {
      return await requestOpenRouterScore(input, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OpenRouter failure.';

      return createMockScorecard(input.prompt, input.evidence, {
        configuredProvider,
        fallbackReason: `OpenRouter fallback: ${message}`,
      });
    }
  },
};

export function scoreWritingWithMockAdapter(
  prompt: WritingPrompt,
  evidence: EvidenceSignal[],
  options: MockScorecardOptions = { configuredProvider: 'mock' },
) {
  return createMockScorecard(prompt, evidence, options);
}

export function resolveWritingScorerAdapter(): WritingScorerAdapter {
  const configuredProvider = getConfiguredProvider();

  if (configuredProvider === 'openrouter') {
    return openRouterScorerAdapter;
  }

  return mockScorerAdapter;
}

export async function scoreWritingWithAdapter(prompt: WritingPrompt, evidence: EvidenceSignal[], responseText: string) {
  return resolveWritingScorerAdapter().score({ prompt, evidence, responseText });
}
