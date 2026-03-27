import type { ImportedReadingQuestion } from '@/lib/services/reading-imports/types';

const NUMBER_WORDS = new Map<string, number>([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
]);

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function toSearchText(value: string) {
  return collapseWhitespace(value).toLowerCase();
}

function canonicalizeFreeText(value: string) {
  return collapseWhitespace(
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[-‐‑‒–—―/]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' '),
  );
}

function normalizeOptionLabel(value: string) {
  const normalized = collapseWhitespace(value).toUpperCase();
  const match = normalized.match(/^([A-H])(?:[.)\]:-])?$/);
  return match?.[1] ?? null;
}

function extractOptionLabel(value: string) {
  const normalized = collapseWhitespace(value).toUpperCase();
  const match = normalized.match(/^([A-H])(?:[.)\]:-])?\s+/);
  return match?.[1] ?? null;
}

function stripOptionLabel(value: string) {
  return collapseWhitespace(value).replace(/^(?:[A-H][.)\]:-]\s*|[A-H]\s+)/i, '');
}

function normalizeMultipleChoiceValue(value: string, options: string[]) {
  const directLabel = normalizeOptionLabel(value);
  if (directLabel) {
    return directLabel;
  }

  const normalizedValue = canonicalizeFreeText(stripOptionLabel(value));
  if (!normalizedValue) {
    return '';
  }

  for (const option of options) {
    const optionLabel = extractOptionLabel(option) ?? normalizeOptionLabel(option);
    if (!optionLabel) {
      continue;
    }

    if (canonicalizeFreeText(stripOptionLabel(option)) === normalizedValue) {
      return optionLabel;
    }
  }

  return normalizedValue;
}

function normalizeBooleanStyleValue(value: string) {
  const normalized = toSearchText(value).replace(/[.\-_/]/g, ' ').replace(/\s+/g, ' ');

  if (normalized === 't' || normalized === 'true') {
    return 'TRUE';
  }

  if (normalized === 'f' || normalized === 'false') {
    return 'FALSE';
  }

  if (
    normalized === 'ng' ||
    normalized === 'n g' ||
    normalized === 'not given' ||
    normalized === 'notgiven'
  ) {
    return 'NOT GIVEN';
  }

  if (normalized === 'y' || normalized === 'yes') {
    return 'YES';
  }

  if (normalized === 'n' || normalized === 'no') {
    return 'NO';
  }

  return normalized.toUpperCase();
}

function extractWordLimit(prompt: string) {
  const normalizedPrompt = toSearchText(prompt);
  const numericMatch = normalizedPrompt.match(/(?:no more than|up to|maximum of)\s+(\d+)\s+words?/);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  const wordOnlyMatch = normalizedPrompt.match(/(\w+)\s+word(?:s)?\s+only/);
  if (wordOnlyMatch) {
    return NUMBER_WORDS.get(wordOnlyMatch[1]) ?? null;
  }

  const noMoreThanWordMatch = normalizedPrompt.match(/no more than\s+(\w+)\s+words?/);
  if (noMoreThanWordMatch) {
    return NUMBER_WORDS.get(noMoreThanWordMatch[1]) ?? null;
  }

  return null;
}

function exceedsWordLimit(value: string, prompt: string) {
  const wordLimit = extractWordLimit(prompt);
  if (!wordLimit) {
    return false;
  }

  const wordCount = canonicalizeFreeText(value).split(' ').filter(Boolean).length;
  return wordCount > wordLimit;
}

function normalizeSentenceCompletionValue(value: string) {
  return canonicalizeFreeText(value);
}

export function normalizeReadingAnswer(question: ImportedReadingQuestion, value: string) {
  switch (question.type) {
    case 'multiple_choice':
      return normalizeMultipleChoiceValue(value, question.options);
    case 'true_false_not_given':
    case 'yes_no_not_given':
      return normalizeBooleanStyleValue(value);
    case 'sentence_completion':
      return normalizeSentenceCompletionValue(value);
    default:
      return canonicalizeFreeText(value);
  }
}

export function isReadingAnswerCorrect(question: ImportedReadingQuestion, submittedAnswer: string) {
  const normalizedSubmitted = normalizeReadingAnswer(question, submittedAnswer);
  if (!normalizedSubmitted) {
    return false;
  }

  if (question.type === 'sentence_completion' && exceedsWordLimit(submittedAnswer, question.prompt)) {
    return false;
  }

  const accepted = [...question.acceptedAnswers, ...question.acceptedVariants]
    .map((value) => normalizeReadingAnswer(question, value))
    .filter(Boolean);

  return accepted.includes(normalizedSubmitted);
}
