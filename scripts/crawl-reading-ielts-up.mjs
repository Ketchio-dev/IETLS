#!/usr/bin/env node

/**
 * Crawls free IELTS Academic Reading practice tests from ielts-up.com
 * and outputs JSON files compatible with the private reading import pipeline.
 *
 * Usage:
 *   node scripts/crawl-reading-ielts-up.mjs              # crawl all 11 tests
 *   node scripts/crawl-reading-ielts-up.mjs --test 1     # crawl test 1 only
 *   node scripts/crawl-reading-ielts-up.mjs --test 1-3   # crawl tests 1 through 3
 *
 * Output: data/private-reading-imports/ielts-up-test-{N}.json
 * Then run: npm run reading:import-private
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const BASE_URL = 'https://ielts-up.com/reading';
const OUTPUT_DIR = process.env.IELTS_PRIVATE_READING_IMPORTS_DIR ?? path.join('data', 'private-reading-imports');
const TOTAL_TESTS = 11;
const SECTIONS_PER_TEST = 3;
const DELAY_MS = 1500;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let startTest = 1;
  let endTest = TOTAL_TESTS;

  const idx = args.indexOf('--test');
  if (idx !== -1 && args[idx + 1]) {
    const range = args[idx + 1];
    if (range.includes('-')) {
      const [s, e] = range.split('-').map(Number);
      startTest = Math.max(1, s);
      endTest = Math.min(TOTAL_TESTS, e);
    } else {
      startTest = endTest = Math.max(1, Math.min(TOTAL_TESTS, Number(range)));
    }
  }

  return { startTest, endTest };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) IELTS-Practice-Importer/1.0',
          Accept: 'text/html',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function clean(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Extract passage from <div class="exam-text">
// ---------------------------------------------------------------------------

function extractPassage(html) {
  const examTextMatch = html.match(/<div\s+class="exam-text">([\s\S]*?)<\/div>/i);
  if (!examTextMatch) return { title: '', passage: '' };

  const block = examTextMatch[1];

  // Title: first <p align="center"><strong>...</strong></p>
  const titleMatch = block.match(/<p[^>]*align="center"[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/p>/i);
  const title = titleMatch ? clean(titleMatch[1]) : '';

  // Paragraphs: all <p> tags inside exam-text
  const paragraphs = [];
  for (const m of block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = clean(m[1]);
    // Skip short lines, titles (centered bold), and instruction lines
    if (text.length < 40) continue;
    if (/^READING PASSAGE/i.test(text)) continue;
    if (/^You should spend/i.test(text)) continue;
    if (/^Close your eyes/i.test(text) && text.length < 150) continue;
    paragraphs.push(text);
  }

  // Also catch text outside <p> but inside exam-text (some pages use bare text with <br>)
  const strippedBlock = block
    .replace(/<p[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<noindex>|<\/noindex>/gi, '');
  const extraText = clean(strippedBlock);
  if (extraText.length > 80) {
    paragraphs.push(extraText);
  }

  return { title, passage: paragraphs.join('\n\n') };
}

// ---------------------------------------------------------------------------
// Extract answers from <div id="answers"><ol><li>...</li></ol></div>
// ---------------------------------------------------------------------------

function extractAnswerKey(html) {
  const answersDiv = html.match(/<div\s+id="answers"[^>]*>([\s\S]*?)<\/div>/i);
  if (!answersDiv) return [];

  const answers = [];
  for (const m of answersDiv[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
    const answer = clean(m[1]).trim();
    if (answer) answers.push(answer);
  }

  return answers;
}

// ---------------------------------------------------------------------------
// Extract questions from the form area
// ---------------------------------------------------------------------------

function extractQuestions(html, answerKey) {
  const questions = [];

  // Find the form/question area (after exam-text, before the answers div)
  const formStart = html.indexOf('</div>', html.indexOf('class="exam-text"'));
  const formEnd = html.indexOf('id="answers"');
  if (formStart === -1 || formEnd === -1) return questions;

  const formArea = html.slice(formStart, formEnd);

  // Parse question ranges to detect types
  const ranges = detectQuestionRanges(formArea);

  // Parse individual questions: <p><strong>N.</strong> text...
  // or <p><strong>N. </strong>text...
  const qPattern = /<p>\s*<strong>\s*(\d+)\s*[.)]\s*<\/strong>\s*([\s\S]*?)(?=<p>\s*<strong>\s*\d+\s*[.)]|<br\s*\/?>\s*<p><strong>Questions|<\/form>|$)/gi;

  for (const m of formArea.matchAll(qPattern)) {
    const qNum = Number(m[1]);
    const rawContent = m[2];

    // Extract prompt text (strip inputs, selects, spans)
    let prompt = rawContent
      .replace(/<select[\s\S]*?<\/select>/gi, '______')
      .replace(/<input[^>]*>/gi, '______')
      .replace(/<span[\s\S]*?<\/span>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ');
    prompt = clean(prompt).replace(/\s*______\s*/g, ' ______ ').trim();

    // Remove trailing ______ if it's just the answer blank
    prompt = prompt.replace(/\s*______\s*$/, '').trim();

    const answer = answerKey[qNum - 1] || '';
    const type = detectQuestionType(qNum, ranges, answer);

    if (prompt && answer) {
      questions.push({
        type,
        prompt,
        options: buildOptions(type),
        answer,
        acceptedVariants: buildVariants(answer, type),
        explanation: '',
        evidenceHint: '',
      });
    }
  }

  // If regex missed some questions, fill from answer key
  if (questions.length < answerKey.length) {
    const found = new Set(questions.map((_, i) => i));
    for (let i = questions.length; i < answerKey.length; i++) {
      const answer = answerKey[i];
      if (!answer) continue;
      const type = inferTypeFromAnswer(answer);
      questions.push({
        type,
        prompt: `Question ${i + 1}`,
        options: buildOptions(type),
        answer,
        acceptedVariants: buildVariants(answer, type),
        explanation: '',
        evidenceHint: '',
      });
    }
  }

  // Final safety: any question still typed "unknown" becomes sentence_completion
  for (const q of questions) {
    if (q.type === 'unknown') q.type = 'sentence_completion';
  }

  return questions;
}

function detectQuestionRanges(formArea) {
  const ranges = [];

  for (const m of formArea.matchAll(/Questions?\s+(\d+)\s*[-–]\s*(\d+)/gi)) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    const idx = m.index || 0;
    const context = formArea.slice(idx, idx + 600);

    let type = 'unknown';
    if (/TRUE\s*[/,]\s*FALSE\s*[/,]\s*NOT\s*GIVEN/i.test(context)) type = 'true_false_not_given';
    else if (/YES\s*[/,]\s*NO\s*[/,]\s*NOT\s*GIVEN/i.test(context)) type = 'yes_no_not_given';
    else if (/match.*heading/i.test(context)) type = 'matching_headings';
    else if (/complete.*sentence|complete.*summary|NO MORE THAN/i.test(context)) type = 'sentence_completion';
    else if (/multiple.*choice|correct.*letter|choose/i.test(context)) type = 'multiple_choice';

    ranges.push({ start, end, type });
  }

  return ranges;
}

function detectQuestionType(qNum, ranges, answer) {
  for (const r of ranges) {
    if (qNum >= r.start && qNum <= r.end && r.type !== 'unknown') {
      return r.type;
    }
  }
  return inferTypeFromAnswer(answer);
}

function inferTypeFromAnswer(answer) {
  const upper = answer.toUpperCase().trim();
  if (['TRUE', 'FALSE', 'NOT GIVEN'].includes(upper)) return 'true_false_not_given';
  if (['YES', 'NO', 'NOT GIVEN'].includes(upper)) return 'yes_no_not_given';
  if (/^[A-H]\.?$/i.test(upper)) return 'multiple_choice';
  return 'sentence_completion';
}

function buildOptions(type) {
  if (type === 'true_false_not_given') return ['TRUE', 'FALSE', 'NOT GIVEN'];
  if (type === 'yes_no_not_given') return ['YES', 'NO', 'NOT GIVEN'];
  return [];
}

function buildVariants(answer, type) {
  const v = [];
  const t = answer.trim();
  const u = t.toUpperCase();

  if (u === 'TRUE') v.push('T', 'true', 'True');
  else if (u === 'FALSE') v.push('F', 'false', 'False');
  else if (u === 'NOT GIVEN') v.push('NG', 'ng', 'not given', 'Not given', 'Not Given');
  else if (u === 'YES') v.push('Y', 'yes', 'Yes');
  else if (u === 'NO') v.push('N', 'no', 'No');
  else if (/^[A-H]$/i.test(t)) v.push(t.toUpperCase(), t.toLowerCase(), `${t.toUpperCase()}.`);
  else {
    // Sentence completion: add lowercase/uppercase variants
    if (t !== t.toLowerCase()) v.push(t.toLowerCase());
    if (t !== t.toUpperCase()) v.push(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  }

  return v;
}

// ---------------------------------------------------------------------------
// Crawl one section
// ---------------------------------------------------------------------------

async function crawlSection(testNum, sectionNum) {
  const url = `${BASE_URL}/academic-reading-sample-${testNum}.${sectionNum}.html`;
  process.stdout.write(`  ${url} ... `);

  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.log(`✗ ${err.message}`);
    return null;
  }

  const { title: passageTitle, passage } = extractPassage(html);
  const answerKey = extractAnswerKey(html);
  const questions = extractQuestions(html, answerKey);

  if (!passage || passage.length < 100) {
    console.log(`✗ passage too short (${passage.length} chars)`);
    return null;
  }

  if (questions.length === 0) {
    console.log(`✗ no questions extracted (answer key: ${answerKey.length})`);
    return null;
  }

  const wordCount = passage.split(/\s+/).filter(Boolean).length;
  const sectionTitle = passageTitle || `Academic Reading Test ${testNum} - Section ${sectionNum}`;

  console.log(`✓ "${sectionTitle}" — ${wordCount} words, ${questions.length}/${answerKey.length} questions`);

  return {
    title: sectionTitle,
    sourceLabel: `ielts-up.com Academic Test ${testNum}`,
    passage,
    notes: `Crawled from ${url} on ${new Date().toISOString().slice(0, 10)}`,
    questions: questions.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      acceptedVariants: q.acceptedVariants,
      explanation: q.explanation,
      evidenceHint: q.evidenceHint,
    })),
  };
}

// ---------------------------------------------------------------------------
// Crawl one test (3 sections)
// ---------------------------------------------------------------------------

async function crawlTest(testNum) {
  console.log(`\n📖 Academic Reading Test ${testNum}`);
  const sets = [];

  for (let s = 1; s <= SECTIONS_PER_TEST; s++) {
    const result = await crawlSection(testNum, s);
    if (result) sets.push(result);
    if (s < SECTIONS_PER_TEST) await sleep(DELAY_MS);
  }

  return sets;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { startTest, endTest } = parseArgs();
  const totalSections = (endTest - startTest + 1) * SECTIONS_PER_TEST;

  console.log(`IELTS-Up.com Academic Reading Crawler`);
  console.log(`Tests: ${startTest}–${endTest} (${totalSections} sections)`);
  console.log(`Output: ${OUTPUT_DIR}/`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  let totalSets = 0;
  let totalQuestions = 0;

  for (let t = startTest; t <= endTest; t++) {
    const sets = await crawlTest(t);

    if (sets.length > 0) {
      const outPath = path.join(OUTPUT_DIR, `ielts-up-test-${t}.json`);
      await writeFile(outPath, JSON.stringify({ sets }, null, 2));
      console.log(`  → ${outPath} (${sets.length} sections)`);
      totalSets += sets.length;
      totalQuestions += sets.reduce((sum, s) => sum + s.questions.length, 0);
    }

    if (t < endTest) await sleep(DELAY_MS);
  }

  console.log(`\n✅ Done: ${totalSets} passages, ${totalQuestions} questions`);
  if (totalSets > 0) {
    console.log(`Next: npm run reading:import-private`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exitCode = 1;
});
