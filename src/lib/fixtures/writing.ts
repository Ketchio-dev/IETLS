import type { EssaySubmission, WritingPrompt } from '@/lib/domain';
import { buildAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

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
    'Include a real-world style example to strengthen Task Response.',
  ],
  rubricFocus: [
    'Clear position with balanced discussion',
    'Logical paragraphing and progression',
    'Precise vocabulary for policy and infrastructure',
    'Mix of complex and accurate sentence forms',
  ],
};

export const sampleResponse = `In my opinion, governments should prioritise public transport, although road upgrades still matter in specific regions.

On the one hand, supporters of new roads argue that drivers and delivery services need faster routes because economic activity slows when congestion becomes severe. However, expanding roads alone often creates extra demand from private cars, which means traffic soon returns.

On the other hand, investment in rail, bus, and metro systems can move more commuters at lower environmental cost. For example, when a city subsidises reliable buses and protected station access, workers are more willing to leave their cars at home and employers face fewer delays.

Overall, I believe transport budgets should focus mainly on public systems while reserving targeted road spending for safety bottlenecks.`;

export const sampleSubmission: EssaySubmission = {
  promptId: samplePrompt.id,
  response: sampleResponse,
  timeSpentMinutes: 32,
};

const seedSubmissionRecord = {
  ...createSubmissionRecord(sampleSubmission),
  submissionId: 'sample-submission-001',
  createdAt: '2026-03-26T15:00:00.000Z',
};

export const sampleAssessmentReport = {
  ...buildAssessmentReport(samplePrompt, seedSubmissionRecord),
  reportId: 'sample-report-001',
  essayId: seedSubmissionRecord.submissionId,
  generatedAt: '2026-03-26T15:00:00.000Z',
};
