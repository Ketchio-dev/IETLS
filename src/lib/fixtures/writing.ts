import type { AssessmentReport, WritingPrompt } from '@/lib/domain';

export const samplePrompt: WritingPrompt = {
  id: 'task-2-public-transport',
  title: 'Public transport investment',
  taskType: 'task-2',
  recommendedMinutes: 40,
  suggestedWordCount: 250,
  prompt:
    'Some people believe governments should spend money on improving public transport, while others think building more roads is a better use of public funds. Discuss both views and give your own opinion.',
  planningHints: [
    'State your position early and keep it consistent in both body paragraphs and conclusion.',
    'Use one body paragraph per viewpoint before defending your own judgement.',
    'Include a real-world style example to strengthen Task Response.'
  ],
  rubricFocus: [
    'Clear position with balanced discussion',
    'Logical paragraphing and progression',
    'Precise vocabulary for policy and infrastructure',
    'Mix of complex and accurate sentence forms'
  ],
};

export const sampleAssessmentReport: AssessmentReport = {
  essayId: 'sample-essay-001',
  promptId: samplePrompt.id,
  overallBand: 6.5,
  confidence: 'medium',
  summary:
    'This response addresses both viewpoints and presents a clear opinion, but some examples are underdeveloped and topic sentences could be more precise.',
  estimatedWordCount: 284,
  criterionScores: [
    {
      criterion: 'Task Response',
      band: 6.5,
      rationale: 'Addresses both sides and states an opinion, though support is uneven in the second body paragraph.',
    },
    {
      criterion: 'Coherence & Cohesion',
      band: 6,
      rationale: 'Paragraphing is logical, but linking occasionally sounds mechanical and a few transitions repeat.',
    },
    {
      criterion: 'Lexical Resource',
      band: 7,
      rationale: 'Shows a good range of topic vocabulary, especially around congestion, emissions, and commuter behaviour.',
    },
    {
      criterion: 'Grammatical Range & Accuracy',
      band: 6.5,
      rationale: 'Uses a mix of sentence patterns with minor article and agreement slips that do not block meaning.',
    },
  ],
  evidence: [
    { name: 'Positioning', strength: 'strong', detail: 'Opinion is clear in the introduction and conclusion.' },
    { name: 'Examples', strength: 'developing', detail: 'Only one concrete example is fully explained.' },
    { name: 'Sentence control', strength: 'developing', detail: 'Complex sentences are attempted but punctuation is inconsistent.' },
  ],
  strengths: [
    'Balances benefits of transport investment against road expansion without drifting off topic.',
    'Uses relevant academic vocabulary naturally in most places.',
  ],
  risks: [
    'Second viewpoint paragraph lacks a fully extended example.',
    'Several connectors repeat, which weakens cohesion.'
  ],
  nextSteps: [
    {
      title: 'Upgrade examples',
      description: 'Add one fully developed example with consequence + stakeholder impact in each body paragraph.',
      impact: 'high',
    },
    {
      title: 'Tighten topic sentences',
      description: 'Open each paragraph with a direct claim rather than a general statement.',
      impact: 'medium',
    },
    {
      title: 'Edit for grammar clusters',
      description: 'Review article usage and comma placement after drafting to protect accuracy.',
      impact: 'medium',
    },
  ],
  generatedAt: '2026-03-26T15:00:00.000Z',
};
