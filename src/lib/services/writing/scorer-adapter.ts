import type { CriterionName, EvidenceSignal, StructuredRubricScorecard, WritingPrompt } from '@/lib/domain';

import { clampBand } from './metrics';
import { deriveOverallBandRange, deriveOverallConfidence, getCriterionEvidence, predictCriterionScores } from './scoring-model';

export const WRITING_RUBRIC_SCHEMA_VERSION = 'writing-rubric-scorecard/v1';
const RUBRIC_VERSION = 'ielts-academic-writing-task-2/v1';
const CALIBRATION_VERSION = 'seed-v1';

export const writingRubricOutputSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'WritingRubricScorecard',
  type: 'object',
  required: ['schemaVersion', 'criterionScores', 'overallBand', 'overallBandRange', 'confidence', 'confidenceReasons', 'evaluationTrace'],
  properties: {
    schemaVersion: { type: 'string', const: WRITING_RUBRIC_SCHEMA_VERSION },
    overallBand: { type: 'number' },
    overallBandRange: {
      type: 'object',
      required: ['lower', 'upper'],
      properties: {
        lower: { type: 'number' },
        upper: { type: 'number' },
      },
    },
    criterionScores: {
      type: 'array',
      items: {
        type: 'object',
        required: ['criterion', 'band', 'bandRange', 'rationale', 'confidence'],
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    confidenceReasons: { type: 'array', items: { type: 'string' } },
    evaluationTrace: {
      type: 'object',
      required: ['schemaVersion', 'scorerProvider', 'scorerModel', 'usedMockFallback', 'rubricVersion', 'calibrationVersion', 'evidenceSignalCount', 'criterionTrace'],
    },
  },
} as const;

export interface WritingScorerAdapterInput {
  prompt: WritingPrompt;
  evidence: EvidenceSignal[];
}

export interface WritingScorerAdapter {
  provider: string;
  model: string;
  schemaVersion: string;
  score(input: WritingScorerAdapterInput): StructuredRubricScorecard;
}

function buildEvidenceFingerprint(evidence: EvidenceSignal[]) {
  return evidence.map((item) => `${item.id}:${item.strength}:${item.source}`).join('|');
}

function buildCriterionTrace(criterion: CriterionName, evidence: EvidenceSignal[]) {
  const relevantSignals = getCriterionEvidence(criterion, evidence);

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

function createMockScorecard(prompt: WritingPrompt, evidence: EvidenceSignal[], configuredProvider: string | null) {
  const criterionScores = predictCriterionScores(prompt, evidence);
  const overallBand = clampBand(
    criterionScores.reduce((sum, item) => sum + item.band, 0) / criterionScores.length,
  );
  const overallBandRange = deriveOverallBandRange(criterionScores);
  const { confidence, reasons } = deriveOverallConfidence(criterionScores, evidence);
  const usedMockFallback = configuredProvider !== 'mock';

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
      configuredProvider,
      usedMockFallback,
      rubricVersion: RUBRIC_VERSION,
      calibrationVersion: CALIBRATION_VERSION,
      evidenceSignalCount: evidence.length,
      evidenceFingerprint: buildEvidenceFingerprint(evidence),
      scoredAt: new Date().toISOString(),
      notes:
        configuredProvider === 'mock'
          ? ['Using the built-in mock scorer adapter.']
          : [
              configuredProvider
                ? `Configured scorer "${configuredProvider}" is not wired yet, so the mock scorer was used.`
                : 'No external scorer is configured yet, so the mock scorer provided the structured rubric output.',
            ],
      criterionTrace: criterionScores.map((score) => buildCriterionTrace(score.criterion, evidence)),
    },
  } satisfies StructuredRubricScorecard;
}

const mockScorerAdapter: WritingScorerAdapter = {
  provider: 'mock-rule-based',
  model: 'heuristic-v1',
  schemaVersion: WRITING_RUBRIC_SCHEMA_VERSION,
  score({ prompt, evidence }) {
    const configuredProvider = process.env.IELTS_SCORER_PROVIDER?.trim() || null;
    return createMockScorecard(prompt, evidence, configuredProvider);
  },
};

export function resolveWritingScorerAdapter(): WritingScorerAdapter {
  return mockScorerAdapter;
}

export function scoreWritingWithAdapter(prompt: WritingPrompt, evidence: EvidenceSignal[]) {
  return resolveWritingScorerAdapter().score({ prompt, evidence });
}
