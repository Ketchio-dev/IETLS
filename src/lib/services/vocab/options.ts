import type { VocabWord } from './types';

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

/**
 * The four multiple-choice options for a card (correct definition + distractors)
 * in a stable, per-word order so the correct answer is not always in the same
 * slot — without randomness, keeping SSR and tests deterministic.
 */
export function buildVocabOptions(word: VocabWord): string[] {
  return [word.definition, ...word.distractors]
    .map((text) => ({ text, rank: hashString(`${word.id}:${text}`) }))
    .sort((left, right) => left.rank - right.rank || left.text.localeCompare(right.text))
    .map((entry) => entry.text);
}

export function normalizeDefinition(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.;,]+$/, '');
}

export function isVocabAnswerCorrect(word: VocabWord, answer: string): boolean {
  const normalized = normalizeDefinition(answer);
  return normalized.length > 0 && normalized === normalizeDefinition(word.definition);
}
