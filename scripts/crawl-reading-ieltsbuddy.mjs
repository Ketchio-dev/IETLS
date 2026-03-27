#!/usr/bin/env node

/**
 * Crawls free IELTS Academic Reading practice tests from ieltsbuddy.com
 * and outputs a JSON file compatible with the private reading import pipeline.
 * Internal-only developer tooling. Not part of the supported/public product workflow.
 *
 * Usage:
 *   node scripts/crawl-reading-ieltsbuddy.mjs
 *
 * Output: data/private-reading-imports/ieltsbuddy-academic.json
 * Then run: npm run reading:import-private
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  sleep,
  fetchPage,
  clean,
  buildOptions,
  buildVariants,
  inferTypeFromAnswer,
} from './lib/crawl-utils.mjs';

const OUTPUT_DIR = process.env.IELTS_PRIVATE_READING_IMPORTS_DIR ?? path.join('data', 'private-reading-imports');
const DELAY_MS = 2000;

const TEST_PAGES = [
  { url: 'https://www.ieltsbuddy.com/ielts-reading-sample.html', title: 'Air Rage' },
  { url: 'https://www.ieltsbuddy.com/ielts-sample-reading.html', title: 'Wind Power' },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-example.html', title: 'The Container Trade' },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-passages.html', title: 'Australia & The Great War' },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-passage.html', title: 'Indian Marriages' },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-diagram-completion.html', title: 'El Nino' },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-academic-practice-test.html', title: "Baby's Gender" },
  { url: 'https://www.ieltsbuddy.com/ielts-reading-mock-test-academic.html', title: 'Bees & Ecosystems' },
];

// ---------------------------------------------------------------------------
// Extract passage
// ---------------------------------------------------------------------------

function extractPassage(html) {
  // Passage paragraphs are labeled with <strong>(A)</strong>, <strong>(B)</strong> etc.
  // They sit inside a div with background-color: #f6f6f6
  const paragraphs = [];

  // Find all paragraphs with (A), (B), etc. labels
  const labeledParaPattern = /<p>\s*<strong>\(([A-Z])\)<\/strong>\s*([\s\S]*?)<\/p>/gi;
  for (const m of html.matchAll(labeledParaPattern)) {
    const letter = m[1];
    const text = clean(m[2]);
    if (text.length > 20) {
      paragraphs.push(`(${letter}) ${text}`);
    }
  }

  // Also catch tables (like the Air Rage causes table)
  // We'll include them as text if they appear between labeled paragraphs

  // Extract title from <h2> in the passage area
  let title = '';
  const passageArea = html.match(/background-color:\s*#f6f6f6[^>]*>([\s\S]*?)<\/div>/i);
  if (passageArea) {
    const h2Match = passageArea[1].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2Match) title = clean(h2Match[1]);
  }

  // If no labeled paragraphs, try plain <p> inside the f6f6f6 div
  if (paragraphs.length === 0 && passageArea) {
    for (const m of passageArea[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = clean(m[1]);
      if (text.length > 40) paragraphs.push(text);
    }
  }

  return { title, passage: paragraphs.join('\n\n') };
}

// ---------------------------------------------------------------------------
// Extract questions from <ol> elements
// ---------------------------------------------------------------------------

function extractQuestionPrompts(html) {
  const questions = new Map(); // qNum -> prompt text

  // Find question sections: <h3><strong>...Questions N – M...</strong></h3>
  const sections = html.matchAll(/<h3[^>]*>[\s\S]*?Questions?\s+(\d+)\s*[-–]\s*(\d+)[\s\S]*?<\/h3>([\s\S]*?)(?=<h3|<h2|<\/div>\s*<\/div>\s*<\/br>|$)/gi);

  for (const section of sections) {
    const start = Number(section[1]);
    const end = Number(section[2]);
    const content = section[3];

    // Detect question type from context
    let type = 'unknown';
    if (/TRUE.*FALSE.*NOT\s*GIVEN/i.test(content)) type = 'true_false_not_given';
    else if (/YES.*NO.*NOT\s*GIVEN/i.test(content)) type = 'yes_no_not_given';
    else if (/matching.*heading|choose.*heading|most suitable heading/i.test(content)) type = 'matching_headings';
    else if (/complete.*sentence|complete.*summary|NO MORE THAN/i.test(content)) type = 'sentence_completion';
    else if (/multiple.*choice|correct.*letter/i.test(content)) type = 'multiple_choice';

    // Extract individual question prompts from <ol><li> or numbered patterns
    const liMatches = content.matchAll(/<li>([\s\S]*?)(?:<\/li>|<input)/gi);
    let qNum = start;
    for (const li of liMatches) {
      if (qNum > end) break;
      const prompt = clean(li[1]).replace(/^\d+[.)]\s*/, '').trim();
      if (prompt.length > 3) {
        questions.set(qNum, { prompt, type });
      }
      qNum++;
    }

    // If <ol start="N"> didn't give us enough, try numbered patterns
    if (questions.size < end) {
      const numberedMatches = content.matchAll(/(?:^|\n|>)\s*(\d+)\s*[.)]\s*([^<\n]{10,})/gm);
      for (const nm of numberedMatches) {
        const n = Number(nm[1]);
        if (n >= start && n <= end && !questions.has(n)) {
          questions.set(n, { prompt: clean(nm[2]), type });
        }
      }
    }
  }

  return questions;
}

// ---------------------------------------------------------------------------
// Extract answers from the answer key section
// ---------------------------------------------------------------------------

function extractAnswers(html) {
  // Find answer section: various header formats across pages
  const answerHeader = html.match(/IELTS\s+(?:Reading\s+)?(?:Sample\s+)?(?:Reading\s+)?(?:Example\s*-?\s*)?Answers?\s*(?:and\s+Explanations)?\s*:?\s*<\/(?:h2|center|strong)>/i);
  if (!answerHeader) return [];

  const afterHeader = html.slice(answerHeader.index + answerHeader[0].length);

  const answers = [];

  // Strategy 1: <ol><li> format (Air Rage style)
  const olMatch = afterHeader.match(/<ol>([\s\S]*?)<\/ol>/i);
  if (olMatch) {
    for (const li of olMatch[1].matchAll(/<li>([\s\S]*?)(?:<\/li>|$)/gi)) {
      const answer = parseAnswerLi(li[1]);
      answers.push(answer);
    }
  }

  // Strategy 2: <p><strong>N</strong>. answer</p> format (Wind Power style)
  // Match each numbered answer, capturing everything until the next numbered answer or end
  if (answers.length === 0) {
    const pMatches = afterHeader.matchAll(/<p>\s*<strong>\s*(\d+)\s*<\/strong>\s*[.):\s]+\s*([\s\S]*?)(?=<p>\s*<strong>\s*\d+\s*<\/strong>|<h[1-6]|<div\s+class="related|$)/gi);
    for (const m of pMatches) {
      const raw = m[2];
      const answer = parseAnswerP(raw);
      if (answer.answer) answers.push(answer);
    }
  }

  // Strategy 3: numbered lines without <p> — "1. answer" or "<strong>1.</strong> answer"
  if (answers.length === 0) {
    const lineMatches = afterHeader.matchAll(/(?:<p>|<br\s*\/?>|\n)\s*(?:<strong>)?\s*(\d+)\s*[.)]\s*(?:<\/strong>)?\s*([\s\S]*?)(?=<p>|<br|<\/div>|\n\s*(?:<strong>)?\s*\d+\s*[.)]|$)/gi);
    for (const m of lineMatches) {
      const raw = m[2];
      const answer = parseAnswerP(raw);
      if (answer.answer) answers.push(answer);
    }
  }

  // Strategy 4: JavaScript quiz_answerlist array (Australia, etc.)
  if (answers.length === 0) {
    const jsAnswers = extractJSQuizAnswers(html);
    for (const ans of jsAnswers) {
      answers.push(ans);
    }
  }

  return answers;
}

function extractJSQuizAnswers(html) {
  const answers = [];
  // Pattern: var quiz_answerlist = [0, [['First World War', 'Great War'],'support',...]]
  const match = html.match(/quiz_answerlist\s*=\s*\[0,\s*\[([\s\S]*?)\]\s*\]/);
  if (!match) return answers;

  // Parse the array contents - handles both string and array-of-string entries
  const raw = match[1];
  // Extract all items: either ['word1','word2'] or 'word'
  const items = [];
  let i = 0;
  while (i < raw.length) {
    // Skip whitespace and commas
    while (i < raw.length && /[\s,]/.test(raw[i])) i++;
    if (i >= raw.length) break;

    if (raw[i] === '[') {
      // Array of accepted answers
      const end = raw.indexOf(']', i);
      if (end === -1) break;
      const inner = raw.slice(i + 1, end);
      const variants = inner.match(/'([^']*)'/g)?.map((s) => s.replace(/'/g, '')) || [];
      items.push(variants);
      i = end + 1;
    } else if (raw[i] === "'") {
      const end = raw.indexOf("'", i + 1);
      if (end === -1) break;
      items.push([raw.slice(i + 1, end)]);
      i = end + 1;
    } else {
      i++;
    }
  }

  for (const item of items) {
    const answer = item[0] || '';
    const type = inferTypeFromAnswer(answer);
    answers.push({
      answer,
      type,
      explanation: '',
    });
  }

  return answers;
}

function parseAnswerP(raw) {
  const text = clean(raw);

  // T/F/NG
  const tfng = text.match(/^(True|False|Not\s*Given|Yes|No)\b/i);
  if (tfng) {
    const val = tfng[1].replace(/\s+/g, ' ');
    const normalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    const answer = normalized === 'Not given' ? 'Not Given' : normalized;
    const type = /true|false/i.test(val) || /not given/i.test(val) ? 'true_false_not_given' : 'yes_no_not_given';
    const explanation = extractExplanation(raw);
    return { answer, type, explanation };
  }

  // Single letter (A-H or roman numerals)
  const letterMatch = text.match(/^([A-H])(?:\s|$|\.)/i);
  if (letterMatch) {
    return { answer: letterMatch[1].toUpperCase(), type: 'multiple_choice', explanation: extractExplanation(raw) };
  }

  const romanMatch = text.match(/^([ivxlc]+)(?:\s|$)/i);
  if (romanMatch) {
    return { answer: romanMatch[1].toLowerCase(), type: 'matching_headings', explanation: extractExplanation(raw) };
  }

  // Text answer (sentence completion)
  const answer = text.replace(/\(.*?\)/g, '').replace(/<.*?>/g, '').trim();
  return { answer, type: 'sentence_completion', explanation: extractExplanation(raw) };
}

function parseAnswerLi(raw) {
  // Pattern 1: Matching headings — "Paragraph B______ii"
  const headingMatch = raw.match(/Paragraph\s+[A-Z]\s*_+\s*([ivxlc]+)/i);
  if (headingMatch) {
    const explanation = extractExplanation(raw);
    return { answer: headingMatch[1].toLowerCase(), type: 'matching_headings', explanation };
  }

  // Pattern 2: T/F/NG — "<strong>True</strong>" or "<strong> False</strong>"
  const tfngMatch = raw.match(/<strong>\s*(True|False|Not\s*Given|Yes|No)\s*<\/strong>/i);
  if (tfngMatch) {
    const val = tfngMatch[1].trim();
    const normalized = val.replace(/\s+/g, ' ');
    const upper = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    const explanation = extractExplanation(raw);
    const type = /not given/i.test(val) || /true|false/i.test(val) ? 'true_false_not_given' : 'yes_no_not_given';
    return { answer: upper === 'Not given' ? 'Not Given' : upper, type, explanation };
  }

  // Pattern 3: Letter answer — "<strong>C</strong>" or just "C"
  const letterMatch = raw.match(/<strong>\s*([A-H])\s*<\/strong>/i);
  if (letterMatch) {
    const explanation = extractExplanation(raw);
    return { answer: letterMatch[1].toUpperCase(), type: 'multiple_choice', explanation };
  }

  // Pattern 4: Text answer — "<strong>some answer</strong>"
  const textMatch = raw.match(/<strong>\s*(.+?)\s*<\/strong>/i);
  if (textMatch) {
    const answer = clean(textMatch[1]);
    const explanation = extractExplanation(raw);
    return { answer, type: 'sentence_completion', explanation };
  }

  // Fallback: clean the whole thing — treat as sentence_completion rather than unknown
  const explanation = extractExplanation(raw);
  const answer = clean(raw).replace(/\(.*?\)/g, '').trim();
  return { answer, type: 'sentence_completion', explanation };
}

function extractExplanation(raw) {
  const emMatch = raw.match(/<em>\s*\(?([\s\S]*?)\)?\s*<\/em>/i);
  return emMatch ? clean(emMatch[1]).replace(/^\(|\)$/g, '').trim() : '';
}

// ---------------------------------------------------------------------------
// Build questions from prompts + answers
// ---------------------------------------------------------------------------

function buildQuestions(questionPrompts, answerList) {
  const questions = [];

  for (let i = 0; i < answerList.length; i++) {
    const qNum = i + 1;
    const ans = answerList[i];
    const promptData = questionPrompts.get(qNum);

    const prompt = promptData?.prompt || `Question ${qNum}`;
    const type = [ans.type, promptData?.type].find((value) => value && value !== 'unknown') || 'sentence_completion';

    if (!ans.answer) continue;

    questions.push({
      type,
      prompt,
      options: buildOptions(type),
      answer: ans.answer,
      acceptedVariants: buildVariants(ans.answer),
      explanation: ans.explanation || '',
      evidenceHint: '',
    });
  }

  return questions;
}

// ---------------------------------------------------------------------------
// Crawl one page
// ---------------------------------------------------------------------------

async function crawlPage(pageInfo) {
  process.stdout.write(`  ${pageInfo.title} ... `);

  let html;
  try {
    html = await fetchPage(pageInfo.url);
  } catch (err) {
    console.log(`✗ ${err.message}`);
    return null;
  }

  const { title: passageTitle, passage } = extractPassage(html);
  const questionPrompts = extractQuestionPrompts(html);
  const answerList = extractAnswers(html);
  const questions = buildQuestions(questionPrompts, answerList);

  if (!passage || passage.length < 100) {
    console.log(`✗ passage too short (${passage.length} chars)`);
    return null;
  }

  if (questions.length === 0) {
    console.log(`✗ no questions (answers found: ${answerList.length})`);
    return null;
  }

  const title = passageTitle || pageInfo.title;
  const wordCount = passage.split(/\s+/).filter(Boolean).length;

  console.log(`✓ ${wordCount} words, ${questions.length} questions`);

  return {
    title,
    sourceLabel: 'ieltsbuddy.com Academic Reading',
    passage,
    notes: `Crawled from ${pageInfo.url} on ${new Date().toISOString().slice(0, 10)}`,
    questions,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`IELTSBuddy.com Academic Reading Crawler`);
  console.log(`Pages: ${TEST_PAGES.length}`);
  console.log(`Output: ${OUTPUT_DIR}/\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const sets = [];

  for (let i = 0; i < TEST_PAGES.length; i++) {
    const result = await crawlPage(TEST_PAGES[i]);
    if (result) sets.push(result);
    if (i < TEST_PAGES.length - 1) await sleep(DELAY_MS);
  }

  if (sets.length > 0) {
    const outPath = path.join(OUTPUT_DIR, 'ieltsbuddy-academic.json');
    await writeFile(outPath, JSON.stringify({ sets }, null, 2));
    const totalQ = sets.reduce((s, set) => s + set.questions.length, 0);
    console.log(`\n→ ${outPath}`);
    console.log(`✅ Done: ${sets.length} passages, ${totalQ} questions`);
    console.log(`Next: npm run reading:import-private`);
  } else {
    console.log('\n✗ No passages extracted.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exitCode = 1;
});
