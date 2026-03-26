import type { AssessmentReport, CriterionScore, EssaySubmission, EvidenceSignal, FeedbackAction } from '@/lib/domain';

const clampBand = (value: number) => Math.max(4, Math.min(8.5, Math.round(value * 2) / 2));

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function extractWritingEvidence(response: string): EvidenceSignal[] {
  const words = countWords(response);
  const hasOpinion = /\b(I believe|I think|In my opinion|personally)\b/i.test(response);
  const hasBothSides = /\b(on the one hand|however|while|whereas|although)\b/i.test(response);
  const complexSentences = (response.match(/,|;| which | that | although | because /gi) ?? []).length;

  return [
    {
      name: 'Task coverage',
      strength: words >= 240 && hasBothSides ? 'strong' : words >= 210 ? 'developing' : 'weak',
      detail: `Approx. ${words} words with ${hasBothSides ? 'clear' : 'limited'} dual-view coverage cues.`,
    },
    {
      name: 'Position clarity',
      strength: hasOpinion ? 'strong' : 'developing',
      detail: hasOpinion ? 'Opinion language is explicit.' : 'Position is implied rather than clearly signposted.',
    },
    {
      name: 'Sentence variety',
      strength: complexSentences >= 6 ? 'strong' : complexSentences >= 3 ? 'developing' : 'weak',
      detail: `Detected ${complexSentences} signals of clause variety or punctuation complexity.`,
    },
  ];
}

export function predictCriterionScores(response: string): CriterionScore[] {
  const words = countWords(response);
  const paragraphs = response.split(/\n\s*\n/).filter(Boolean).length;
  const evidence = extractWritingEvidence(response);
  const strongSignals = evidence.filter((item) => item.strength === 'strong').length;

  return [
    {
      criterion: 'Task Response',
      band: clampBand(5.5 + strongSignals * 0.5 + (words >= 250 ? 0.5 : 0)),
      rationale: words >= 250 ? 'Response is developed enough to cover the task with relevant support.' : 'Ideas show promise but need fuller development to fully meet Task 2 expectations.',
    },
    {
      criterion: 'Coherence & Cohesion',
      band: clampBand(5.5 + Math.min(paragraphs, 4) * 0.25),
      rationale: paragraphs >= 4 ? 'Paragraph structure supports progression across the argument.' : 'Add clearer paragraph separation to improve logical flow.',
    },
    {
      criterion: 'Lexical Resource',
      band: clampBand(5.5 + (/(infrastructure|congestion|investment|commuter|subsid)/i.test(response) ? 1 : 0.5)),
      rationale: 'Topic-specific vocabulary is the clearest proxy in this MVP scaffold.',
    },
    {
      criterion: 'Grammatical Range & Accuracy',
      band: clampBand(5 + (response.match(/[.;,]/g) ?? []).length / 12),
      rationale: 'Sentence control is estimated from punctuation and clause variety until a richer parser lands.',
    },
  ];
}

export function generateFeedbackActions(scores: CriterionScore[], evidence: EvidenceSignal[]): FeedbackAction[] {
  const weakest = [...scores].sort((a, b) => a.band - b.band).slice(0, 2);

  return weakest.map((score, index) => ({
    title: `${index + 1}. Raise ${score.criterion}`,
    description: score.criterion === 'Task Response'
      ? 'Add one more fully developed example and connect it directly to your opinion.'
      : score.criterion === 'Coherence & Cohesion'
        ? 'Use clearer topic sentences and vary transitions between paragraphs.'
        : score.criterion === 'Lexical Resource'
          ? 'Swap repeated general words for more precise academic vocabulary tied to the topic.'
          : 'Proofread for article, agreement, and punctuation slips after drafting.',
    impact: evidence.some((item) => item.strength === 'weak') ? 'high' : 'medium',
  }));
}

export function buildMockAssessmentReport(submission: EssaySubmission): AssessmentReport {
  const evidence = extractWritingEvidence(submission.response);
  const criterionScores = predictCriterionScores(submission.response);
  const overallBand = clampBand(
    criterionScores.reduce((sum, item) => sum + item.band, 0) / criterionScores.length,
  );
  const estimatedWordCount = countWords(submission.response);
  const nextSteps = generateFeedbackActions(criterionScores, evidence);

  return {
    essayId: `essay-${submission.promptId}`,
    promptId: submission.promptId,
    overallBand,
    confidence: estimatedWordCount >= 240 ? 'medium' : 'low',
    summary:
      overallBand >= 7
        ? 'A strong draft with clear control, though a few improvements could push it higher.'
        : 'A promising draft that covers the task, with the biggest gains available in depth, cohesion, and editing discipline.',
    estimatedWordCount,
    criterionScores,
    evidence,
    strengths: evidence.filter((item) => item.strength === 'strong').map((item) => item.detail),
    risks: evidence.filter((item) => item.strength !== 'strong').map((item) => item.detail),
    nextSteps,
    generatedAt: new Date().toISOString(),
  };
}
