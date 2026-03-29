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
    return `Below the minimum for ${taskLabel}. The score is unreliable until the response is expanded.`;
  }

  if (overallBandRange.lower >= 7) {
    return `This draft looks competitive for a Band ${overallBandRange.lower.toFixed(1)}-${overallBandRange.upper.toFixed(1)} practice range. The next gains should come from refinement, not from rewriting the whole response.`;
  }

  return `Current practice range: Band ${overallBandRange.lower.toFixed(1)}-${overallBandRange.upper.toFixed(1)}. Improve support, organisation, and wording precision before you re-score.`;
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
      message: 'AI-assisted practice estimate. Do not treat it as an official IELTS score.',
    },
    {
      code: 'single-task-scope',
      message:
        taskType === 'task-1'
          ? 'This estimate covers only Task 1. Official IELTS Writing combines Task 1 and Task 2, and Task 2 carries more weight.'
          : 'This estimate covers only Task 2. Official IELTS Writing combines Task 1 and Task 2, even though Task 2 carries more weight.',
    },
  ];

  if (wordCount < minWords) {
    warnings.push({
      code: 'under-length',
      message: `Below the minimum for ${taskLabel}. Score reliability improves only after the response is expanded.`,
    });
  }

  if (confidence === 'low') {
    warnings.push({
      code: 'low-confidence',
      message:
        'The scorer found conflicting signals in this draft. Fix the top revision target, re-score once, and compare this draft only after the signal tightens.',
    });
  }

  return warnings;
}
