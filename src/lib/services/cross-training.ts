import type { ReadingDashboardSummary } from '@/lib/services/reading/types';
import type { WritingDashboardSummary } from '@/lib/domain';

export function getWritingToReadingCrossTraining(summary: WritingDashboardSummary) {
  const weakestCriterion = summary.weakestCriterion?.criterion;

  switch (weakestCriterion) {
    case 'Task Response':
      return {
        title: 'Switch to Reading for a quick argument reset',
        description:
          'Use one Reading set to practise choosing the main claim and matching each option to evidence before you draft again.',
      };
    case 'Task Achievement':
      return {
        title: 'Switch to Reading for a structure reset',
        description:
          'Use one Reading set to group key details fast, then come back to Task 1 with a clearer overview-first mindset.',
      };
    case 'Coherence & Cohesion':
      return {
        title: 'Switch to Reading for a paragraph-flow reset',
        description:
          'Use one Reading set to trace paragraph purpose and evidence order before you rewrite your next draft.',
      };
    case 'Lexical Resource':
      return {
        title: 'Switch to Reading for a paraphrase reset',
        description:
          'Use one Reading set to train paraphrase recognition and topic vocabulary before you try the next prompt.',
      };
    case 'Grammatical Range & Accuracy':
      return {
        title: 'Switch to Reading for an accuracy reset',
        description:
          'Use one Reading set to focus on exact wording, sentence endings, and controlled grammar before you re-score the next draft.',
      };
    default:
      return {
        title: 'Switch to Reading for a quick accuracy reset',
        description:
          'Use one Reading set to reset your focus on evidence, wording, and timing before you return to Writing.',
      };
  }
}

export function getReadingToWritingCrossTraining(summary: ReadingDashboardSummary) {
  const weakestType = summary.weakestType?.type;

  switch (weakestType) {
    case 'multiple_choice':
      return {
        title: 'Switch to Writing for a position-control reset',
        description:
          'Write one clear body paragraph in Writing after weighing competing ideas, so the next Reading set feels less fuzzy.',
      };
    case 'true_false_not_given':
      return {
        title: 'Switch to Writing for a precision reset',
        description:
          'Write one short paragraph with careful qualifiers and exact claims before you return to Reading.',
      };
    case 'sentence_completion':
      return {
        title: 'Switch to Writing for an exact-wording reset',
        description:
          'Draft one concise paragraph and proofread articles, agreement, and exact word choice before the next Reading set.',
      };
    default:
      return {
        title: 'Switch to Writing for a control reset',
        description:
          'Write one timed paragraph so you can practise turning evidence into a controlled argument before the next Reading set.',
      };
  }
}
