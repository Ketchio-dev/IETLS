import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SOURCE_DIR = process.env.IELTS_PRIVATE_READING_IMPORTS_DIR ?? path.join('data', 'private-reading-imports');
const OUTPUT_DIR = process.env.IELTS_DATA_DIR ?? path.join('data', 'runtime');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'reading-private-imports.json');

function isImportSourceFile(entryName) {
  return entryName.endsWith('.json') && !entryName.startsWith('template.');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'reading-set';
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function normalizeStringArray(values) {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function normalizeQuestion(question, index, setId) {
  if (!question || typeof question !== 'object') {
    throw new Error(`Question ${index + 1} in ${setId} must be an object.`);
  }

  const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : '';
  if (!prompt) {
    throw new Error(`Question ${index + 1} in ${setId} is missing a prompt.`);
  }

  const type = typeof question.type === 'string' ? question.type.trim() : 'unknown';
  const answerCandidates = question.answer ?? question.answers;
  const acceptedAnswers = normalizeStringArray(asArray(answerCandidates));
  if (acceptedAnswers.length === 0) {
    throw new Error(`Question ${index + 1} in ${setId} must include answer or answers.`);
  }

  return {
    id: typeof question.id === 'string' && question.id.trim() ? question.id.trim() : `${setId}-q${index + 1}`,
    type,
    prompt,
    options: normalizeStringArray(Array.isArray(question.options) ? question.options : []),
    acceptedAnswers,
    acceptedVariants: normalizeStringArray(Array.isArray(question.acceptedVariants) ? question.acceptedVariants : []),
    explanation: typeof question.explanation === 'string' ? question.explanation.trim() : '',
    evidenceHint: typeof question.evidenceHint === 'string' ? question.evidenceHint.trim() : '',
  };
}

function normalizeSet(candidate, sourceFile, importedAt) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`${sourceFile}: each imported set must be an object.`);
  }

  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const passage = typeof candidate.passage === 'string' ? candidate.passage.trim() : '';
  if (!title || !passage) {
    throw new Error(`${sourceFile}: each set needs title and passage.`);
  }

  if (!Array.isArray(candidate.questions) || candidate.questions.length === 0) {
    throw new Error(`${sourceFile}: each set needs a non-empty questions array.`);
  }

  const setId = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : slugify(title);

  return {
    id: setId,
    title,
    sourceLabel: typeof candidate.sourceLabel === 'string' ? candidate.sourceLabel.trim() : title,
    sourceFile,
    importedAt,
    passage,
    passageWordCount: passage.split(/\s+/).filter(Boolean).length,
    notes: typeof candidate.notes === 'string' ? candidate.notes.trim() : '',
    questions: candidate.questions.map((question, index) => normalizeQuestion(question, index, setId)),
  };
}

async function readSourceFiles(sourceDir) {
  await mkdir(sourceDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isImportSourceFile(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function loadSetCandidates(sourceDir, fileName) {
  const filePath = path.join(sourceDir, fileName);
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sets)) {
    return parsed.sets;
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed];
  }

  throw new Error(`${fileName}: expected a JSON object, an array of set objects, or { sets: [...] }.`);
}

async function importReadingBank() {
  const importedAt = new Date().toISOString();
  const sourceFiles = await readSourceFiles(SOURCE_DIR);
  const sets = [];

  for (const fileName of sourceFiles) {
    const candidates = await loadSetCandidates(SOURCE_DIR, fileName);
    for (const candidate of candidates) {
      sets.push(normalizeSet(candidate, fileName, importedAt));
    }
  }

  const payload = {
    version: 1,
    importedAt,
    sourceDir: SOURCE_DIR,
    sourceFiles,
    sets,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));

  const outputStat = await stat(OUTPUT_PATH);
  console.log(JSON.stringify({
    ok: true,
    sourceDir: SOURCE_DIR,
    outputPath: OUTPUT_PATH,
    sourceFiles: sourceFiles.length,
    importedSets: sets.length,
    bytes: outputStat.size,
  }, null, 2));
}

importReadingBank().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
