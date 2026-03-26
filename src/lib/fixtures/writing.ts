import type { EssaySubmission, WritingPrompt } from '@/lib/domain';
import { buildMockAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

export const writingPromptBank: WritingPrompt[] = [
  {
    id: 'task-2-public-transport',
    title: 'Public transport investment',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['public', 'transport', 'roads', 'government', 'funds', 'congestion'],
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
  },
  {
    id: 'task-2-online-education',
    title: 'Online education versus classroom learning',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['online', 'education', 'students', 'teachers', 'classroom', 'learning'],
    prompt:
      'Some people think online education is now a better alternative to classroom learning. To what extent do you agree or disagree?',
    planningHints: [
      'Choose a clear extent of agreement and keep it visible throughout the essay.',
      'Use one body paragraph for your strongest reason and another for limits or counterpoints.',
      'Support claims with concrete examples about students, teachers, or access.',
    ],
    rubricFocus: [
      'Directly answer “to what extent”',
      'Sustain a clear line of argument',
      'Use precise education-related vocabulary',
      'Control complex contrast structures',
    ],
  },
  {
    id: 'task-2-young-people-abroad',
    title: 'Young people moving abroad',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['young', 'people', 'abroad', 'countries', 'work', 'study'],
    prompt:
      'An increasing number of young people are leaving their home countries to work or study abroad. Do the advantages of this trend outweigh the disadvantages?',
    planningHints: [
      'Compare both sides, but make the final judgement unmistakable.',
      'Group economic, educational, and social impacts rather than listing random points.',
      'Use a concluding sentence that clearly states whether advantages outweigh disadvantages.',
    ],
    rubricFocus: [
      'Clear judgement on both sides',
      'Well-grouped ideas with disciplined paragraphing',
      'Specific migration, study, and career vocabulary',
      'Accurate comparison language',
    ],
  },
];

export const samplePrompt: WritingPrompt = writingPromptBank[0];

export const sampleResponsesByPromptId: Record<string, string> = {
  'task-2-public-transport': `In my opinion, governments should prioritise public transport, although road upgrades still matter in specific regions.

On the one hand, supporters of new roads argue that drivers and delivery services need faster routes because economic activity slows when congestion becomes severe. However, expanding roads alone often creates extra demand from private cars, which means traffic soon returns.

On the other hand, investment in rail, bus, and metro systems can move more commuters at lower environmental cost. For example, when a city subsidises reliable buses and protected station access, workers are more willing to leave their cars at home and employers face fewer delays.

Overall, I believe transport budgets should focus mainly on public systems while reserving targeted road spending for safety bottlenecks.`,
  'task-2-online-education': `Although online education has improved rapidly, I do not believe it is a complete replacement for classroom learning.

The main strength of online learning is access. Students in remote areas can watch recorded lessons, join virtual discussions, and learn from teachers they would never meet locally. This flexibility also helps working adults continue their education without leaving their jobs.

However, classrooms still offer advantages that digital platforms struggle to match. In face-to-face lessons, teachers can adjust explanations immediately, monitor whether students are confused, and build discipline through direct interaction. Younger learners in particular often need structure, peer contact, and quick feedback to stay motivated.

Overall, I partly agree that online education is a powerful alternative, but I disagree that it is generally better. In most cases, it works best as a supplement rather than a total substitute for classroom teaching.`,
  'task-2-young-people-abroad': `In my view, the advantages of young people going abroad for study or work generally outweigh the disadvantages, although the trend can create social costs.

The biggest benefit is personal and professional development. Students who study overseas often gain better language ability, wider cultural awareness, and access to stronger academic institutions. Similarly, young employees working abroad can earn higher salaries, build international networks, and develop skills that may later benefit their home countries.

On the negative side, migration can cause family separation and brain drain. When many talented graduates leave poorer countries, local industries and public services may struggle to retain qualified staff. In addition, some young people face loneliness or financial pressure when adapting to unfamiliar societies.

Despite these problems, I believe the long-term gains are greater. Individuals usually return with broader experience, and even those who remain abroad often support relatives financially or contribute knowledge across borders.`,
};

export const sampleResponse = sampleResponsesByPromptId[samplePrompt.id];

export function getSampleResponse(promptId: string) {
  return sampleResponsesByPromptId[promptId] ?? '';
}

export const sampleSubmission: EssaySubmission = {
  promptId: samplePrompt.id,
  response: sampleResponse,
  timeSpentMinutes: 32,
};

function buildSeedReport(prompt: WritingPrompt, response: string, suffix: string) {
  const submissionRecord = {
    ...createSubmissionRecord({
      promptId: prompt.id,
      response,
      timeSpentMinutes: 32,
    }),
    submissionId: `sample-submission-${suffix}`,
    createdAt: '2026-03-26T15:00:00.000Z',
  };

  return {
    ...buildMockAssessmentReport(prompt, submissionRecord),
    reportId: `sample-report-${suffix}`,
    essayId: submissionRecord.submissionId,
    generatedAt: '2026-03-26T15:00:00.000Z',
  };
}

export const sampleAssessmentReportsByPromptId = Object.fromEntries(
  writingPromptBank.map((prompt, index) => [
    prompt.id,
    buildSeedReport(prompt, getSampleResponse(prompt.id), String(index + 1).padStart(3, '0')),
  ]),
);

export const sampleAssessmentReport = sampleAssessmentReportsByPromptId[samplePrompt.id];
