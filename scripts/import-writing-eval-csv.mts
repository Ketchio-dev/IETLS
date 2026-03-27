import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

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

  const headers = rows[0] ?? [];
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function nonEmpty(value: string | undefined) {
  const trimmed = normalizeWhitespace(value ?? '');
  return trimmed.length > 0 ? trimmed : null;
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

function buildPromptId(taskType: 'task-1' | 'task-2', question: string) {
  const digest = createHash('sha1').update(`${taskType}:${question}`).digest('hex').slice(0, 12);
  return `kaggle-mazlumi-${taskType}-${digest}`;
}

function buildPromptTitle(taskType: 'task-1' | 'task-2', question: string) {
  const compact = question.replace(/\s+/g, ' ').trim();
  const clipped = compact.length > 64 ? `${compact.slice(0, 61)}...` : compact;
  return `${taskType === 'task-1' ? 'Kaggle Task 1' : 'Kaggle Task 2'}: ${clipped}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o', default: 'data/evals/writing/kaggle-mazlumi-overall.json' },
    },
  });

  if (!values.input) {
    throw new Error('Missing required --input <csv-path> argument.');
  }

  const csvContent = await readFile(values.input, 'utf8');
  const rows = parseCsv(csvContent);

  const essays = rows.map((row, index) => {
    const taskTypeRaw = nonEmpty(row.Task_Type);
    const taskType = taskTypeRaw === '1' ? 'task-1' : taskTypeRaw === '2' ? 'task-2' : null;
    if (!taskType) {
      throw new Error(`Row ${index + 2} has unsupported Task_Type: ${row.Task_Type}`);
    }

    const question = nonEmpty(row.Question);
    const essay = nonEmpty(row.Essay);
    const overallBand = toBand(row.Overall);
    if (!question || !essay || overallBand === null) {
      throw new Error(`Row ${index + 2} is missing Question, Essay, or Overall.`);
    }

    const criterionScores = Object.fromEntries(
      [
        ['Task_Response', taskType === 'task-2' ? 'Task Response' : 'Task Achievement'],
        ['Coherence_Cohesion', 'Coherence & Cohesion'],
        ['Lexical_Resource', 'Lexical Resource'],
        ['Range_Accuracy', 'Grammatical Range & Accuracy'],
      ]
        .map(([csvKey, criterionName]) => [criterionName, toBand(row[csvKey])])
        .filter(([, value]) => value !== null),
    );

    const examinerComment = nonEmpty(row.Examiner_Commen);

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
      source: 'kaggle-mazlumi-ielts-writing-scored-essays-dataset',
    };
  });

  const output = {
    version: 1,
    source: 'kaggle-mazlumi-ielts-writing-scored-essays-dataset',
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
