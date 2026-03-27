/**
 * Shared utilities for IELTS reading crawler scripts.
 */

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPage(url, retries = 3) {
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

export function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

export function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&#xa0;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function clean(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Question type helpers
// ---------------------------------------------------------------------------

export function buildOptions(type) {
  if (type === 'true_false_not_given') return ['TRUE', 'FALSE', 'NOT GIVEN'];
  if (type === 'yes_no_not_given') return ['YES', 'NO', 'NOT GIVEN'];
  return [];
}

export function buildVariants(answer, type) {
  const v = [];
  const t = answer.trim();
  const u = t.toUpperCase();

  if (u === 'TRUE') v.push('T', 'true', 'True');
  else if (u === 'FALSE') v.push('F', 'false', 'False');
  else if (u === 'NOT GIVEN') v.push('NG', 'ng', 'not given', 'Not given', 'Not Given');
  else if (u === 'YES') v.push('Y', 'yes', 'Yes');
  else if (u === 'NO') v.push('N', 'no', 'No');
  else if (/^[A-H]$/i.test(t)) v.push(t.toUpperCase(), t.toLowerCase(), `${t.toUpperCase()}.`);
  else if (/^[ivxlc]+$/i.test(t)) v.push(t.toLowerCase(), t.toUpperCase());
  else {
    // Sentence completion: add lowercase/uppercase variants
    if (t !== t.toLowerCase()) v.push(t.toLowerCase());
    if (t !== t.toUpperCase()) v.push(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  }

  return v;
}

/**
 * Infer question type from an answer string.
 * Handles T/F/NG, Y/N/NG, single letter (multiple choice), and falls back
 * to sentence_completion.
 */
export function inferTypeFromAnswer(answer) {
  const upper = answer.toUpperCase().trim();
  if (['TRUE', 'FALSE', 'NOT GIVEN'].includes(upper)) return 'true_false_not_given';
  if (['YES', 'NO', 'NOT GIVEN'].includes(upper)) return 'yes_no_not_given';
  if (/^[A-H]\.?$/i.test(upper)) return 'multiple_choice';
  return 'sentence_completion';
}
