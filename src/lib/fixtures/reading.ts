import type { ImportedReadingSet } from '@/lib/services/reading-imports/types';

export const sampleReadingSets: ImportedReadingSet[] = [
  {
    id: 'urban-bee-corridors',
    title: 'Urban bee corridors and rooftop planting',
    sourceLabel: 'Bundled sample drill',
    sourceFile: 'bundled-sample',
    importedAt: '2026-03-26T00:00:00.000Z',
    passageWordCount: 261,
    notes: 'Bundled fallback so the reading drill remains usable before a private bank is imported.',
    passage:
      'A five-year city trial examined whether rooftop planting could support bee populations in dense commercial districts. Researchers compared buildings that added flowering corridors with similar buildings that only installed decorative greenery. The corridor sites were designed so that blooming species appeared in sequence from spring to late autumn, giving pollinators a steadier supply of nectar. Decorative roofs, by contrast, often looked lush for a short period but provided little food once their brief flowering stage ended.\n\nThe trial did not claim that rooftop planting could replace large parks. Instead, the researchers argued that corridors could connect isolated feeding areas and reduce the distance bees needed to travel between them. Bee counts rose most sharply on buildings that combined native flowering plants with shallow water points. Sites that lacked water still attracted insects, but returning visits were less frequent during the hottest months.\n\nThe team also reported a management lesson. Some property owners assumed that low-maintenance roofs would always be best, yet the strongest bee activity was recorded on sites where gardeners removed spent flowers regularly and replaced failed plants quickly. The researchers concluded that urban pollinator schemes succeed when design and maintenance are treated as a single system rather than separate tasks.',
    questions: [
      {
        id: 'urban-bee-corridors-q1',
        type: 'multiple_choice',
        prompt: 'Which statement best reflects the researchers’ position?',
        options: [
          'A. Rooftop planting can replace large city parks for pollinators.',
          'B. Decorative greenery is more efficient than flowering corridors.',
          'C. Rooftop corridors can improve urban pollinator movement when managed carefully.',
          'D. Water points are unnecessary if native plants are provided.',
        ],
        acceptedAnswers: ['C'],
        acceptedVariants: ['C.', 'c'],
        explanation:
          'The passage says corridors cannot replace parks, but they can connect feeding areas and work best when supported by design and maintenance.',
        evidenceHint: 'Paragraphs 2-3',
      },
      {
        id: 'urban-bee-corridors-q2',
        type: 'true_false_not_given',
        prompt: 'The decorative roofs supplied nectar for bees throughout the year.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        acceptedAnswers: ['FALSE'],
        acceptedVariants: ['F'],
        explanation:
          'Decorative roofs only looked lush for a short period and provided little food after that brief flowering stage ended.',
        evidenceHint: 'Paragraph 1',
      },
      {
        id: 'urban-bee-corridors-q3',
        type: 'true_false_not_given',
        prompt: 'The researchers said rooftop corridors were more useful than every form of ground-level habitat.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        acceptedAnswers: ['FALSE'],
        acceptedVariants: ['F'],
        explanation:
          'The passage explicitly says the trial did not claim rooftop planting could replace large parks.',
        evidenceHint: 'Paragraph 2',
      },
      {
        id: 'urban-bee-corridors-q4',
        type: 'sentence_completion',
        prompt: 'Bee counts rose most sharply when native flowering plants were combined with shallow ______ points.',
        options: [],
        acceptedAnswers: ['water'],
        acceptedVariants: ['water points'],
        explanation:
          'The passage says bee counts rose most sharply on buildings that combined native flowering plants with shallow water points.',
        evidenceHint: 'Paragraph 2',
      },
      {
        id: 'urban-bee-corridors-q5',
        type: 'multiple_choice',
        prompt: 'What management lesson did the team report?',
        options: [
          'A. The least expensive roofs always produced the best results.',
          'B. Maintenance mattered as much as initial design.',
          'C. Gardeners should avoid replacing failed plants.',
          'D. Pollinator schemes worked best without human intervention.',
        ],
        acceptedAnswers: ['B'],
        acceptedVariants: ['B.', 'b'],
        explanation:
          'The strongest activity appeared where gardeners maintained and replaced plants promptly; design and maintenance had to work together.',
        evidenceHint: 'Paragraph 3',
      },
      {
        id: 'urban-bee-corridors-q6',
        type: 'sentence_completion',
        prompt:
          'The researchers concluded that urban pollinator schemes succeed when design and maintenance are treated as a single ______.',
        options: [],
        acceptedAnswers: ['system'],
        acceptedVariants: ['single system'],
        explanation:
          'The final sentence says design and maintenance should be treated as a single system.',
        evidenceHint: 'Paragraph 3',
      },
    ],
  },
];
