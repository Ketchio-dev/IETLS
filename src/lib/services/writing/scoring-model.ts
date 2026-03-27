import type { BandRange, ConfidenceLevel, CriterionName, CriterionScore, EvidenceSignal, WritingPrompt, WritingTaskType } from '@/lib/domain';

import { clampBand } from './metrics';

const criterionMapByTaskType: Record<WritingTaskType, Record<CriterionName, string[]>> = {
  'task-1': {
    'Task Achievement': ['task1-word-count', 'task1-overview', 'task1-key-features'],
    'Task Response': [],
    'Coherence & Cohesion': ['cohesion-paragraphing', 'task1-comparisons'],
    'Lexical Resource': ['task1-trend-language', 'lexical-generality'],
    'Grammatical Range & Accuracy': ['grammar-variety', 'task1-time-reference'],
  },
  'task-2': {
    'Task Achievement': [],
    'Task Response': ['coverage-word-count', 'coverage-relevance', 'response-position', 'grammar-support'],
    'Coherence & Cohesion': ['cohesion-paragraphing', 'cohesion-balance'],
    'Lexical Resource': ['lexical-topic-range', 'lexical-generality'],
    'Grammatical Range & Accuracy': ['grammar-variety'],
  },
};

const criteriaByTaskType: Record<WritingTaskType, CriterionName[]> = {
  'task-1': ['Task Achievement', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range & Accuracy'],
  'task-2': ['Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range & Accuracy'],
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

const baselineByCriterion: Record<CriterionName, number> = {
  'Task Achievement': 4.5,
  'Task Response': 4.5,
  'Coherence & Cohesion': 4.5,
  'Lexical Resource': 4,
  'Grammatical Range & Accuracy': 4,
};

export function getCriteriaForTaskType(taskType: WritingTaskType): CriterionName[] {
  return criteriaByTaskType[taskType];
}

export function getCriterionEvidence(criterion: CriterionName, evidence: EvidenceSignal[], taskType: WritingTaskType) {
  return evidence.filter((item) => criterionMapByTaskType[taskType][criterion].includes(item.id));
}

function deriveBandRange(band: number, confidence: ConfidenceLevel): BandRange {
  const padding = rangePaddingByConfidence[confidence];
  return {
    lower: clampBand(band - padding),
    upper: clampBand(band + padding),
  };
}

function scoreCriterion(criterion: CriterionName, evidence: EvidenceSignal[], prompt: WritingPrompt): CriterionScore {
  const relevant = getCriterionEvidence(criterion, evidence, prompt.taskType);
  const weight = relevant.reduce((sum, item) => sum + strengthToWeight[item.strength], 0);
  const normalized = relevant.length ? weight / relevant.length : 0;
  const weakSignals = relevant.filter((item) => item.strength === 'weak').length;
  const band = clampBand(baselineByCriterion[criterion] + normalized * 2 - weakSignals * 0.5);
  const confidence: ConfidenceLevel = weakSignals >= 2 ? 'low' : weakSignals === 1 ? 'medium' : 'high';

  const rationale =
    criterion === 'Task Achievement'
      ? normalized >= 0.8
        ? 'The report highlights the main visual features clearly and supports them with relevant data comparisons.'
        : 'The response describes the data, but the overview or feature selection is still too thin for a stronger Task 1 estimate.'
      : criterion === 'Task Response'
        ? normalized >= 0.8
          ? 'The draft covers both the prompt and a clear position with enough support for a credible practice estimate.'
          : 'The draft addresses the prompt, but support or explicit position control still limits the score ceiling.'
        : criterion === 'Coherence & Cohesion'
          ? normalized >= 0.8
            ? 'Paragraphing and comparison cues support a mostly controlled line of argument or report structure.'
            : 'The response has a workable structure, but grouping and progression still feel uneven.'
          : criterion === 'Lexical Resource'
            ? normalized >= 0.8
              ? 'Vocabulary is specific enough to describe the task without sounding repetitive or generic.'
              : 'Vocabulary is serviceable, but more precision is needed to raise the lexical ceiling.'
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
  return getCriteriaForTaskType(prompt.taskType).map((criterion) => scoreCriterion(criterion, evidence, prompt));
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
