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
import { calibrateMockOverallBand, calibrateOpenRouterOverallBand } from './overall-calibration';
import {
  deriveOverallBandRange,
  deriveOverallConfidence,
  getCriteriaForTaskType,
  getCriterionEvidence,
  predictCriterionScores,
} from './scoring-model';

export const WRITING_RUBRIC_SCHEMA_VERSION = 'writing-rubric-scorecard/v1';
const CALIBRATION_VERSION = 'overall-calibration-v4-public-kaggle-mock-and-openrouter';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-flash-preview';
const OPENROUTER_TIMEOUT_MS = 15_000;
const DEFAULT_GEMINI_CLI_MODEL = 'gemini-3-flash-preview';
const GEMINI_CLI_TIMEOUT_MS = 45_000;
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
const ALL_WRITING_CRITERIA: CriterionName[] = [...new Set(Object.values(WRITING_CRITERIA_BY_TASK_TYPE).flat())];
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

interface ProviderRubricResponse {
  schemaVersion: string;
  providerSchemaVersion: string;
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

interface GeminiCliConfig {
  binary: string;
  model: string;
  timeoutMs: number;
}

type GeminiCliRunner = (file: string, args: string[], timeoutMs: number) => Promise<{ stdout: string; stderr: string }>;

interface MockScorecardOptions {
  configuredProvider: string | null;
  fallbackReason?: string;
}

interface WritingScorerAdapterInput {
  prompt: WritingPrompt;
  evidence: EvidenceSignal[];
  responseText: string;
}

export class WritingScorerUnavailableError extends Error {
  constructor(message = 'Live writing scorer is unavailable right now. Please try again.') {
    super(message);
    this.name = 'WritingScorerUnavailableError';
  }
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
  const rawOverallBand = clampBand(
    criterionScores.reduce((sum, item) => sum + item.band, 0) / criterionScores.length,
  );
  const rawOverallBandRange = deriveOverallBandRange(criterionScores);
  const calibratedOverall = calibrateMockOverallBand(prompt.taskType, rawOverallBand, rawOverallBandRange);
  const overallBand = calibratedOverall.calibratedOverallBand;
  const overallBandRange = calibratedOverall.calibratedOverallBandRange;
  const { confidence, reasons } = deriveOverallConfidence(criterionScores, evidence);
  const usedMockFallback = Boolean(options.fallbackReason) || (options.configuredProvider !== null && options.configuredProvider !== 'mock');

  return {
    schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
    criterionScores,
    overallBand,
    overallBandRange,
    confidence,
    confidenceReasons: [
      ...reasons,
      calibratedOverall.note,
      'Criterion bands remain heuristic signals; the public calibration currently adjusts the mock overall band only.',
    ],
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
      notes: [...buildMockNotes(options), calibratedOverall.note, `Raw heuristic overall band before calibration: ${calibratedOverall.rawOverallBand.toFixed(1)}.`],
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

function isTruthyEnvFlag(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function isOpenRouterOverallCalibrationDisabled() {
  return isTruthyEnvFlag(process.env.IETLS_DISABLE_OPENROUTER_OVERALL_CALIBRATION);
}

function normalizeGeminiCliModel(model: string) {
  const normalized = model.trim().toLowerCase();

  if (normalized === 'gemini-3-flash') {
    return DEFAULT_GEMINI_CLI_MODEL;
  }

  return model.trim();
}

function normalizeOpenRouterModel(model: string) {
  const normalized = model.trim().toLowerCase();

  if (normalized === 'google/gemini-3-flash') {
    return DEFAULT_OPENROUTER_MODEL;
  }

  return model.trim();
}

function getOpenRouterConfig(): OpenRouterConfig {
  const timeoutMs = Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '', 10);

  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL,
    model: normalizeOpenRouterModel(process.env.IELTS_SCORER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL),
    referer: process.env.OPENROUTER_HTTP_REFERER?.trim() || null,
    title: process.env.OPENROUTER_APP_TITLE?.trim() || null,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : OPENROUTER_TIMEOUT_MS,
  };
}

function getGeminiCliConfig(): GeminiCliConfig {
  const timeoutMs = Number.parseInt(process.env.GEMINI_CLI_TIMEOUT_MS ?? '', 10);
  const model = process.env.IELTS_SCORER_MODEL?.trim() || DEFAULT_GEMINI_CLI_MODEL;

  return {
    binary: process.env.GEMINI_CLI_PATH?.trim() || 'gemini',
    model: normalizeGeminiCliModel(model),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : GEMINI_CLI_TIMEOUT_MS,
  };
}

function buildOpenRouterEndpoint(baseUrl: string) {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new WritingScorerUnavailableError('Live writing scorer is misconfigured right now. Please try again later.');
  }

  const hostname = url.hostname.toLowerCase();

  if (url.protocol !== 'https:' || (hostname !== 'openrouter.ai' && hostname !== 'www.openrouter.ai')) {
    throw new WritingScorerUnavailableError('Live writing scorer is misconfigured right now. Please try again later.');
  }

  return `${url.toString().replace(/\/$/, '')}/chat/completions`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeBandValue(value: unknown): number | null {
  const candidate = typeof value === 'string' && value.trim().length > 0
    ? Number(value)
    : value;

  if (
    typeof candidate !== 'number'
    || !Number.isFinite(candidate)
    || candidate < 0
    || candidate > 9
    || !Number.isInteger(candidate * 2)
  ) {
    return null;
  }

  return candidate;
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

function normalizeBandRange(value: unknown): StructuredRubricScorecard['overallBandRange'] | null {
  if (!isRecord(value)) {
    return null;
  }

  const lower = normalizeBandValue(value.lower);
  const upper = normalizeBandValue(value.upper);

  if (lower === null || upper === null || lower > upper) {
    return null;
  }

  return { lower, upper };
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

    const band = normalizeBandValue(item.band);
    const bandRange = normalizeBandRange(item.bandRange);

    if (
      !isCriterionNameForTaskType(item.criterion, taskType)
      || band === null
      || bandRange === null
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
      band,
      bandRange,
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
    typeof value.schemaVersion !== 'string'
    || value.schemaVersion.trim().length === 0
    || !isConfidenceLevel(value.confidence)
    || !isStringArray(value.confidenceReasons)
  ) {
    return null;
  }

  const overallBand = normalizeBandValue(value.overallBand);
  const overallBandRange = normalizeBandRange(value.overallBandRange);
  if (overallBand === null || overallBandRange === null) {
    return null;
  }

  const criterionScores = normalizeCriterionScores(value.criterionScores, taskType);

  if (!criterionScores) {
    return null;
  }

  const criterionAverage = criterionScores.reduce((sum, s) => sum + s.band, 0) / criterionScores.length;

  if (Math.abs(overallBand - criterionAverage) > 1.5) {
    return null;
  }

  return {
    schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
    providerSchemaVersion: value.schemaVersion.trim(),
    criterionScores,
    overallBand,
    overallBandRange,
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

function buildGeminiCliScoringPrompt(prompt: WritingPrompt, evidence: EvidenceSignal[], responseText: string) {
  return [
    getSystemPrompt(prompt.taskType),
    'Return exactly one JSON object matching this schema. Do not wrap the JSON in markdown fences.',
    `Required schema: ${JSON.stringify(providerRubricResponseSchema)}`,
    buildOpenRouterScoringPrompt(prompt, evidence, responseText),
  ].join('\n\n');
}

function runExecFile(file: string, args: string[], timeoutMs: number) {
  return import('node:child_process').then(
    (childProcess) =>
      new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        childProcess.execFile(
          file,
          args,
          {
            encoding: 'utf8',
            timeout: timeoutMs,
            maxBuffer: 4 * 1024 * 1024,
          },
          (error, stdout, stderr) => {
            if (error) {
              reject(Object.assign(error, { stdout, stderr }));
              return;
            }

            resolve({ stdout, stderr });
          },
        );
      }),
  );
}

let geminiCliRunner: GeminiCliRunner = runExecFile;

function parseGeminiCliEnvelope(stdout: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch {
    throw new WritingScorerUnavailableError('Gemini CLI returned an invalid response. Please try again.');
  }

  if (!isRecord(parsed) || typeof parsed.response !== 'string' || parsed.response.trim().length === 0) {
    throw new WritingScorerUnavailableError('Gemini CLI returned an invalid response. Please try again.');
  }

  const sessionId = typeof parsed.session_id === 'string' && parsed.session_id.trim().length > 0
    ? parsed.session_id
    : null;

  return {
    responseText: parsed.response,
    sessionId,
  };
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

    const response = await fetch(buildOpenRouterEndpoint(config.baseUrl), {
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
      throw new WritingScorerUnavailableError('Live writing scorer request failed. Please try again.');
    }

    const choice = Array.isArray(body.choices) ? body.choices[0] : null;
    const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;
    const content = getAssistantMessageContent(message?.content);

    if (!content) {
      throw new WritingScorerUnavailableError('Live writing scorer returned an invalid response. Please try again.');
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(extractJsonPayload(content)) as unknown;
    } catch {
      throw new WritingScorerUnavailableError('Live writing scorer returned an invalid response. Please try again.');
    }

    const payload = normalizeProviderRubricResponse(parsed, input.prompt.taskType);

    if (!payload) {
      throw new WritingScorerUnavailableError('Live writing scorer returned an invalid response. Please try again.');
    }

    const responseModel = typeof body.model === 'string' && body.model.trim().length > 0 ? body.model : config.model;
    const totalTokens = isRecord(body.usage) && typeof body.usage.total_tokens === 'number' ? body.usage.total_tokens : null;
    const responseId = typeof body.id === 'string' && body.id.trim().length > 0 ? body.id : null;
    const calibrationDisabled = isOpenRouterOverallCalibrationDisabled();
    const calibratedOverall = calibrationDisabled
      ? null
      : calibrateOpenRouterOverallBand(input.prompt.taskType, payload.overallBand, payload.overallBandRange);

    return {
      ...payload,
      overallBand: calibratedOverall?.calibratedOverallBand ?? payload.overallBand,
      overallBandRange: calibratedOverall?.calibratedOverallBandRange ?? payload.overallBandRange,
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
          ...(calibratedOverall
            ? [
                calibratedOverall.note,
                `Raw OpenRouter overall band before calibration: ${calibratedOverall.rawOverallBand.toFixed(1)}.`,
              ]
            : ['OpenRouter overall-band calibration was explicitly disabled for this run.']),
          ...(payload.providerSchemaVersion !== WRITING_RUBRIC_SCHEMA_VERSION
            ? [`OpenRouter schemaVersion normalized from ${payload.providerSchemaVersion} to ${WRITING_RUBRIC_SCHEMA_VERSION}.`]
            : []),
          ...(responseId ? [`OpenRouter response id: ${responseId}.`] : []),
          ...(totalTokens !== null ? [`OpenRouter total tokens: ${totalTokens}.`] : []),
        ],
        criterionTrace: payload.criterionScores.map((score) =>
          buildCriterionTrace(input.prompt, score.criterion, input.evidence),
        ),
      },
    } satisfies StructuredRubricScorecard;
  } catch (error) {
    if (error instanceof WritingScorerUnavailableError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new WritingScorerUnavailableError('Live writing scorer timed out. Please try again.');
    }

    throw new WritingScorerUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

async function requestGeminiCliScore(input: WritingScorerAdapterInput, config: GeminiCliConfig) {
  try {
    const { stdout, stderr } = await geminiCliRunner(
      config.binary,
      [
        '-m',
        config.model,
        '--output-format',
        'json',
        '-p',
        buildGeminiCliScoringPrompt(input.prompt, input.evidence, input.responseText),
      ],
      config.timeoutMs,
    );

    const envelope = parseGeminiCliEnvelope(stdout.trim());

    let parsed: unknown;

    try {
      parsed = JSON.parse(extractJsonPayload(envelope.responseText)) as unknown;
    } catch {
      throw new WritingScorerUnavailableError('Gemini CLI returned an invalid response. Please try again.');
    }

    const payload = normalizeProviderRubricResponse(parsed, input.prompt.taskType);

    if (!payload) {
      throw new WritingScorerUnavailableError('Gemini CLI returned an invalid response. Please try again.');
    }

    const stderrNotes = stderr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('Loaded cached credentials.'))
      .slice(0, 3);

    return {
      ...payload,
      evaluationTrace: {
        schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
        scorerProvider: 'gemini-cli',
        scorerModel: config.model,
        configuredProvider: 'gemini-cli',
        usedMockFallback: false,
        rubricVersion: getRubricVersion(input.prompt),
        calibrationVersion: CALIBRATION_VERSION,
        evidenceSignalCount: input.evidence.length,
        evidenceFingerprint: buildEvidenceFingerprint(input.evidence),
        scoredAt: new Date().toISOString(),
        notes: [
          'Gemini CLI returned a structured rubric scorecard. Criterion scores and overall band were produced by the provider model, not local heuristics.',
          'The criterionTrace below reflects local evidence signals only; it does not describe how the provider arrived at its scores.',
          ...(payload.providerSchemaVersion !== WRITING_RUBRIC_SCHEMA_VERSION
            ? [`Gemini CLI schemaVersion normalized from ${payload.providerSchemaVersion} to ${WRITING_RUBRIC_SCHEMA_VERSION}.`]
            : []),
          ...(envelope.sessionId ? [`Gemini CLI session id: ${envelope.sessionId}.`] : []),
          ...stderrNotes.map((line) => `Gemini CLI stderr: ${line}`),
        ],
        criterionTrace: payload.criterionScores.map((score) =>
          buildCriterionTrace(input.prompt, score.criterion, input.evidence),
        ),
      },
    } satisfies StructuredRubricScorecard;
  } catch (error) {
    if (error instanceof WritingScorerUnavailableError) {
      throw error;
    }

    if (error instanceof Error) {
      const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';

      if (error.message.includes('timed out') || error.message.includes('ETIMEDOUT')) {
        throw new WritingScorerUnavailableError('Gemini CLI timed out. Please try again.');
      }

      if (error.message.includes('ENOENT')) {
        throw new WritingScorerUnavailableError('Gemini CLI is not installed on this server right now. Please try again later.');
      }

      if (stderr.includes('ModelNotFoundError')) {
        throw new WritingScorerUnavailableError('Gemini CLI model is not available right now. Please try again later.');
      }

      throw new WritingScorerUnavailableError('Gemini CLI request failed. Please try again.');
    }

    throw new WritingScorerUnavailableError();
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
    const config = getOpenRouterConfig();

    if (!config.apiKey) {
      throw new WritingScorerUnavailableError('Live writing scorer is not configured right now. Please try again later.');
    }

    return requestOpenRouterScore(input, config);
  },
};

const geminiCliScorerAdapter: WritingScorerAdapter = {
  provider: 'gemini-cli',
  model: DEFAULT_GEMINI_CLI_MODEL,
  schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
  async score(input) {
    return requestGeminiCliScore(input, getGeminiCliConfig());
  },
};

export function scoreWritingWithMockAdapter(
  prompt: WritingPrompt,
  evidence: EvidenceSignal[],
  options: MockScorecardOptions = { configuredProvider: 'mock' },
) {
  return createMockScorecard(prompt, evidence, options);
}

export function setGeminiCliRunnerForTests(runner: GeminiCliRunner | null) {
  geminiCliRunner = runner ?? runExecFile;
}

export function resolveWritingScorerAdapter(): WritingScorerAdapter {
  const configuredProvider = getConfiguredProvider();

  if (configuredProvider === 'openrouter') {
    return openRouterScorerAdapter;
  }

  if (configuredProvider === 'gemini-cli') {
    return geminiCliScorerAdapter;
  }

  return mockScorerAdapter;
}

export async function scoreWritingWithAdapter(prompt: WritingPrompt, evidence: EvidenceSignal[], responseText: string) {
  return resolveWritingScorerAdapter().score({ prompt, evidence, responseText });
}
