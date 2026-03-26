import type { CriterionName, EvidenceSignal, EssaySubmission, WritingPrompt } from '@/lib/domain';

import { countMatches, countParagraphs, countWords } from './metrics';

const buildSignal = (
  id: string,
  criterion: CriterionName | 'Overall',
  label: string,
  strength: EvidenceSignal['strength'],
  detail: string,
  source: EvidenceSignal['source'],
): EvidenceSignal => ({ id, criterion, label, strength, detail, source });

export function extractWritingEvidence(prompt: WritingPrompt, submission: EssaySubmission): EvidenceSignal[] {
  const response = submission.response;
  const wordCount = countWords(response);
  const paragraphs = countParagraphs(response);
  const sentenceVariety = countMatches(response, /,|;| which | that | although | because | while /gi);
  const promptKeywords = ['public', 'transport', 'roads', 'government', 'funds'];
  const keywordHits = promptKeywords.filter((keyword) => response.toLowerCase().includes(keyword)).length;
  const hasOpinion = /\b(I believe|I think|In my opinion|I would argue|Overall, I believe)\b/i.test(response);
  const hasBalancedDiscussion = /\b(on the one hand|on the other hand|however|while|whereas)\b/i.test(response);
  const examples = countMatches(response, /for example|for instance|such as/gi);
  const repeatedGeneralWords = countMatches(response, /\b(thing|things|good|bad|important|problem)\b/gi);

  return [
    buildSignal(
      'coverage-word-count',
      'Task Response',
      'Task coverage',
      wordCount >= prompt.suggestedWordCount ? 'strong' : wordCount >= 220 ? 'developing' : 'weak',
      `Approx. ${wordCount} words against a ${prompt.suggestedWordCount}+ word target.`,
      'rule-based',
    ),
    buildSignal(
      'coverage-relevance',
      'Task Response',
      'Prompt relevance',
      keywordHits >= 3 ? 'strong' : keywordHits >= 2 ? 'developing' : 'weak',
      `Detected ${keywordHits} core topic keywords from the prompt in the response.`,
      'rule-based',
    ),
    buildSignal(
      'response-position',
      'Task Response',
      'Position clarity',
      hasOpinion ? 'strong' : 'developing',
      hasOpinion ? 'The essay signals an explicit position.' : 'The response implies a view but does not clearly signpost it.',
      'rubric-based',
    ),
    buildSignal(
      'cohesion-paragraphing',
      'Coherence & Cohesion',
      'Paragraph control',
      paragraphs >= 4 ? 'strong' : paragraphs >= 3 ? 'developing' : 'weak',
      `Detected ${paragraphs} main paragraph block(s).`,
      'rule-based',
    ),
    buildSignal(
      'cohesion-balance',
      'Coherence & Cohesion',
      'Balanced discussion cues',
      hasBalancedDiscussion ? 'strong' : 'developing',
      hasBalancedDiscussion ? 'The draft uses compare/contrast language to manage both views.' : 'Discussion cues are limited, so paragraph progression may feel abrupt.',
      'rubric-based',
    ),
    buildSignal(
      'lexical-topic-range',
      'Lexical Resource',
      'Topic vocabulary',
      keywordHits >= 4 ? 'strong' : keywordHits >= 2 ? 'developing' : 'weak',
      `Topical vocabulary coverage is ${keywordHits >= 4 ? 'strong' : keywordHits >= 2 ? 'emerging' : 'thin'} for this prompt.`,
      'model-ready',
    ),
    buildSignal(
      'lexical-generality',
      'Lexical Resource',
      'Precision vs repetition',
      repeatedGeneralWords <= 2 ? 'strong' : repeatedGeneralWords <= 5 ? 'developing' : 'weak',
      `Repeated general-purpose vocabulary count: ${repeatedGeneralWords}.`,
      'rule-based',
    ),
    buildSignal(
      'grammar-variety',
      'Grammatical Range & Accuracy',
      'Sentence variety',
      sentenceVariety >= 6 ? 'strong' : sentenceVariety >= 3 ? 'developing' : 'weak',
      `Detected ${sentenceVariety} clause-complexity signals from punctuation and subordination cues.`,
      'rule-based',
    ),
    buildSignal(
      'grammar-support',
      'Task Response',
      'Example support',
      examples >= 2 ? 'strong' : examples === 1 ? 'developing' : 'weak',
      `Detected ${examples} explicit example cue(s).`,
      'rubric-based',
    ),
  ];
}
