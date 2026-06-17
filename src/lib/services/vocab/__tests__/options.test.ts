import { describe, expect, it } from 'vitest';

import { buildVocabOptions, isVocabAnswerCorrect, normalizeDefinition } from '../options';
import type { VocabWord } from '../types';

const WORD: VocabWord = {
  id: 'test-word',
  word: 'mitigate',
  partOfSpeech: 'verb',
  definition: 'to make something less severe',
  example: 'example',
  distractors: ['to prove a claim false', 'to copy exactly', 'to delay a decision'],
};

describe('vocab options', () => {
  it('builds four options containing the definition and every distractor', () => {
    const options = buildVocabOptions(WORD);

    expect(options).toHaveLength(4);
    expect(new Set(options)).toEqual(new Set([WORD.definition, ...WORD.distractors]));
  });

  it('orders options deterministically', () => {
    expect(buildVocabOptions(WORD)).toEqual(buildVocabOptions(WORD));
  });

  it('grades the correct definition regardless of case and trailing punctuation', () => {
    expect(isVocabAnswerCorrect(WORD, '  To Make Something Less Severe. ')).toBe(true);
  });

  it('rejects a distractor and a blank answer', () => {
    expect(isVocabAnswerCorrect(WORD, 'to copy exactly')).toBe(false);
    expect(isVocabAnswerCorrect(WORD, '   ')).toBe(false);
  });

  it('normalizes whitespace, case, and trailing punctuation', () => {
    expect(normalizeDefinition('  Hello   World. ')).toBe('hello world');
  });
});
