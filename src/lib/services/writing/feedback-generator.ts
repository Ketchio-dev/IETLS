import type {
  AssessmentReport,
  AssessmentWarning,
  BandRange,
  CriterionName,
  CriterionScore,
  EvidenceSignal,
  FeedbackAction,
  WritingTaskType,
} from '@/lib/domain';

export interface CriterionCoachingPlan {
  criterion: CriterionName;
  currentBand: number;
  targetBand: number;
  focusSummary: string;
  whyItMatters: string;
  fixNow: string;
  checkBeforeRescore: string;
  checklist: string[];
}

function toNextBandTarget(band: number) {
  return Math.min(9, Math.round((band + 0.5) * 2) / 2);
}

function buildActionDescription(taskType: WritingTaskType, criterion: CriterionName) {
  switch (criterion) {
    case 'Task Response':
      return 'Add one more fully developed idea with a cause, consequence, and stakeholder impact.';
    case 'Task Achievement':
      return taskType === 'task-1'
        ? 'Strengthen the overview and group the most important features before listing detail data.'
        : 'Make the response cover every part of the task before you add more supporting detail.';
    case 'Coherence & Cohesion':
      return 'Rewrite topic sentences so each paragraph makes one clear argumentative move.';
    case 'Lexical Resource':
      return 'Replace repeated general words with prompt-specific policy or infrastructure vocabulary.';
    case 'Grammatical Range & Accuracy':
    default:
      return 'Reserve 3 minutes to proofread articles, agreement, and punctuation after drafting.';
  }
}

function buildActionTitle(score: CriterionScore) {
  return `Raise ${score.criterion} toward Band ${toNextBandTarget(score.band).toFixed(1)}`;
}

export function generateFeedbackActions(scores: CriterionScore[], evidence: EvidenceSignal[]): FeedbackAction[] {
  const weakest = [...scores].sort((a, b) => a.band - b.band).slice(0, 3);

  return weakest.map((score, index) => ({
    title: `${index + 1}. ${buildActionTitle(score)}`,
    criterion: score.criterion,
    description: buildActionDescription(
      score.criterion === 'Task Achievement' ? 'task-1' : 'task-2',
      score.criterion,
    ),
    impact: evidence.some((item) => item.criterion === score.criterion && item.strength === 'weak') ? 'high' : 'medium',
  }));
}

export function buildCriterionCoachingPlan(
  taskType: WritingTaskType,
  score: CriterionScore,
  primaryAction?: FeedbackAction | null,
): CriterionCoachingPlan {
  const targetBand = toNextBandTarget(score.band);
  const redoThisFirst = primaryAction?.description ?? buildActionDescription(taskType, score.criterion);

  switch (score.criterion) {
    case 'Task Response':
      return {
        criterion: score.criterion,
        currentBand: score.band,
        targetBand,
        focusSummary: `Raise ${score.criterion} toward Band ${targetBand.toFixed(1)} by making the position explicit, fully developing each main idea, and tying every example back to the question.`,
        whyItMatters: 'This criterion often sets the ceiling when the essay answers the topic only partially or leaves its support underdeveloped.',
        fixNow: redoThisFirst,
        checkBeforeRescore: 'Check that each body paragraph ends by linking the example back to the exact question.',
        checklist: [
          'State one clear position in the introduction and keep it stable.',
          redoThisFirst,
          'Finish each body paragraph by linking the example back to the exact question.',
        ],
      };
    case 'Task Achievement':
      return {
        criterion: score.criterion,
        currentBand: score.band,
        targetBand,
        focusSummary: `Raise ${score.criterion} toward Band ${targetBand.toFixed(1)} by leading with a clear overview and selecting only the comparisons that matter most.`,
        whyItMatters: 'Task 1 scores rise when the overview frames the key trends first and the detail paragraphs support it instead of listing everything equally.',
        fixNow: redoThisFirst,
        checkBeforeRescore: 'Check that the overview appears before the detail paragraphs and covers the biggest trends only.',
        checklist: [
          'Write the overview before the detail paragraphs.',
          redoThisFirst,
          'Group similar changes together instead of describing each data point separately.',
        ],
      };
    case 'Coherence & Cohesion':
      return {
        criterion: score.criterion,
        currentBand: score.band,
        targetBand,
        focusSummary: `Raise ${score.criterion} toward Band ${targetBand.toFixed(1)} by giving each paragraph one job, sharpening topic sentences, and using linking words only where they clarify logic.`,
        whyItMatters: 'This criterion improves when the reader can follow the argument or report structure without guessing why each paragraph is there.',
        fixNow: redoThisFirst,
        checkBeforeRescore: 'Check that each paragraph starts with one clear argumentative move or one clear report purpose.',
        checklist: [
          'Give every paragraph one clear purpose before you rewrite sentences.',
          redoThisFirst,
          'Cut any connector that does not change the logical meaning of the sentence.',
        ],
      };
    case 'Lexical Resource':
      return {
        criterion: score.criterion,
        currentBand: score.band,
        targetBand,
        focusSummary: `Raise ${score.criterion} toward Band ${targetBand.toFixed(1)} by reducing repetition and choosing more exact prompt-specific wording.`,
        whyItMatters: 'The band moves when your word choice becomes more precise, natural, and flexible without sounding memorised.',
        fixNow: redoThisFirst,
        checkBeforeRescore: 'Check that the repeated general words have been replaced with more exact prompt-specific nouns or verbs.',
        checklist: [
          'Underline repeated high-frequency words and replace only the most obvious repeats.',
          redoThisFirst,
          'Prefer exact nouns and verbs from the topic over broad words like “good”, “bad”, or “things”.',
        ],
      };
    case 'Grammatical Range & Accuracy':
    default:
      return {
        criterion: score.criterion,
        currentBand: score.band,
        targetBand,
        focusSummary: `Raise ${score.criterion} toward Band ${targetBand.toFixed(1)} by keeping sentence control stable first, then adding variety where it stays accurate.`,
        whyItMatters: 'Grammar bands usually stall when small errors cluster across agreement, articles, punctuation, or sentence boundaries.',
        fixNow: redoThisFirst,
        checkBeforeRescore: 'Check only for articles, agreement, and punctuation before you submit again.',
        checklist: [
          'Keep one sentence pattern simple and correct before you vary it.',
          redoThisFirst,
          'Proofread only for articles, agreement, and punctuation in the final 3 minutes.',
        ],
      };
  }
}

export function buildReportCriterionCoachingPlan(
  report: Pick<AssessmentReport, 'taskType' | 'criterionScores' | 'nextSteps'>,
  preferredCriterion?: CriterionName | null,
): CriterionCoachingPlan | null {
  const preferredScore = preferredCriterion
    ? report.criterionScores.find((item) => item.criterion === preferredCriterion) ?? null
    : null;
  const weakestScore = [...report.criterionScores].sort((a, b) => a.band - b.band)[0] ?? null;
  const score = preferredScore ?? weakestScore;

  if (!score) {
    return null;
  }

  const primaryAction =
    report.nextSteps.find((step) => step.criterion === score.criterion) ??
    report.nextSteps[0] ??
    null;

  return buildCriterionCoachingPlan(report.taskType, score, primaryAction);
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
