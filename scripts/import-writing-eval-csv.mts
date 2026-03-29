import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const KAGGLE_SOURCE = 'kaggle-mazlumi-ielts-writing-scored-essays-dataset';
const GENERIC_SOURCE = 'writing-human-rated-csv-import';

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  const normalized = content.replace(/^\uFEFF/, '');

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '"') {
      if (inQuotes && normalized[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && normalized[index + 1] === '\n') {
        index += 1;
      }

      row.push(current);
      current = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  const headers = (rows[0] ?? []).map((header) => normalizeHeader(header));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function nonEmpty(value: string | undefined) {
  const trimmed = normalizeWhitespace(value ?? '');
  return trimmed.length > 0 ? trimmed : null;
}

function getFirstNonEmpty(row: Record<string, string>, headers: string[]) {
  for (const header of headers) {
    const value = nonEmpty(row[header]);
    if (value) {
      return value;
    }
  }

  return null;
}

function toBand(value: string | undefined) {
  const trimmed = nonEmpty(value);
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getBandFromHeaders(row: Record<string, string>, headers: string[]) {
  for (const header of headers) {
    const value = toBand(row[header]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getTaskType(row: Record<string, string>) {
  const raw = getFirstNonEmpty(row, ['tasktype', 'task', 'taskindex']);
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'task 1' || normalized === 'task-1' || normalized === 'task1') {
    return 'task-1' as const;
  }
  if (normalized === '2' || normalized === 'task 2' || normalized === 'task-2' || normalized === 'task2') {
    return 'task-2' as const;
  }

  return null;
}

function buildPromptId(taskType: 'task-1' | 'task-2', question: string) {
  const digest = createHash('sha1').update(`${taskType}:${question}`).digest('hex').slice(0, 12);
  return `kaggle-mazlumi-${taskType}-${digest}`;
}

function buildPromptTitle(taskType: 'task-1' | 'task-2', question: string) {
  const compact = question.replace(/\s+/g, ' ').trim();
  const clipped = compact.length > 64 ? `${compact.slice(0, 61)}...` : compact;
  return `${taskType === 'task-1' ? 'Kaggle Task 1' : 'Kaggle Task 2'}: ${clipped}`;
}

function inferDatasetSource(rows: Array<Record<string, string>>) {
  const headerSet = new Set(Object.keys(rows[0] ?? {}));
  return headerSet.has('tasktype') && headerSet.has('question') && headerSet.has('essay') && headerSet.has('overall')
    ? KAGGLE_SOURCE
    : GENERIC_SOURCE;
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o', default: 'data/evals/writing/kaggle-mazlumi-overall.json' },
      source: { type: 'string', short: 's' },
    },
  });

  if (!values.input) {
    throw new Error('Missing required --input <csv-path> argument.');
  }

  const csvContent = await readFile(values.input, 'utf8');
  const rows = parseCsv(csvContent);
  const datasetSource = values.source ?? inferDatasetSource(rows);

  const essays = rows.map((row, index) => {
    const taskType = getTaskType(row);
    if (!taskType) {
      throw new Error(`Row ${index + 2} has unsupported task type.`);
    }

    const question = getFirstNonEmpty(row, ['question', 'prompt', 'prompttext', 'taskprompt']);
    const essay = getFirstNonEmpty(row, ['essay', 'response', 'essaytext', 'responsetext', 'candidateanswer', 'answer']);
    const overallBand = getBandFromHeaders(row, ['overall', 'overallband', 'band', 'overallscore', 'score']);
    if (!question || !essay || overallBand === null) {
      throw new Error(`Row ${index + 2} is missing Question, Essay, or Overall.`);
    }

    const criterionScores = Object.fromEntries(
      [
        [
          ['taskresponse', 'taskachievement', 'tr', 'ta'],
          taskType === 'task-2' ? 'Task Response' : 'Task Achievement',
        ],
        [
          ['coherencecohesion', 'cc'],
          'Coherence & Cohesion',
        ],
        [['lexicalresource', 'lr'], 'Lexical Resource'],
        [
          ['rangeaccuracy', 'grammaticalrangeaccuracy', 'gra'],
          'Grammatical Range & Accuracy',
        ],
      ]
        .map(([headers, criterionName]) => [criterionName, getBandFromHeaders(row, headers)])
        .filter(([, value]) => value !== null),
    );

    const examinerComment = getFirstNonEmpty(row, [
      'examinercommen',
      'examinercomment',
      'examinercomments',
      'examinerfeedback',
      'ratercomment',
      'ratercomments',
      'comment',
      'comments',
      'feedback',
      'note',
      'notes',
    ]);

    return {
      id: `kaggle-mazlumi-${String(index + 1).padStart(4, '0')}`,
      taskType,
      prompt: {
        id: buildPromptId(taskType, question),
        title: buildPromptTitle(taskType, question),
        taskType,
        prompt: question,
        questionType: 'Kaggle imported prompt',
        suggestedWordCount: taskType === 'task-1' ? 150 : 250,
      },
      response: essay,
      overallBand,
      ...(Object.keys(criterionScores).length > 0 ? { criterionScores } : {}),
      ...(examinerComment ? { notes: [examinerComment] } : {}),
      source: datasetSource,
    };
  });

  const output = {
    version: 1,
    source: datasetSource,
    essays,
  };

  await mkdir(path.dirname(values.output), { recursive: true });
  await writeFile(values.output, JSON.stringify(output, null, 2));

  const criterionLabeled = essays.filter((essay) => 'criterionScores' in essay).length;
  const comments = essays.filter((essay) => 'notes' in essay).length;
  const task1Count = essays.filter((essay) => essay.taskType === 'task-1').length;
  const task2Count = essays.filter((essay) => essay.taskType === 'task-2').length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: values.output,
        essays: essays.length,
        task1Count,
        task2Count,
        criterionLabeled,
        examinerCommentCount: comments,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
