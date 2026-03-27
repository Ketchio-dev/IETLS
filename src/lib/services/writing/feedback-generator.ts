import type {
  AssessmentWarning,
  BandRange,
  CriterionScore,
  EvidenceSignal,
  FeedbackAction,
  WritingTaskType,
} from '@/lib/domain';

export function generateFeedbackActions(scores: CriterionScore[], evidence: EvidenceSignal[]): FeedbackAction[] {
  const weakest = [...scores].sort((a, b) => a.band - b.band).slice(0, 3);

  return weakest.map((score, index) => ({
    title: `${index + 1}. Improve ${score.criterion}`,
    criterion: score.criterion,
    description:
      score.criterion === 'Task Response'
        ? 'Add one more fully developed idea with a cause, consequence, and stakeholder impact.'
        : score.criterion === 'Task Achievement'
          ? 'Strengthen the overview and group the most important features before listing detail data.'
          : score.criterion === 'Coherence & Cohesion'
            ? 'Rewrite topic sentences so each paragraph makes one clear argumentative move.'
            : score.criterion === 'Lexical Resource'
              ? 'Replace repeated general words with prompt-specific policy or infrastructure vocabulary.'
              : 'Reserve 3 minutes to proofread articles, agreement, and punctuation after drafting.',
    impact: evidence.some((item) => item.criterion === score.criterion && item.strength === 'weak') ? 'high' : 'medium',
  }));
}

export function summarizeStrengths(evidence: EvidenceSignal[]) {
  return evidence.filter((item) => item.strength === 'strong').slice(0, 3).map((item) => item.detail);
}

export function summarizeRisks(evidence: EvidenceSignal[]) {
  return evidence.filter((item) => item.strength !== 'strong').slice(0, 4).map((item) => item.detail);
}

export function buildSummary(taskType: WritingTaskType, overallBandRange: BandRange, wordCount: number) {
  const minWords = taskType === 'task-1' ? 150 : 250;
  const taskLabel = taskType === 'task-1' ? 'Task 1' : 'Task 2';

  if (wordCount < minWords) {
    return `The draft shows promise, but it is under-developed for a stable ${taskLabel} estimate. Add depth before trusting the current score range.`;
  }

  if (overallBandRange.lower >= 7) {
    return `This draft looks competitive for a Band ${overallBandRange.lower.toFixed(1)}-${overallBandRange.upper.toFixed(1)} practice range, with the main gains now coming from refinement rather than basic coverage.`;
  }

  return `This draft is workable for a Band ${overallBandRange.lower.toFixed(1)}-${overallBandRange.upper.toFixed(1)} practice range, but the biggest gains still come from clearer support, tighter organization, and more precise language.`;
}

export function buildWarnings(
  taskType: WritingTaskType,
  wordCount: number,
  confidence: CriterionScore['confidence'],
): AssessmentWarning[] {
  const minWords = taskType === 'task-1' ? 150 : 250;
  const taskLabel = taskType === 'task-1' ? 'Task 1' : 'Task 2';
  const warnings: AssessmentWarning[] = [
    {
      code: 'practice-estimate',
      message: 'This is an AI-assisted practice estimate and should not be treated as an official IELTS score.',
    },
  ];

  if (wordCount < minWords) {
    warnings.push({
      code: 'under-length',
      message: `The response is below the usual ${taskLabel} target length, which limits scoring confidence.`,
    });
  }

  if (confidence === 'low') {
    warnings.push({
      code: 'low-confidence',
      message: 'The scoring signals are mixed, so review the full score range and evidence before trusting the estimate too strongly.',
    });
  }

  return warnings;
}
