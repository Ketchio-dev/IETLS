import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3-flash';
const OPENROUTER_TIMEOUT_MS = 15_000;
const DEFAULT_OUTPUT_DIR = process.env.IELTS_PRIVATE_READING_IMPORTS_DIR ?? path.join('data', 'private-reading-imports');
const OUTPUT_FILE_PREFIX = 'ai-generated';
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const ALLOWED_QUESTION_TYPES = new Set([
  'multiple_choice',
  'true_false_not_given',
  'sentence_completion',
]);

const readingSetResponseSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'AiGeneratedReadingImportSet',
  type: 'object',
  additionalProperties: false,
  required: ['title', 'sourceLabel', 'notes', 'passage', 'questions'],
  properties: {
    title: { type: 'string', minLength: 10, maxLength: 180 },
    sourceLabel: { type: 'string', minLength: 3, maxLength: 120 },
    notes: { type: 'string', minLength: 10, maxLength: 400 },
    passage: { type: 'string', minLength: 2_500, maxLength: 7_500 },
    questions: {
      type: 'array',
      minItems: 10,
      maxItems: 14,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'prompt', 'options', 'answer', 'acceptedVariants', 'explanation', 'evidenceHint'],
        properties: {
          type: {
            type: 'string',
            enum: [...ALLOWED_QUESTION_TYPES],
          },
          prompt: { type: 'string', minLength: 8, maxLength: 280 },
          options: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 200 },
            maxItems: 6,
          },
          answer: { type: 'string', minLength: 1, maxLength: 120 },
          acceptedVariants: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 120 },
            maxItems: 6,
          },
          explanation: { type: 'string', minLength: 10, maxLength: 400 },
          evidenceHint: { type: 'string', minLength: 3, maxLength: 80 },
        },
      },
    },
  },
};

function printUsage() {
  console.error(
    [
      'Usage:',
      "  node scripts/generate-reading-ai.mjs --topic 'climate change' --difficulty 'medium' --count 2",
    ].join('\n'),
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'reading-topic';
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function uniqueTrimmedStrings(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean),
  )];
}

function extractJsonPayload(rawContent) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  return trimmed;
}

function getAssistantMessageContent(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const text = value
    .map((item) => {
      if (!isRecord(item)) {
        return '';
      }

      if (item.type === 'text' && typeof item.text === 'string') {
        return item.text;
      }

      return '';
    })
    .join('')
    .trim();

  return text || null;
}

function parseArgs(argv) {
  const parsed = {
    topic: '',
    difficulty: 'medium',
    count: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--topic' || token === '--difficulty' || token === '--count') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${token}.`);
      }

      if (token === '--topic') {
        parsed.topic = value.trim();
      } else if (token === '--difficulty') {
        parsed.difficulty = value.trim().toLowerCase();
      } else {
        const count = Number.parseInt(value, 10);
        if (!Number.isInteger(count) || count < 1 || count > 10) {
          throw new Error('--count must be an integer between 1 and 10.');
        }
        parsed.count = count;
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!parsed.topic) {
    throw new Error('--topic is required.');
  }

  if (!ALLOWED_DIFFICULTIES.has(parsed.difficulty)) {
    throw new Error(`--difficulty must be one of: ${[...ALLOWED_DIFFICULTIES].join(', ')}`);
  }

  return parsed;
}

function getOpenRouterConfig() {
  const timeoutMs = Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '', 10);

  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL,
    model: process.env.IELTS_SCORER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    referer: process.env.OPENROUTER_HTTP_REFERER?.trim() || null,
    title: process.env.OPENROUTER_APP_TITLE?.trim() || null,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : OPENROUTER_TIMEOUT_MS,
  };
}

function buildSystemPrompt() {
  return 'You generate IELTS Academic Reading practice material. Return strict JSON only. Do not include markdown, commentary, or code fences.';
}

function buildUserPrompt({ topic, difficulty, passageIndex, count, previousError }) {
  const retryBlock = previousError
    ? [
        'Your previous response failed validation.',
        `Validation error: ${previousError}`,
        'Return a corrected payload that satisfies every requirement exactly.',
      ].join('\n')
    : '';

  return [
    'Create one IELTS Academic Reading import set for local use.',
    `Topic: ${topic}`,
    `Difficulty: ${difficulty}`,
    `Passage number: ${passageIndex} of ${count}`,
    'Use a distinct academic sub-angle for this passage so multiple generations on the same topic do not feel repetitive.',
    'Passage requirements:',
    '- 600 to 900 words.',
    '- Formal, academic, information-dense tone.',
    '- Clear paragraph structure.',
    '- No copyrighted source text, quotations, or references to real exam books.',
    'Question requirements:',
    '- Include 10 to 14 total questions.',
    '- Include a mix of these exact question types: multiple_choice, true_false_not_given, sentence_completion.',
    '- Use all three question types at least twice each.',
    '- For multiple_choice, provide exactly 4 options labeled A. to D. and set answer to the correct letter only.',
    '- For true_false_not_given, provide options exactly [\"TRUE\", \"FALSE\", \"NOT GIVEN\"].',
    '- For sentence_completion, use an empty options array and keep answers short and extractable from the passage.',
    '- Each question needs a concise explanation and an evidenceHint like \"Paragraph 3\" or \"Paragraphs 2-3\".',
    'Formatting requirements:',
    '- Return one JSON object that matches the provided schema.',
    '- Keep sourceLabel factual and local-use oriented.',
    '- Keep notes brief.',
    retryBlock,
  ].filter(Boolean).join('\n');
}

function normalizeQuestion(question, index, setId) {
  if (!isRecord(question)) {
    throw new Error(`Question ${index + 1} must be an object.`);
  }

  const type = typeof question.type === 'string' ? question.type.trim() : '';
  const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : '';
  const answer = typeof question.answer === 'string' ? question.answer.trim() : '';
  const explanation = typeof question.explanation === 'string' ? question.explanation.trim() : '';
  const evidenceHint = typeof question.evidenceHint === 'string' ? question.evidenceHint.trim() : '';
  const acceptedVariants = uniqueTrimmedStrings(question.acceptedVariants);
  const options = uniqueTrimmedStrings(question.options);

  if (!ALLOWED_QUESTION_TYPES.has(type)) {
    throw new Error(`Question ${index + 1} has unsupported type "${type}".`);
  }

  if (!prompt) {
    throw new Error(`Question ${index + 1} is missing a prompt.`);
  }

  if (!answer) {
    throw new Error(`Question ${index + 1} is missing an answer.`);
  }

  if (!explanation) {
    throw new Error(`Question ${index + 1} is missing an explanation.`);
  }

  if (!evidenceHint) {
    throw new Error(`Question ${index + 1} is missing an evidenceHint.`);
  }

  if (type === 'multiple_choice') {
    if (options.length !== 4) {
      throw new Error(`Question ${index + 1} must provide exactly 4 options for multiple_choice.`);
    }

    if (!['A', 'B', 'C', 'D'].includes(answer.toUpperCase())) {
      throw new Error(`Question ${index + 1} multiple_choice answer must be one of A, B, C, or D.`);
    }
  }

  if (type === 'true_false_not_given') {
    const normalizedOptions = options.map((option) => option.toUpperCase());
    const expectedOptions = ['TRUE', 'FALSE', 'NOT GIVEN'];

    if (
      normalizedOptions.length !== expectedOptions.length
      || normalizedOptions.some((option, optionIndex) => option !== expectedOptions[optionIndex])
    ) {
      throw new Error(`Question ${index + 1} true_false_not_given options must be TRUE, FALSE, NOT GIVEN.`);
    }

    if (!expectedOptions.includes(answer.toUpperCase())) {
      throw new Error(`Question ${index + 1} true_false_not_given answer must be TRUE, FALSE, or NOT GIVEN.`);
    }
  }

  if (type === 'sentence_completion' && options.length !== 0) {
    throw new Error(`Question ${index + 1} sentence_completion must not include options.`);
  }

  const uppercaseAnswer = answer.toUpperCase().trim();
  const normalizedAnswer = type === 'multiple_choice'
    ? uppercaseAnswer
    : uppercaseAnswer === 'NOT GIVEN'
      ? 'NOT GIVEN'
      : (['TRUE', 'FALSE'].includes(uppercaseAnswer) ? uppercaseAnswer : answer);

  return {
    id: `${setId}-q${index + 1}`,
    type,
    prompt,
    options,
    answer: normalizedAnswer,
    acceptedVariants,
    explanation,
    evidenceHint,
  };
}

function normalizeReadingSet(candidate, context) {
  if (!isRecord(candidate)) {
    throw new Error(`Passage ${context.passageIndex}: provider output must be an object.`);
  }

  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const sourceLabel = typeof candidate.sourceLabel === 'string' ? candidate.sourceLabel.trim() : '';
  const notes = typeof candidate.notes === 'string' ? candidate.notes.trim() : '';
  const passage = typeof candidate.passage === 'string' ? candidate.passage.trim() : '';

  if (!title) {
    throw new Error(`Passage ${context.passageIndex}: title is required.`);
  }

  if (!passage) {
    throw new Error(`Passage ${context.passageIndex}: passage is required.`);
  }

  const passageWordCount = countWords(passage);
  if (passageWordCount < 600 || passageWordCount > 900) {
    throw new Error(`Passage ${context.passageIndex}: passage word count must be 600-900, got ${passageWordCount}.`);
  }

  if (!Array.isArray(candidate.questions) || candidate.questions.length < 10 || candidate.questions.length > 14) {
    throw new Error(`Passage ${context.passageIndex}: questions must contain 10-14 items.`);
  }

  const setId = `${slugify(context.topic)}-${slugify(title)}`;
  const questions = candidate.questions.map((question, index) => normalizeQuestion(question, index, setId));
  const typeCounts = questions.reduce((counts, question) => {
    counts[question.type] = (counts[question.type] ?? 0) + 1;
    return counts;
  }, {});

  for (const requiredType of ALLOWED_QUESTION_TYPES) {
    if ((typeCounts[requiredType] ?? 0) < 2) {
      throw new Error(`Passage ${context.passageIndex}: include at least two ${requiredType} questions.`);
    }
  }

  return {
    title,
    sourceLabel: sourceLabel || `AI generated reading set (${context.difficulty})`,
    notes: notes || `Generated from topic "${context.topic}" with model ${context.model}.`,
    passage,
    questions,
  };
}

async function requestReadingSetFromOpenRouter(config, requestContext, previousError = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (config.referer) {
      headers['HTTP-Referer'] = config.referer;
    }

    if (config.title) {
      headers['X-Title'] = config.title;
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        max_tokens: 4_000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ai_generated_reading_import_set',
            strict: true,
            schema: readingSetResponseSchema,
          },
        },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: buildUserPrompt({
              ...requestContext,
              previousError,
            }),
          },
        ],
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
        ? body.error.message
        : `HTTP ${response.status}`;
      throw new Error(`OpenRouter request failed: ${message}`);
    }

    const choice = isRecord(body) && Array.isArray(body.choices) ? body.choices[0] : null;
    const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;
    const content = getAssistantMessageContent(message?.content);

    if (!content) {
      throw new Error('OpenRouter response did not include a JSON message payload.');
    }

    const parsed = JSON.parse(extractJsonPayload(content));
    return normalizeReadingSet(parsed, {
      ...requestContext,
      model: typeof body?.model === 'string' && body.model.trim() ? body.model.trim() : config.model,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateReadingSet(config, requestContext) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await requestReadingSetFromOpenRouter(config, requestContext, lastError);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt === 2) {
        throw new Error(`Unable to generate passage ${requestContext.passageIndex}: ${lastError}`);
      }
    }
  }

  throw new Error(`Unable to generate passage ${requestContext.passageIndex}.`);
}

async function writeOutputFile(outputPath, payload) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = getOpenRouterConfig();

  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY is required.');
  }

  const topicSlug = slugify(args.topic);
  const outputPath = path.join(DEFAULT_OUTPUT_DIR, `${OUTPUT_FILE_PREFIX}-${topicSlug}.json`);
  const sets = [];

  for (let passageIndex = 1; passageIndex <= args.count; passageIndex += 1) {
    console.error(`Generating passage ${passageIndex}/${args.count} for topic "${args.topic}"...`);
    const set = await generateReadingSet(config, {
      topic: args.topic,
      difficulty: args.difficulty,
      passageIndex,
      count: args.count,
    });
    sets.push(set);
  }

  const payload = {
    sets,
  };

  await writeOutputFile(outputPath, payload);

  console.log(JSON.stringify({
    ok: true,
    outputPath,
    topic: args.topic,
    difficulty: args.difficulty,
    count: sets.length,
    importCommand: 'npm run reading:import-private',
  }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.startsWith('--')
    || message.startsWith('Unknown argument:')
    || message.startsWith('Missing value for')
  ) {
    printUsage();
  }

  console.error(message);
  process.exitCode = 1;
});
