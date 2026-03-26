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

function extractTask1Evidence(prompt: WritingPrompt, submission: EssaySubmission): EvidenceSignal[] {
  const response = submission.response;
  const wordCount = countWords(response);
  const paragraphs = countParagraphs(response);
  const keywordHits = prompt.keywordTargets.filter((keyword) => response.toLowerCase().includes(keyword)).length;
  const numberMentions = countMatches(response, /\d+(?:\.\d+)?%?/g);
  const hasOverview = /(overall|in general|it is clear that|it can be seen that)/i.test(response);
  const comparisonHits = countMatches(response, /more than|less than|higher than|lower than|compared with|in contrast|whereas|while/gi);
  const trendHits = countMatches(response, /increase|rise|grew|peak|decline|fall|drop|remain|stable|fluctuat/gi);
  const timeMarkers = countMatches(response, /(2004|2014|morning|afternoon|evening|midday|at \d{1,2}:\d{2})/gi);
  const repeatedGeneralWords = countMatches(response, /(thing|things|good|bad|important|nice)/gi);
  const sentenceVariety = countMatches(response, /,|;| which | that | although | while | whereas | respectively /gi);

  return [
    buildSignal(
      'task1-word-count',
      'Task Achievement',
      'Task 1 coverage',
      wordCount >= prompt.suggestedWordCount ? 'strong' : wordCount >= 130 ? 'developing' : 'weak',
      'Approx. ' + wordCount + ' words against a ' + prompt.suggestedWordCount + '+ word target.',
      'rule-based',
    ),
    buildSignal(
      'task1-overview',
      'Task Achievement',
      'Overview statement',
      hasOverview ? 'strong' : 'weak',
      hasOverview
        ? 'The response includes a visible overview of the main features.'
        : 'A clear overview sentence is missing or too implicit for Task 1.',
      'rubric-based',
    ),
    buildSignal(
      'task1-key-features',
      'Task Achievement',
      'Key feature selection',
      numberMentions >= 4 && keywordHits >= 3 ? 'strong' : numberMentions >= 2 ? 'developing' : 'weak',
      'Detected ' + numberMentions + ' numeric/data references and ' + keywordHits + ' task keywords from the visual prompt.',
      'model-ready',
    ),
    buildSignal(
      'cohesion-paragraphing',
      'Coherence & Cohesion',
      'Paragraph control',
      paragraphs >= 4 ? 'strong' : paragraphs >= 3 ? 'developing' : 'weak',
      'Detected ' + paragraphs + ' main paragraph block(s).',
      'rule-based',
    ),
    buildSignal(
      'task1-comparisons',
      'Coherence & Cohesion',
      'Comparisons and grouping',
      comparisonHits >= 2 ? 'strong' : comparisonHits === 1 ? 'developing' : 'weak',
      'Detected ' + comparisonHits + ' explicit comparison cue(s).',
      'rubric-based',
    ),
    buildSignal(
      'task1-trend-language',
      'Lexical Resource',
      'Trend vocabulary',
      trendHits >= 4 ? 'strong' : trendHits >= 2 ? 'developing' : 'weak',
      'Detected ' + trendHits + ' trend or change descriptors across the response.',
      'model-ready',
    ),
    buildSignal(
      'lexical-generality',
      'Lexical Resource',
      'Precision vs repetition',
      repeatedGeneralWords <= 1 ? 'strong' : repeatedGeneralWords <= 3 ? 'developing' : 'weak',
      'Repeated general-purpose vocabulary count: ' + repeatedGeneralWords + '.',
      'rule-based',
    ),
    buildSignal(
      'grammar-variety',
      'Grammatical Range & Accuracy',
      'Sentence variety',
      sentenceVariety >= 4 ? 'strong' : sentenceVariety >= 2 ? 'developing' : 'weak',
      'Detected ' + sentenceVariety + ' clause-complexity signals from punctuation and subordination cues.',
      'rule-based',
    ),
    buildSignal(
      'task1-time-reference',
      'Grammatical Range & Accuracy',
      'Time and data references',
      timeMarkers >= 3 ? 'strong' : timeMarkers >= 1 ? 'developing' : 'weak',
      'Detected ' + timeMarkers + ' year or time reference cue(s) tied to the data description.',
      'rubric-based',
    ),
  ];
}

function extractTask2Evidence(prompt: WritingPrompt, submission: EssaySubmission): EvidenceSignal[] {
  const response = submission.response;
  const wordCount = countWords(response);
  const paragraphs = countParagraphs(response);
  const sentenceVariety = countMatches(response, /,|;| which | that | although | because | while /gi);
  const keywordHits = prompt.keywordTargets.filter((keyword) => response.toLowerCase().includes(keyword)).length;
  const hasOpinion = /(I believe|I think|In my opinion|I would argue|Overall, I believe)/i.test(response);
  const hasBalancedDiscussion = /(on the one hand|on the other hand|however|while|whereas)/i.test(response);
  const examples = countMatches(response, /for example|for instance|such as/gi);
  const repeatedGeneralWords = countMatches(response, /(thing|things|good|bad|important|problem)/gi);

  return [
    buildSignal(
      'coverage-word-count',
      'Task Response',
      'Task coverage',
      wordCount >= prompt.suggestedWordCount ? 'strong' : wordCount >= 220 ? 'developing' : 'weak',
      'Approx. ' + wordCount + ' words against a ' + prompt.suggestedWordCount + '+ word target.',
      'rule-based',
    ),
    buildSignal(
      'coverage-relevance',
      'Task Response',
      'Prompt relevance',
      keywordHits >= 3 ? 'strong' : keywordHits >= 2 ? 'developing' : 'weak',
      'Detected ' + keywordHits + ' core topic keywords from the prompt in the response.',
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
      'Detected ' + paragraphs + ' main paragraph block(s).',
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
      'Topical vocabulary coverage is ' + (keywordHits >= 4 ? 'strong' : keywordHits >= 2 ? 'emerging' : 'thin') + ' for this prompt.',
      'model-ready',
    ),
    buildSignal(
      'lexical-generality',
      'Lexical Resource',
      'Precision vs repetition',
      repeatedGeneralWords <= 2 ? 'strong' : repeatedGeneralWords <= 5 ? 'developing' : 'weak',
      'Repeated general-purpose vocabulary count: ' + repeatedGeneralWords + '.',
      'rule-based',
    ),
    buildSignal(
      'grammar-variety',
      'Grammatical Range & Accuracy',
      'Sentence variety',
      sentenceVariety >= 6 ? 'strong' : sentenceVariety >= 3 ? 'developing' : 'weak',
      'Detected ' + sentenceVariety + ' clause-complexity signals from punctuation and subordination cues.',
      'rule-based',
    ),
    buildSignal(
      'grammar-support',
      'Task Response',
      'Example support',
      examples >= 2 ? 'strong' : examples === 1 ? 'developing' : 'weak',
      'Detected ' + examples + ' explicit example cue(s).',
      'rubric-based',
    ),
  ];
}

export function extractWritingEvidence(prompt: WritingPrompt, submission: EssaySubmission): EvidenceSignal[] {
  return prompt.taskType === 'task-1'
    ? extractTask1Evidence(prompt, submission)
    : extractTask2Evidence(prompt, submission);
}
