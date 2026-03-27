import { describe, expect, it } from 'vitest';

import type { ImportedReadingQuestion } from '@/lib/services/reading-imports/types';

import { isReadingAnswerCorrect } from '../grading';

function createQuestion(overrides: Partial<ImportedReadingQuestion>): ImportedReadingQuestion {
  return {
    id: 'question-1',
    type: 'sentence_completion',
    prompt: 'Complete the sentence.',
    options: [],
    acceptedAnswers: ['water points'],
    acceptedVariants: [],
    explanation: 'The passage mentions shallow water points.',
    evidenceHint: 'Paragraph 2',
    ...overrides,
  };
}

describe('reading grading helpers', () => {
  it('matches multiple choice answers by normalized letter variants', () => {
    const question = createQuestion({
      type: 'multiple_choice',
      options: ['A. First option', 'B. Correct option', 'C. Third option', 'D. Fourth option'],
      acceptedAnswers: ['B'],
      acceptedVariants: ['b.'],
    });

    expect(isReadingAnswerCorrect(question, 'B')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'b.')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'A')).toBe(false);
  });

  it('matches true/false/not given aliases consistently', () => {
    const question = createQuestion({
      type: 'true_false_not_given',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      acceptedAnswers: ['NOT GIVEN'],
      acceptedVariants: ['NG'],
    });

    expect(isReadingAnswerCorrect(question, 'NOT GIVEN')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'ng')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'not-given')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'false')).toBe(false);
  });

  it('normalizes punctuation and hyphenation for sentence completion answers', () => {
    const question = createQuestion({
      type: 'sentence_completion',
      prompt: 'Bee counts rose near shallow ______ points.',
      acceptedAnswers: ['water-points'],
      acceptedVariants: [],
    });

    expect(isReadingAnswerCorrect(question, 'water points')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'Water-Points')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'water, points')).toBe(true);
  });

  it('enforces prompt word limits for sentence completion items', () => {
    const question = createQuestion({
      prompt: 'Choose NO MORE THAN TWO WORDS from the passage.',
      acceptedAnswers: ['single system'],
      acceptedVariants: ['system'],
    });

    expect(isReadingAnswerCorrect(question, 'single system')).toBe(true);
    expect(isReadingAnswerCorrect(question, 'a single system')).toBe(false);
  });
});
