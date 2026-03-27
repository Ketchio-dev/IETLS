import type { EssaySubmission, WritingPrompt } from '@/lib/domain';
import { buildMockAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

export const writingPromptBank: WritingPrompt[] = [
  {
    id: 'task-1-uk-underground',
    title: 'London Underground station usage',
    taskType: 'task-1',
    questionType: 'Line graph overview',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['passengers', 'station', 'morning', 'afternoon', 'evening', 'peak'],
    prompt:
      'The line graph below shows the number of passengers using a London Underground station at different times of the day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Write a clear overview before describing detailed figures.',
      'Group the busiest and quietest periods instead of listing each number in isolation.',
      'Use comparison language to highlight sharp rises, peaks, and declines.',
    ],
    rubricFocus: [
      'Clear overview of the main trends',
      'Accurate selection of key data points',
      'Useful comparisons across time periods',
      'Controlled trend vocabulary and data language',
    ],
    visual: {
      type: 'line-chart',
      title: 'Passengers at a London Underground station',
      summary: 'Passenger numbers rise sharply in the morning, dip around midday, then climb again in the evening before falling late at night.',
      xAxisLabel: 'Time of day',
      yAxisLabel: 'Number of passengers',
      units: 'passengers',
      keyFeatures: [
        'The highest point appears at 8:00, with another smaller peak at 18:00.',
        'Passenger traffic is lowest at 6:00 and after 22:00.',
        'Numbers remain moderate between late morning and early afternoon.',
      ],
      dataPoints: [
        { label: '06:00', value: '100' },
        { label: '08:00', value: '400', note: 'highest point' },
        { label: '12:00', value: '200' },
        { label: '18:00', value: '380', note: 'evening peak' },
        { label: '22:00', value: '120' },
      ],
    },
  },
  {
    id: 'task-1-australia-water-use',
    title: 'Water use in Australia',
    taskType: 'task-1',
    questionType: 'Table comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['water', 'households', 'industry', 'agriculture', 'litres', 'comparison'],
    prompt:
      'The table below shows water consumption in Australia in 2004 and 2014 for three sectors. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Start with the biggest overall pattern across the two years.',
      'Compare sectors directly instead of describing each row separately.',
      'Mention both the largest user and the clearest increase or decrease.',
    ],
    rubricFocus: [
      'Overview with the most significant comparisons',
      'Accurate reference to years and categories',
      'Clear grouping of similar or contrasting figures',
      'Flexible use of table-reporting language',
    ],
    visual: {
      type: 'table',
      title: 'Water consumption in Australia',
      summary: 'Agriculture remained the largest water user in both years, while household consumption rose and industrial use fell slightly.',
      xAxisLabel: 'Sector',
      yAxisLabel: 'Water use',
      units: 'billions of litres',
      keyFeatures: [
        'Agriculture used far more water than the other sectors in both years.',
        'Household use increased from 12 to 16 billion litres.',
        'Industrial consumption slipped from 9 to 8 billion litres.',
      ],
      dataPoints: [
        { label: 'Agriculture (2004)', value: '58' },
        { label: 'Agriculture (2014)', value: '61' },
        { label: 'Households (2004)', value: '12' },
        { label: 'Households (2014)', value: '16' },
        { label: 'Industry (2014)', value: '8', note: 'lowest figure' },
      ],
    },
  },
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

export const samplePrompt: WritingPrompt = writingPromptBank.find((prompt) => prompt.taskType === 'task-2') ?? writingPromptBank[0];
export const sampleTask1Prompt: WritingPrompt = writingPromptBank.find((prompt) => prompt.taskType === 'task-1') ?? writingPromptBank[0];

export const sampleResponsesByPromptId: Record<string, string> = {
  'task-1-uk-underground': `The line graph illustrates how many passengers used a London Underground station at different times of the day.

Overall, the station is busiest during the morning rush hour, and there is a second but slightly lower peak in the early evening. By contrast, usage is lowest at the start and end of the day.

At 6:00, only about 100 people use the station, but this figure rises rapidly to around 200 at 7:00 and then reaches a peak of roughly 400 at 8:00. After that, the number falls steadily to approximately 180 by 10:00 before recovering slightly to about 200 at midday.

In the afternoon, passenger numbers remain fairly moderate, fluctuating between about 220 and 300. They then climb again to nearly 380 at 18:00, which is the second highest point on the graph, before dropping sharply to around 120 by 22:00. Overall, the most noticeable features are the dramatic morning surge, the smaller evening rebound, and the relatively quiet periods at both ends of the day.`,
  'task-1-australia-water-use': `The table compares the amount of water used in Australia by households, industry and agriculture in 2004 and 2014.

Overall, agriculture was by far the largest consumer of water in both years. Household consumption increased over the period, whereas industrial use declined slightly.

In 2004, agriculture used 58 billion litres of water, compared with 12 billion litres for households and 9 billion litres for industry. Ten years later, agricultural consumption had risen modestly to 61 billion litres.

By contrast, household use climbed by 4 billion litres, from 12 to 16 billion litres, making it the sector with the most noticeable increase. Industrial demand moved in the opposite direction, slipping from 9 to 8 billion litres, which was the lowest figure shown in 2014. This means agriculture remained dominant throughout, while the clearest change was the growth in household demand.`,
  'task-2-public-transport': `In my opinion, governments should prioritise public transport because buses, rail systems, and metro networks can move large numbers of people more efficiently than private cars, although targeted road upgrades still matter in some places.

On the one hand, supporters of new roads argue that drivers, freight operators, and emergency services need faster routes because economic activity slows when congestion becomes severe. This point is partly convincing in regions where outdated highways are unsafe or where growing suburbs have very limited connections. Better roads can also reduce delays for goods moving between ports, warehouses, and shops, which helps the wider economy.

However, expanding road capacity alone rarely solves congestion for long because additional space quickly attracts more vehicles. In large cities, this means traffic often returns to previous levels after a short period, while pollution, noise, and land use pressures continue to rise. As a result, road building can become an expensive short-term response rather than a durable solution.

On the other hand, investment in rail, bus, and metro systems can move more commuters at lower environmental cost. For example, when a city subsidises reliable buses, protects station access, and integrates ticketing across different modes, workers are more willing to leave their cars at home. Employers also benefit because staff can arrive more predictably, and low-income households gain better access to jobs, schools, and healthcare.

Overall, I believe transport budgets should focus mainly on public systems while reserving targeted road spending for safety bottlenecks, freight corridors, and remote communities. This balance produces broader economic and environmental benefits over time than simply building more roads.`,
  'task-2-online-education': `Although online education has improved rapidly, I do not believe it is a complete replacement for classroom learning.

The main strength of online learning is access. Students in remote areas can watch recorded lessons, join virtual discussions, and learn from teachers they would never meet locally. This flexibility also helps working adults continue their education without leaving their jobs, and it often reduces transport and accommodation costs. In addition, online platforms can store lectures, quizzes, and feedback in one place, allowing learners to revisit difficult topics at their own pace.

However, classrooms still offer advantages that digital platforms struggle to match. In face-to-face lessons, teachers can adjust explanations immediately, notice confusion, and build discipline through direct interaction. Younger learners in particular often need structure, peer contact, and quick encouragement to stay motivated. Group work, laboratory tasks, and spontaneous discussion are also easier to manage in person, which means some important social and practical skills are developed more naturally in a classroom setting.

Another weakness of online education is inequality in home learning conditions. Not every student has a quiet place to study, a stable internet connection, or suitable devices. Even when technology is available, long periods in front of a screen can reduce concentration and make learners feel isolated from teachers and classmates.

Overall, I partly agree that online education is a powerful alternative, but I disagree that it is generally better. In most cases, it works best as a supplement rather than a total substitute for classroom teaching because convenience alone does not guarantee deeper learning.`,
  'task-2-young-people-abroad': `In my view, the advantages of young people going abroad for study or work generally outweigh the disadvantages, although the trend can create social costs.

The biggest benefit is personal and professional development. Students who study overseas often gain better language ability, wider cultural awareness, and access to stronger academic institutions. Similarly, young employees working abroad can earn higher salaries, build international networks, and develop skills that may later benefit their home countries. Exposure to different working cultures can also increase independence, adaptability, and confidence, all of which are valuable in modern labour markets.

There are wider economic benefits as well. People who study or work abroad often send money home, support relatives financially, or return with experience that can improve local businesses and public services. Even those who stay overseas may create business links between countries or help others from their community find educational and professional opportunities.

On the negative side, migration can cause family separation and brain drain. When many talented graduates leave poorer countries, local industries and public services may struggle to retain qualified staff. In addition, some young people face loneliness, discrimination, or financial pressure when adapting to unfamiliar societies. If they fail to integrate successfully, the experience can become stressful rather than rewarding.

Despite these problems, I believe the long-term gains are greater. Individuals usually return with broader experience, and even those who remain abroad often contribute knowledge, investment, and international connections across borders. For these reasons, the advantages of the trend generally outweigh the disadvantages.`,
};

export const sampleResponse = sampleResponsesByPromptId[samplePrompt.id];

export function getSampleResponse(promptId: string) {
  return sampleResponsesByPromptId[promptId] ?? '';
}

export const sampleSubmission: EssaySubmission = {
  promptId: samplePrompt.id,
  taskType: samplePrompt.taskType,
  response: sampleResponse,
  timeSpentMinutes: 32,
};

function buildSeedReport(prompt: WritingPrompt, response: string, suffix: string) {
  const submissionRecord = {
    ...createSubmissionRecord({
      promptId: prompt.id,
      taskType: prompt.taskType,
      response,
      timeSpentMinutes: prompt.taskType === 'task-1' ? 18 : 32,
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
