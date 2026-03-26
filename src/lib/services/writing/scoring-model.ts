import type { BandRange, ConfidenceLevel, CriterionName, CriterionScore, EvidenceSignal, WritingPrompt } from '@/lib/domain';

import { clampBand } from './metrics';

const criterionMap: Record<CriterionName, string[]> = {
  'Task Response': ['coverage-word-count', 'coverage-relevance', 'response-position', 'grammar-support'],
  'Coherence & Cohesion': ['cohesion-paragraphing', 'cohesion-balance'],
  'Lexical Resource': ['lexical-topic-range', 'lexical-generality'],
  'Grammatical Range & Accuracy': ['grammar-variety'],
};

const strengthToWeight = {
  strong: 1,
  developing: 0.5,
  weak: 0,
} as const;

const rangePaddingByConfidence: Record<ConfidenceLevel, number> = {
  high: 0.5,
  medium: 1,
  low: 1.5,
};

export function getCriterionEvidence(criterion: CriterionName, evidence: EvidenceSignal[]) {
  return evidence.filter((item) => criterionMap[criterion].includes(item.id));
}

function deriveBandRange(band: number, confidence: ConfidenceLevel): BandRange {
  const padding = rangePaddingByConfidence[confidence];
  return {
    lower: clampBand(band - padding),
    upper: clampBand(band + padding),
  };
}

function scoreCriterion(criterion: CriterionName, evidence: EvidenceSignal[], prompt: WritingPrompt): CriterionScore {
  const relevant = getCriterionEvidence(criterion, evidence);
  const weight = relevant.reduce((sum, item) => sum + strengthToWeight[item.strength], 0);
  const normalized = relevant.length ? weight / relevant.length : 0.5;

  const baseline = criterion === 'Task Response' ? 5.5 : criterion === 'Coherence & Cohesion' ? 5.5 : 5;
  const promptAdjustment = prompt.taskType === 'task-2' ? 0.25 : 0;
  const band = clampBand(baseline + normalized * 2 + promptAdjustment);
  const weakSignals = relevant.filter((item) => item.strength === 'weak').length;
  const confidence: ConfidenceLevel = weakSignals >= 2 ? 'low' : weakSignals === 1 ? 'medium' : 'high';

  const rationale =
    criterion === 'Task Response'
      ? normalized >= 0.8
        ? 'The draft covers both the prompt and a clear position with enough support for a credible practice estimate.'
        : 'The draft addresses the prompt, but support or explicit position control still limits the score ceiling.'
      : criterion === 'Coherence & Cohesion'
        ? normalized >= 0.8
          ? 'Paragraphing and discussion cues support a mostly controlled line of argument.'
          : 'The essay has a workable structure, but progression and paragraph control still feel uneven.'
        : criterion === 'Lexical Resource'
          ? normalized >= 0.8
            ? 'Topic vocabulary is specific enough to sound task-aware rather than generic.'
            : 'Vocabulary is serviceable, but more precision is needed to sound less repetitive or broad.'
          : normalized >= 0.8
            ? 'The draft attempts a reasonable mix of clause patterns without obvious simplification.'
            : 'Sentence control is promising, but the current signals are not strong enough for a higher-confidence grammar estimate.';

  return {
    criterion,
    band,
    bandRange: deriveBandRange(band, confidence),
    rationale,
    confidence,
  };
}

export function predictCriterionScores(prompt: WritingPrompt, evidence: EvidenceSignal[]): CriterionScore[] {
  return (Object.keys(criterionMap) as CriterionName[]).map((criterion) => scoreCriterion(criterion, evidence, prompt));
}

export function deriveOverallBandRange(scores: CriterionScore[]): BandRange {
  return {
    lower: clampBand(scores.reduce((sum, score) => sum + score.bandRange.lower, 0) / scores.length),
    upper: clampBand(scores.reduce((sum, score) => sum + score.bandRange.upper, 0) / scores.length),
  };
}

export function deriveOverallConfidence(
  scores: CriterionScore[],
  evidence: EvidenceSignal[],
): { confidence: ConfidenceLevel; reasons: string[] } {
  const lowConfidenceScores = scores.filter((score) => score.confidence === 'low').length;
  const weakSignals = evidence.filter((item) => item.strength === 'weak').length;
  const overallBandRange = deriveOverallBandRange(scores);

  const reasons = [
    'This is a practice estimate, not an official IELTS score.',
    `The current scoring range is Band ${overallBandRange.lower.toFixed(1)}-${overallBandRange.upper.toFixed(1)} based on the signals in this draft.`,
    ...(weakSignals > 0 ? [`${weakSignals} evidence signal(s) remain weak, so the score range could move after revision.`] : []),
    ...(lowConfidenceScores > 0 ? ['At least one criterion relies on incomplete evidence, so the reported range is intentionally wider.'] : []),
  ];

  const confidence: ConfidenceLevel = lowConfidenceScores > 0 || weakSignals >= 3 ? 'low' : weakSignals >= 1 ? 'medium' : 'high';
  return { confidence, reasons };
}
