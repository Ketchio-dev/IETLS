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
      summary:
        'Passenger numbers rise sharply in the morning, dip around midday, then climb again in the evening before falling late at night.',
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
      summary:
        'Agriculture remained the largest water user in both years, while household consumption rose and industrial use fell slightly.',
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
    id: 'task-1-library-visitors-weekdays',
    title: 'City library visitors by weekday',
    taskType: 'task-1',
    questionType: 'Bar chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['library', 'visitors', 'weekday', 'friday', 'comparison', 'students'],
    prompt:
      'The bar chart below compares the number of visitors to a city library on five weekdays. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Identify the busiest and quietest days before describing figures.',
      'Group similar days together instead of treating every bar equally.',
      'Use comparative language to highlight the end-of-week pattern.',
    ],
    rubricFocus: [
      'Overview with the strongest weekday pattern',
      'Accurate comparisons between the bars',
      'Clear reference to highs, lows, and mid-range days',
      'Controlled bar-chart vocabulary',
    ],
    visual: {
      type: 'bar-chart',
      title: 'City library visitors by weekday',
      summary:
        'Visitor numbers rise through the week, peak on Friday, and remain noticeably lower at the beginning of the week.',
      xAxisLabel: 'Weekday',
      yAxisLabel: 'Visitors',
      units: 'people',
      keyFeatures: [
        'Friday records the highest visitor total.',
        'Monday is the quietest day.',
        'Midweek figures climb steadily rather than jumping sharply.',
      ],
      dataPoints: [
        { label: 'Mon', value: '180' },
        { label: 'Tue', value: '220' },
        { label: 'Wed', value: '260' },
        { label: 'Thu', value: '290' },
        { label: 'Fri', value: '340', note: 'highest day' },
      ],
    },
  },
  {
    id: 'task-1-household-energy-sources',
    title: 'Household energy use by source',
    taskType: 'task-1',
    questionType: 'Pie chart overview',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['energy', 'gas', 'electricity', 'solar', 'share', 'household'],
    prompt:
      'The pie chart below shows the proportion of household energy use coming from five sources in one country. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Start with the dominant source and the smallest shares.',
      'Group the minor sources together if they are relatively close.',
      'Use proportions or percentages to compare the main segments.',
    ],
    rubricFocus: [
      'Overview with the dominant and minor shares',
      'Useful grouping of related segments',
      'Accurate description of proportions',
      'Controlled pie-chart language',
    ],
    visual: {
      type: 'pie-chart',
      title: 'Household energy use by source',
      summary:
        'Gas and electricity account for most household energy use, while solar and biomass contribute only small shares.',
      units: '%',
      keyFeatures: [
        'Gas forms the largest slice of the chart.',
        'Electricity is the second biggest source.',
        'Solar and biomass together remain well below one quarter.',
      ],
      dataPoints: [
        { label: 'Gas', value: '42' },
        { label: 'Electricity', value: '31' },
        { label: 'Oil', value: '14' },
        { label: 'Solar', value: '8' },
        { label: 'Biomass', value: '5', note: 'smallest share' },
      ],
    },
  },
  {
    id: 'task-1-commuter-costs-punctuality',
    title: 'Commuter cost and punctuality',
    taskType: 'task-1',
    questionType: 'Mixed chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['commute', 'cost', 'punctuality', 'bus', 'train', 'transport'],
    prompt:
      'The charts below show average weekly commuting costs for four transport modes and the percentage of on-time arrivals for the same modes. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Explain the most expensive and least reliable options clearly in the overview.',
      'Compare cost and punctuality together instead of describing them as unrelated figures.',
      'Highlight any mode that performs well on one measure but poorly on the other.',
    ],
    rubricFocus: [
      'Overview connecting both measures',
      'Accurate ranking across transport modes',
      'Balanced coverage of cost and punctuality',
      'Clear comparison language for mixed visuals',
    ],
    visual: {
      type: 'mixed',
      title: 'Average weekly commuting costs and punctuality',
      summary:
        'Train travel is the most expensive option, while metro services are the most punctual. Buses are comparatively cheap but less reliable.',
      xAxisLabel: 'Transport mode',
      yAxisLabel: 'Weekly cost / on-time rate',
      units: 'dollars / %',
      keyFeatures: [
        'Train has the highest weekly cost.',
        'Metro records the strongest on-time performance.',
        'Bus is among the cheaper options but has the weakest punctuality figure.',
      ],
      dataPoints: [
        { label: 'Bus', value: '32', note: '78% on time' },
        { label: 'Metro', value: '48', note: '94% on time' },
        { label: 'Train', value: '61', note: '88% on time' },
        { label: 'Car share', value: '54', note: '83% on time' },
      ],
    },
  },
  {
    id: 'task-1-coffee-sales-quarterly',
    title: 'Coffee shop sales by quarter',
    taskType: 'task-1',
    questionType: 'Line graph comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['coffee', 'sales', 'quarter', 'spring', 'winter', 'trend'],
    prompt:
      'The line graph below shows quarterly sales for a coffee shop chain over one year. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Describe the broad movement across the year before giving numbers.',
      'Identify whether sales rise steadily or fluctuate.',
      'Note the highest and lowest quarter explicitly.',
    ],
    rubricFocus: [
      'Overview of the yearly sales direction',
      'Accurate description of key turning points',
      'Useful comparisons between quarters',
      'Controlled trend and sales vocabulary',
    ],
    visual: {
      type: 'line-chart',
      title: 'Quarterly sales for a coffee shop chain',
      summary:
        'Sales rise from the first quarter to the third before dropping modestly at the end of the year.',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Sales revenue',
      units: 'thousand dollars',
      keyFeatures: [
        'Q3 records the peak revenue.',
        'Q1 is the weakest quarter.',
        'The final quarter falls back slightly after the annual high.',
      ],
      dataPoints: [
        { label: 'Q1', value: '72' },
        { label: 'Q2', value: '88' },
        { label: 'Q3', value: '101', note: 'peak' },
        { label: 'Q4', value: '94' },
      ],
    },
  },
  {
    id: 'task-1-household-spending-breakdown',
    title: 'Household spending breakdown',
    taskType: 'task-1',
    questionType: 'Pie chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['spending', 'housing', 'food', 'transport', 'share', 'budget'],
    prompt:
      'The pie chart below illustrates how an average household budget is divided among six spending categories. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Mention the largest budget category early.',
      'Group the middle-sized categories together where possible.',
      'Comment on the gap between essential and smaller discretionary items.',
    ],
    rubricFocus: [
      'Overview of dominant and minor categories',
      'Accurate percentage comparisons',
      'Logical grouping of related items',
      'Controlled pie-chart reporting language',
    ],
    visual: {
      type: 'pie-chart',
      title: 'Average household budget by category',
      summary:
        'Housing accounts for the largest share of spending, while entertainment and clothing take relatively small proportions.',
      units: '%',
      keyFeatures: [
        'Housing is clearly the biggest category.',
        'Food and transport together represent a substantial secondary share.',
        'Clothing is the smallest item in the budget.',
      ],
      dataPoints: [
        { label: 'Housing', value: '34' },
        { label: 'Food', value: '22' },
        { label: 'Transport', value: '16' },
        { label: 'Utilities', value: '11' },
        { label: 'Entertainment', value: '10' },
        { label: 'Clothing', value: '7', note: 'smallest share' },
      ],
    },
  },
  {
    id: 'task-1-youth-sports-participation',
    title: 'Youth sports participation',
    taskType: 'task-1',
    questionType: 'Bar chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['sports', 'teenagers', 'participation', 'swimming', 'football', 'comparison'],
    prompt:
      'The bar chart below compares the percentage of teenagers taking part in six sports in one city. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Pick out the most popular and least popular sports in the overview.',
      'Group similar participation rates together.',
      'Avoid listing six separate sentences without comparison.',
    ],
    rubricFocus: [
      'Overview of ranking across sports',
      'Accurate comparison of participation levels',
      'Clear grouping of similar figures',
      'Concise bar-chart reporting',
    ],
    visual: {
      type: 'bar-chart',
      title: 'Teenage participation in sports',
      summary:
        'Football and swimming are the most popular activities, while tennis and gymnastics attract the smallest shares of teenagers.',
      xAxisLabel: 'Sport',
      yAxisLabel: 'Teenagers participating',
      units: '%',
      keyFeatures: [
        'Football leads the chart.',
        'Swimming is slightly lower than football but clearly ahead of the other sports.',
        'Gymnastics records the lowest participation rate.',
      ],
      dataPoints: [
        { label: 'Football', value: '46' },
        { label: 'Swimming', value: '41' },
        { label: 'Basketball', value: '33' },
        { label: 'Running', value: '29' },
        { label: 'Tennis', value: '18' },
        { label: 'Gymnastics', value: '14', note: 'lowest share' },
      ],
    },
  },
  {
    id: 'task-1-renewable-energy-region-output',
    title: 'Renewable energy output by region',
    taskType: 'task-1',
    questionType: 'Line graph comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['renewable energy', 'region', 'electricity', 'trend', 'growth', 'comparison'],
    prompt:
      'The line graph below shows the amount of electricity generated from renewable sources in three regions between 2012 and 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Identify the fastest-growing region in the overview.',
      'Compare the starting and ending positions instead of listing every year.',
      'Highlight whether any region remains stable while the others change.',
    ],
    rubricFocus: [
      'Clear overview of the main trends',
      'Accurate cross-region comparison',
      'Selective use of key figures',
      'Controlled trend language',
    ],
    visual: {
      type: 'line-chart',
      title: 'Renewable electricity generation by region',
      summary:
        'All three regions increase their renewable output overall, but the northern region grows much faster and finishes well ahead of the others.',
      xAxisLabel: 'Year',
      yAxisLabel: 'Electricity generated',
      units: 'gigawatt hours',
      keyFeatures: [
        'The northern region records the sharpest growth across the period.',
        'The central region rises more steadily.',
        'The coastal region remains the lowest producer despite gradual gains.',
      ],
      dataPoints: [
        { label: 'North (2012)', value: '24' },
        { label: 'North (2022)', value: '68', note: 'strongest growth' },
        { label: 'Central (2022)', value: '49' },
        { label: 'Coast (2022)', value: '36', note: 'lowest final figure' },
      ],
    },
  },
  {
    id: 'task-1-university-graduates-subject-table',
    title: 'University graduates by subject',
    taskType: 'task-1',
    questionType: 'Table comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['university', 'graduates', 'subject', 'engineering', 'arts', 'comparison'],
    prompt:
      'The table below gives the number of university graduates in five subject areas in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Begin with the broadest changes over the decade.',
      'Compare subjects directly rather than describing each year separately.',
      'Point out the largest subject and the clearest rise or fall.',
    ],
    rubricFocus: [
      'Overview covering the most notable changes',
      'Accurate comparison of categories and years',
      'Useful grouping of similar movements',
      'Controlled table-reporting language',
    ],
    visual: {
      type: 'table',
      title: 'University graduates in five subject areas',
      summary:
        'Business and engineering expand over the decade, while arts declines slightly. Business remains the largest field in both years.',
      xAxisLabel: 'Subject',
      yAxisLabel: 'Graduates',
      units: 'students',
      keyFeatures: [
        'Business has the highest number of graduates in both years.',
        'Engineering shows the largest increase.',
        'Arts is the only subject to fall slightly.',
      ],
      dataPoints: [
        { label: 'Business (2010)', value: '3,400' },
        { label: 'Business (2020)', value: '4,100' },
        { label: 'Engineering (2020)', value: '3,300', note: 'largest rise' },
        { label: 'Arts (2020)', value: '1,950', note: 'slight decline' },
      ],
    },
  },
  {
    id: 'task-1-recycling-materials-town',
    title: 'Recycling rates by material',
    taskType: 'task-1',
    questionType: 'Bar chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['recycling', 'plastic', 'glass', 'paper', 'metal', 'rates'],
    prompt:
      'The bar chart below compares the percentage of four materials recycled in one town in 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Show the overall direction of change first.',
      'Group materials with similar recycling rates together.',
      'Mention the best-performing and weakest categories clearly.',
    ],
    rubricFocus: [
      'Overview of broad changes',
      'Accurate comparison across materials and years',
      'Selective emphasis on key highs and lows',
      'Controlled bar-chart vocabulary',
    ],
    visual: {
      type: 'bar-chart',
      title: 'Recycling rates in one town',
      summary:
        'Recycling increases for every material, with paper and glass remaining ahead of plastic and metal in both years.',
      xAxisLabel: 'Material',
      yAxisLabel: 'Recycled',
      units: '%',
      keyFeatures: [
        'Paper records the highest recycling rate in both years.',
        'Plastic remains the least recycled material despite improvement.',
        'All categories show upward movement by 2025.',
      ],
      dataPoints: [
        { label: 'Paper (2015)', value: '58' },
        { label: 'Paper (2025)', value: '74', note: 'highest rate' },
        { label: 'Glass (2025)', value: '69' },
        { label: 'Plastic (2025)', value: '41', note: 'lowest rate' },
      ],
    },
  },
  {
    id: 'task-1-bike-sharing-monthly-trips',
    title: 'Monthly bike-sharing trips',
    taskType: 'task-1',
    questionType: 'Line graph overview',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['bike-sharing', 'monthly', 'trips', 'summer', 'winter', 'usage'],
    prompt:
      'The line graph below shows the number of bike-sharing trips made in a city during each month of one year. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Describe the seasonal pattern in the overview.',
      'Emphasise the highest and lowest months clearly.',
      'Avoid listing all twelve months one by one.',
    ],
    rubricFocus: [
      'Clear seasonal overview',
      'Accurate description of peaks and troughs',
      'Logical grouping of months',
      'Controlled trend language',
    ],
    visual: {
      type: 'line-chart',
      title: 'Bike-sharing trips over one year',
      summary:
        'Usage is lowest in winter, rises steadily through spring, peaks in midsummer, and then declines towards the end of the year.',
      xAxisLabel: 'Month',
      yAxisLabel: 'Trips',
      units: 'thousands',
      keyFeatures: [
        'The highest level occurs in July.',
        'January records the lowest number of trips.',
        'Demand falls again after the summer peak.',
      ],
      dataPoints: [
        { label: 'Jan', value: '18' },
        { label: 'Apr', value: '36' },
        { label: 'Jul', value: '63', note: 'peak' },
        { label: 'Oct', value: '42' },
        { label: 'Dec', value: '21' },
      ],
    },
  },
  {
    id: 'task-1-hotel-occupancy-seasons',
    title: 'Hotel occupancy by season',
    taskType: 'task-1',
    questionType: 'Bar chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['hotel', 'occupancy', 'season', 'coastal', 'mountain', 'city'],
    prompt:
      'The bar chart below compares hotel occupancy rates in three tourist areas across the four seasons of one year. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Highlight the strongest seasonal contrasts in the overview.',
      'Compare locations within each season where useful.',
      'Point out any area that remains relatively stable throughout the year.',
    ],
    rubricFocus: [
      'Overview showing the main seasonal pattern',
      'Accurate area-to-area comparison',
      'Logical grouping of seasonal data',
      'Controlled tourism and percentage language',
    ],
    visual: {
      type: 'bar-chart',
      title: 'Hotel occupancy across three tourist areas',
      summary:
        'Coastal hotels perform best in summer, mountain hotels peak in winter, and city hotels remain comparatively stable across the year.',
      xAxisLabel: 'Season',
      yAxisLabel: 'Occupancy rate',
      units: '%',
      keyFeatures: [
        'The coast records the highest summer occupancy.',
        'Mountain hotels show the strongest winter performance.',
        'City hotels fluctuate less than the other two areas.',
      ],
      dataPoints: [
        { label: 'Coast (summer)', value: '88', note: 'highest seasonal figure' },
        { label: 'Mountain (winter)', value: '79' },
        { label: 'City (spring)', value: '68' },
        { label: 'City (autumn)', value: '66', note: 'stable pattern' },
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
  {
    id: 'task-2-remote-work-productivity',
    title: 'Remote work and productivity',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['remote', 'work', 'productivity', 'employees', 'office', 'flexibility'],
    prompt:
      'Many companies now allow employees to work from home for part or all of the week. Some people believe this improves productivity, while others think it reduces the quality of work. To what extent do you agree or disagree?',
    planningHints: [
      'Take a clear position on overall productivity, not just convenience.',
      'Use one body paragraph for the strongest benefit and another for the main limitation.',
      'Support the argument with workplace examples rather than vague claims.',
    ],
    rubricFocus: [
      'Direct response to the extent question',
      'Clear cause-and-effect reasoning',
      'Precise workplace vocabulary',
      'Controlled concession structures',
    ],
  },
  {
    id: 'task-2-libraries-digital-budget',
    title: 'Library funding priorities',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['libraries', 'digital', 'books', 'budget', 'community', 'services'],
    prompt:
      'Some people think public libraries should spend most of their budgets on digital services, while others believe printed books and study spaces should remain the main priority. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain each funding priority fairly before stating your judgement.',
      'Show how community needs differ for technology, books, and quiet study space.',
      'Keep your conclusion consistent with the position in the introduction.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear final position',
      'Logical paragraph separation by viewpoint',
      'Topic-specific civic and education vocabulary',
      'Controlled contrast and evaluation language',
    ],
  },
  {
    id: 'task-2-advertising-to-children',
    title: 'Advertising aimed at children',
    taskType: 'task-2',
    questionType: 'Problem / solution',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['advertising', 'children', 'products', 'parents', 'regulation', 'media'],
    prompt:
      'Advertising aimed at children has become more common on television, websites, and mobile apps. What problems can this cause, and what measures could reduce these problems?',
    planningHints: [
      'Make sure you cover both the problems and the solutions in balanced depth.',
      'Link each solution to a specific problem instead of listing separate ideas.',
      'Use concrete examples involving parents, schools, or regulators.',
    ],
    rubricFocus: [
      'Full coverage of both question parts',
      'Clear problem-to-solution progression',
      'Specific regulation and consumer vocabulary',
      'Accurate explanation of effects and remedies',
    ],
  },
  {
    id: 'task-2-gap-year-before-university',
    title: 'Taking a gap year before university',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['gap year', 'university', 'travel', 'experience', 'students', 'career'],
    prompt:
      'Some students choose to take a year off between school and university to travel or work. Do the advantages of this decision outweigh the disadvantages?',
    planningHints: [
      'Give a clear overall judgement instead of ending with a neutral summary.',
      'Compare academic, financial, and personal-development impacts.',
      'Use examples that show both short-term and long-term effects.',
    ],
    rubricFocus: [
      'Clear judgement across both sides',
      'Balanced organisation of benefits and drawbacks',
      'Precise study, travel, and career vocabulary',
      'Accurate evaluative language',
    ],
  },
  {
    id: 'task-2-environment-individuals-governments',
    title: 'Who should solve environmental problems?',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['environment', 'governments', 'individuals', 'policy', 'behaviour', 'pollution'],
    prompt:
      'Some people argue that environmental problems can only be solved by governments and large companies, while others believe individuals can make a real difference through their daily choices. Discuss both views and give your own opinion.',
    planningHints: [
      'Present both levels of responsibility clearly before deciding which matters more.',
      'Use examples from policy and personal behaviour.',
      'Avoid treating individual action and public policy as completely unrelated.',
    ],
    rubricFocus: [
      'Balanced discussion with a defended position',
      'Clear paragraph focus on each level of responsibility',
      'Precise environmental-policy vocabulary',
      'Controlled reasoning and comparison',
    ],
  },
  {
    id: 'task-2-team-sports-in-school',
    title: 'Team sports as a school requirement',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['team sports', 'schools', 'students', 'discipline', 'health', 'requirement'],
    prompt:
      'Some people believe all secondary school students should be required to take part in team sports. To what extent do you agree or disagree?',
    planningHints: [
      'Answer the question about compulsion, not just whether sport is beneficial.',
      'Consider both physical and educational consequences.',
      'Use specific examples involving school timetables, motivation, or inclusion.',
    ],
    rubricFocus: [
      'Direct response to the policy question',
      'Relevant educational and health reasoning',
      'Specific school-related vocabulary',
      'Controlled concession and rebuttal',
    ],
  },
  {
    id: 'task-2-historic-buildings-modern-use',
    title: 'Historic buildings and modern needs',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['historic', 'buildings', 'cities', 'modern', 'development', 'preservation'],
    prompt:
      'In many cities, historic buildings are protected even when large numbers of people need modern housing and office space. Some people think preserving old buildings is more important, while others believe cities should replace them to meet current needs. Discuss both views and give your own opinion.',
    planningHints: [
      'Define the trade-off between heritage and practical urban demand clearly.',
      'Use one paragraph for preservation and one for redevelopment before giving your conclusion.',
      'Support claims with realistic urban examples.',
    ],
    rubricFocus: [
      'Balanced urban-development discussion',
      'Clear position with supported reasoning',
      'Precise heritage and planning vocabulary',
      'Disciplined paragraphing and comparison',
    ],
  },
  {
    id: 'task-2-cashless-society',
    title: 'Moving towards a cashless society',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['cashless', 'payments', 'digital', 'security', 'elderly', 'banking'],
    prompt:
      'Many societies are using cash less often and relying more on card or phone payments. Do the advantages of this trend outweigh the disadvantages?',
    planningHints: [
      'Compare convenience and efficiency with access and security concerns.',
      'Keep the final judgement unmistakable.',
      'Use examples involving shoppers, businesses, or older citizens.',
    ],
    rubricFocus: [
      'Clear overall judgement',
      'Balanced treatment of both benefits and risks',
      'Precise financial-technology vocabulary',
      'Accurate comparison structures',
    ],
  },
  {
    id: 'task-2-art-versus-science-funding',
    title: 'Arts funding versus science funding',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['arts', 'science', 'government', 'funding', 'innovation', 'culture'],
    prompt:
      'Governments with limited budgets must decide how to distribute public money. Some people think scientific research should receive most funding, while others believe the arts deserve equal support. Discuss both views and give your own opinion.',
    planningHints: [
      'Show why each side values public funding before choosing one priority.',
      'Use specific examples from education, healthcare, culture, or tourism.',
      'Keep the conclusion aligned with the reasoning in the body paragraphs.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear final judgement',
      'Logical sequencing of arguments',
      'Topic-specific vocabulary about culture and innovation',
      'Controlled evaluative language',
    ],
  },
  {
    id: 'task-2-public-health-prevention',
    title: 'Preventing illness versus treating it',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['healthcare', 'prevention', 'treatment', 'government', 'hospitals', 'public health'],
    prompt:
      'Some people believe healthcare systems should spend more money on preventing illness through education and early screening, while others think treating patients in hospitals should remain the main priority. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain both immediate treatment needs and long-term prevention benefits.',
      'Avoid presenting prevention and treatment as completely separate systems.',
      'Use examples involving screening, vaccination, or emergency care.',
    ],
    rubricFocus: [
      'Balanced healthcare policy discussion',
      'Clear, supported position',
      'Precise public-health vocabulary',
      'Controlled contrast and causation language',
    ],
  },
  {
    id: 'task-2-city-centre-cars',
    title: 'Restricting cars in city centres',
    taskType: 'task-2',
    questionType: 'Problem / solution',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['city centre', 'cars', 'traffic', 'pollution', 'businesses', 'transport'],
    prompt:
      'Traffic congestion and air pollution are serious problems in many city centres. What problems do private cars create in these areas, and what measures could reduce car dependence?',
    planningHints: [
      'Cover both the problems and the measures in roughly equal detail.',
      'Link each measure to a specific urban problem.',
      'Use examples involving pricing, public transport, or street design.',
    ],
    rubricFocus: [
      'Complete coverage of both question parts',
      'Strong problem-solution organisation',
      'Specific transport and pollution vocabulary',
      'Accurate cause-and-effect reasoning',
    ],
  },
  {
    id: 'task-2-ai-at-workplace',
    title: 'Artificial intelligence in the workplace',
    taskType: 'task-2',
    questionType: 'Two-part question',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['artificial intelligence', 'jobs', 'workplace', 'skills', 'training', 'automation'],
    prompt:
      'Artificial intelligence is being used in more workplaces every year. What benefits can this bring to employers and employees, and what skills will workers need to succeed in the future?',
    planningHints: [
      'Answer both questions fully rather than focusing only on automation.',
      'Separate the benefits and future skills clearly across the essay.',
      'Support the discussion with realistic examples from modern workplaces.',
    ],
    rubricFocus: [
      'Complete response to both questions',
      'Clear paragraph progression',
      'Precise workplace and technology vocabulary',
      'Accurate explanation and exemplification',
    ],
  },
  {
    id: 'task-2-tourist-tax-destinations',
    title: 'Tourist taxes in popular destinations',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['tourism', 'tax', 'visitors', 'destinations', 'infrastructure', 'local residents'],
    prompt:
      'Some popular tourist destinations are considering special taxes for visitors. Some people believe these taxes are necessary to protect local infrastructure and services, while others think they will discourage tourism. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain both the revenue argument and the demand-risk argument clearly.',
      'Use examples involving transport, waste management, or heritage sites.',
      'State a clear final judgement rather than ending neutrally.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear opinion',
      'Logical sequencing of both viewpoints',
      'Specific tourism and public-service vocabulary',
      'Controlled evaluative language',
    ],
  },
  {
    id: 'task-2-children-screen-time',
    title: 'Limiting children’s screen time',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['children', 'screen time', 'parents', 'devices', 'health', 'learning'],
    prompt:
      'Some people think parents should strictly limit the time children spend using phones, tablets, and computers, while others believe digital devices are an essential part of modern childhood. To what extent do you agree or disagree?',
    planningHints: [
      'Answer the extent question directly rather than listing pros and cons without judgement.',
      'Consider educational use separately from entertainment use.',
      'Support claims with realistic family or school examples.',
    ],
    rubricFocus: [
      'Clear position throughout the essay',
      'Relevant reasoning about health and learning',
      'Specific family and technology vocabulary',
      'Controlled concession structures',
    ],
  },
  {
    id: 'task-2-free-university-tuition',
    title: 'Free university education',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['university', 'tuition', 'free education', 'taxpayers', 'access', 'funding'],
    prompt:
      'Some people believe university education should be free for all students, while others think individuals should pay because they benefit personally from a degree. Discuss both views and give your own opinion.',
    planningHints: [
      'Present each funding model fairly before stating your preference.',
      'Use examples involving access, taxes, or labour-market benefits.',
      'Keep your conclusion aligned with the argument in the body paragraphs.',
    ],
    rubricFocus: [
      'Balanced funding discussion with a clear judgement',
      'Logical paragraph progression',
      'Precise education and public-finance vocabulary',
      'Controlled contrast and explanation',
    ],
  },
  {
    id: 'task-2-older-workers-retirement-age',
    title: 'Extending working life',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['retirement age', 'older workers', 'economy', 'experience', 'jobs', 'health'],
    prompt:
      'As people live longer, many governments are raising the retirement age and encouraging older adults to stay in work for more years. Do the advantages of this trend outweigh the disadvantages?',
    planningHints: [
      'Compare economic benefits with health or employment concerns.',
      'Give a clear overall judgement by the end of the essay.',
      'Use examples involving pensions, experience, or younger workers.',
    ],
    rubricFocus: [
      'Clear judgement across both sides',
      'Balanced organisation of benefits and drawbacks',
      'Specific workforce and policy vocabulary',
      'Accurate comparison language',
    ],
  },
  {
    id: 'task-2-zoos-modern-role',
    title: 'The role of zoos today',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['zoos', 'animals', 'conservation', 'education', 'captivity', 'wildlife'],
    prompt:
      'Some people think zoos are no longer necessary in the modern world because animals should live only in the wild, while others believe zoos still play an important role. To what extent do you agree or disagree?',
    planningHints: [
      'Address both conservation and ethical concerns.',
      'Make your degree of agreement unmistakable from the introduction onward.',
      'Support the essay with realistic examples rather than emotional claims alone.',
    ],
    rubricFocus: [
      'Direct response to the extent question',
      'Relevant ethical and conservation reasoning',
      'Specific wildlife and education vocabulary',
      'Controlled argument development',
    ],
  },
  {
    id: 'task-2-local-news-vs-international-news',
    title: 'Local news versus international news',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['news', 'local', 'international', 'media', 'citizens', 'global issues'],
    prompt:
      'Some people think news media should spend more time reporting local stories because they affect people’s daily lives directly, while others believe international news is equally important. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain why each type of news matters before giving your judgement.',
      'Use examples related to public services, elections, trade, or conflict.',
      'Avoid treating the two kinds of reporting as entirely separate.',
    ],
    rubricFocus: [
      'Balanced media discussion with a clear opinion',
      'Logical comparison of both viewpoints',
      'Precise media and civic vocabulary',
      'Controlled evaluative language',
    ],
  },
  {
    id: 'task-2-free-public-transport',
    title: 'Making public transport free',
    taskType: 'task-2',
    questionType: 'Problem / solution',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['public transport', 'free fares', 'traffic', 'funding', 'equity', 'services'],
    prompt:
      'Some cities are considering free public transport for all residents. What problems could this policy create, and what measures could make it successful if introduced?',
    planningHints: [
      'Cover both possible problems and practical solutions in balanced depth.',
      'Link each solution to a specific difficulty such as crowding or funding.',
      'Use realistic examples involving taxes, service frequency, or eligibility.',
    ],
    rubricFocus: [
      'Complete response to both parts of the question',
      'Strong problem-solution structure',
      'Specific transport-policy vocabulary',
      'Accurate explanation of cause and remedy',
    ],
  },
  {
    id: 'task-2-homework-primary-school',
    title: 'Homework for primary school children',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['homework', 'primary school', 'children', 'parents', 'learning', 'stress'],
    prompt:
      'Some people believe children in primary school should not be given homework, while others think homework is essential from an early age. To what extent do you agree or disagree?',
    planningHints: [
      'Focus on whether homework should be assigned, not simply whether study is important.',
      'Compare academic reinforcement with family time and stress.',
      'Use examples involving reading, practice tasks, or teacher expectations.',
    ],
    rubricFocus: [
      'Clear extent of agreement',
      'Relevant reasoning about child development and learning',
      'Specific school and family vocabulary',
      'Controlled argument and concession language',
    ],
  },
  {
    id: 'task-2-urban-parks-vs-housing',
    title: 'Urban parks or more housing?',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['urban parks', 'housing', 'cities', 'public space', 'development', 'health'],
    prompt:
      'In growing cities, some people think unused land should be developed for housing, while others believe it should be kept as parks and public green space. Discuss both views and give your own opinion.',
    planningHints: [
      'Show the tension between housing demand and quality of life clearly.',
      'Use examples involving rent, mental health, or urban heat.',
      'Give a definite opinion rather than simply repeating both sides.',
    ],
    rubricFocus: [
      'Balanced urban-planning discussion',
      'Clear and supported position',
      'Specific city-development vocabulary',
      'Controlled comparison and reasoning',
    ],
  },
  {
    id: 'task-2-self-driving-cars-society',
    title: 'Self-driving cars in society',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['self-driving cars', 'automation', 'safety', 'jobs', 'transport', 'technology'],
    prompt:
      'Driverless cars are expected to become common in the future. Do the advantages of self-driving vehicles outweigh the disadvantages?',
    planningHints: [
      'Compare safety and efficiency benefits with employment or technical concerns.',
      'Keep your final judgement explicit.',
      'Use examples involving freight, commuting, or emergency situations.',
    ],
    rubricFocus: [
      'Clear overall judgement',
      'Balanced treatment of benefits and drawbacks',
      'Specific transport and automation vocabulary',
      'Accurate evaluative language',
    ],
  },
  {
    id: 'task-2-celebrities-role-models',
    title: 'Celebrities as role models',
    taskType: 'task-2',
    questionType: 'Two-part question',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['celebrities', 'role models', 'young people', 'media', 'behaviour', 'influence'],
    prompt:
      'Celebrities are often highly visible in the media and can influence the behaviour of young people. Why does this happen, and is it a positive or negative development?',
    planningHints: [
      'Answer both parts fully: the reason for influence and your judgement of it.',
      'Separate the explanation and evaluation clearly across the essay.',
      'Use realistic examples from sport, entertainment, or social media.',
    ],
    rubricFocus: [
      'Complete response to both questions',
      'Clear explanation before evaluation',
      'Specific media and youth-culture vocabulary',
      'Controlled reasoning and exemplification',
    ],
  },
  {
    id: 'task-2-fast-food-near-schools',
    title: 'Fast-food outlets near schools',
    taskType: 'task-2',
    questionType: 'Problem / solution',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['fast food', 'schools', 'health', 'students', 'business', 'regulation'],
    prompt:
      'In many towns, fast-food restaurants are opening close to schools. What problems can this cause for students and communities, and what measures could be taken to address them?',
    planningHints: [
      'Cover both the community problems and the possible measures.',
      'Link each proposed measure to a specific problem such as diet, traffic, or litter.',
      'Use examples involving schools, local councils, or business rules.',
    ],
    rubricFocus: [
      'Full coverage of both task parts',
      'Clear problem-solution progression',
      'Specific health and local-policy vocabulary',
      'Accurate cause-and-effect explanation',
    ],
  },
  {
    id: 'task-2-public-employees-rural-service',
    title: 'Requiring public workers to serve rural areas',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['rural areas', 'teachers', 'doctors', 'public service', 'staffing', 'government'],
    prompt:
      'Some governments require newly qualified teachers and doctors to work in rural areas for a period of time before choosing where they want to live. To what extent do you agree or disagree with this policy?',
    planningHints: [
      'Address the fairness of the rule as well as the staffing benefits.',
      'Take a clear stance on whether compulsory service is justified.',
      'Use examples involving healthcare access, training, or retention.',
    ],
    rubricFocus: [
      'Direct answer to the extent question',
      'Relevant policy and fairness reasoning',
      'Specific public-service vocabulary',
      'Controlled concession and rebuttal',
    ],
  },
  {
    id: 'task-2-space-exploration-spending',
    title: 'Government spending on space exploration',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['space exploration', 'government spending', 'science', 'poverty', 'technology', 'research'],
    prompt:
      'Some people think governments spend too much money on space exploration when there are still serious problems on Earth, while others believe space research brings important long-term benefits. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain both immediate social needs and long-term scientific gains.',
      'Use concrete examples rather than abstract praise of science.',
      'Keep your opinion consistent from the introduction to the conclusion.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear conclusion',
      'Logical sequencing of competing priorities',
      'Specific science and public-spending vocabulary',
      'Controlled evaluative language',
    ],
  },
  {
    id: 'task-1-rent-prices-city-zones',
    title: 'Average rent in three city zones',
    taskType: 'task-1',
    questionType: 'Table comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['rent', 'city centre', 'suburbs', 'monthly', 'comparison', 'housing'],
    prompt:
      'The table below compares average monthly rent for one-bedroom apartments in three city zones in 2014 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Start with the broadest change over the decade before giving detail.',
      'Compare the three zones directly rather than describing each year in isolation.',
      'Highlight which area remained the most and least expensive throughout.',
    ],
    rubricFocus: [
      'Overview with the clearest decade trend',
      'Accurate comparison across zones and years',
      'Selective use of the most useful figures',
      'Controlled housing and table-reporting language',
    ],
    visual: {
      type: 'table',
      title: 'Average monthly rent for one-bedroom apartments',
      summary:
        'Rent rises in every zone over the decade, with the city centre remaining the most expensive and the outer suburbs staying the cheapest.',
      xAxisLabel: 'Zone',
      yAxisLabel: 'Average rent',
      units: 'dollars per month',
      keyFeatures: [
        'The city centre records the highest rent in both years.',
        'Every zone becomes more expensive by 2024.',
        'The gap between inner and outer areas remains noticeable.',
      ],
      dataPoints: [
        { label: 'City centre (2014)', value: '1,350' },
        { label: 'City centre (2024)', value: '1,980', note: 'highest figure' },
        { label: 'Inner suburbs (2024)', value: '1,540' },
        { label: 'Outer suburbs (2024)', value: '1,120', note: 'lowest figure' },
      ],
    },
  },
  {
    id: 'task-1-museum-visitors-by-month',
    title: 'Museum visitors across one year',
    taskType: 'task-1',
    questionType: 'Line graph comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['museum', 'visitors', 'month', 'tourists', 'summer', 'trend'],
    prompt:
      'The line graph below shows the number of visitors to a history museum in each month of one year. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'Describe the seasonal pattern before mentioning precise figures.',
      'Identify the peak and trough clearly in the overview.',
      'Group months into phases instead of listing all twelve separately.',
    ],
    rubricFocus: [
      'Clear overview of seasonal movement',
      'Accurate description of peaks and lows',
      'Logical grouping of time periods',
      'Controlled trend vocabulary',
    ],
    visual: {
      type: 'line-chart',
      title: 'Monthly visitors to a history museum',
      summary:
        'Visitor numbers rise gradually from winter to summer, peak in August, and then decline towards the end of the year.',
      xAxisLabel: 'Month',
      yAxisLabel: 'Visitors',
      units: 'people',
      keyFeatures: [
        'The lowest figure appears in January.',
        'Numbers increase steadily through spring and early summer.',
        'Attendance drops again after the late-summer peak.',
      ],
      dataPoints: [
        { label: 'Jan', value: '2,400' },
        { label: 'Apr', value: '3,300' },
        { label: 'Aug', value: '5,200', note: 'peak month' },
        { label: 'Oct', value: '4,100' },
        { label: 'Dec', value: '2,700' },
      ],
    },
  },
  {
    id: 'task-1-food-delivery-market-share',
    title: 'Food delivery market share',
    taskType: 'task-1',
    questionType: 'Pie chart comparison',
    recommendedMinutes: 20,
    suggestedWordCount: 150,
    keywordTargets: ['food delivery', 'market share', 'apps', 'restaurants', 'comparison', 'percentage'],
    prompt:
      'The pie charts below show the market share of five food delivery providers in a city in 2018 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    planningHints: [
      'State the biggest overall shift early in the response.',
      'Compare the largest and smallest providers across the two years.',
      'Group the smaller shares together if that makes the comparison clearer.',
    ],
    rubricFocus: [
      'Overview highlighting the main market shift',
      'Accurate comparison of proportions',
      'Clear grouping of larger and smaller shares',
      'Controlled pie-chart language',
    ],
    visual: {
      type: 'pie-chart',
      title: 'Food delivery provider market share',
      summary:
        'QuickDish becomes the market leader by 2024, while smaller providers lose ground and the share of independent restaurant delivery shrinks.',
      units: '%',
      keyFeatures: [
        'QuickDish records the largest share in 2024.',
        'The independent restaurant category becomes smaller over time.',
        'Two minor providers remain below 10% by the end of the period.',
      ],
      dataPoints: [
        { label: 'QuickDish (2018)', value: '24' },
        { label: 'QuickDish (2024)', value: '34', note: 'largest share' },
        { label: 'LocalRunner (2024)', value: '9' },
        { label: 'Independent restaurants (2024)', value: '12' },
      ],
    },
  },
  {
    id: 'task-2-rural-internet-access',
    title: 'Internet access in rural areas',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['internet', 'rural', 'government', 'infrastructure', 'business', 'education'],
    prompt:
      'Some people think governments should spend heavily on fast internet access for rural areas, while others believe this money should be used for transport and hospital services instead. Discuss both views and give your own opinion.',
    planningHints: [
      'Explain both sides fairly before defending your own position.',
      'Use concrete examples about schools, clinics, business, or public services.',
      'Keep the conclusion consistent with the opinion in the introduction.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear judgement',
      'Logical sequencing of social and economic arguments',
      'Precise infrastructure and public-service vocabulary',
      'Controlled complex sentence structures',
    ],
  },
  {
    id: 'task-2-public-exams-pressure',
    title: 'Public exams and student pressure',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['exams', 'students', 'pressure', 'assessment', 'schools', 'learning'],
    prompt:
      'Some people believe that public examinations place too much pressure on school students and should be replaced by continuous assessment. To what extent do you agree or disagree?',
    planningHints: [
      'Answer the extent question directly in the introduction.',
      'Compare reliability, fairness, and pressure across both assessment systems.',
      'Use a real classroom or national-testing example to support your view.',
    ],
    rubricFocus: [
      'Direct response to the extent of agreement',
      'Clear line of argument from start to finish',
      'Specific education and assessment vocabulary',
      'Controlled contrast and concession structures',
    ],
  },
  {
    id: 'task-2-animal-testing-medicine',
    title: 'Animal testing for medical research',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['animal testing', 'medicine', 'research', 'ethics', 'alternatives', 'science'],
    prompt:
      'Some people think the use of animals in medical research is necessary, while others believe it is cruel and should be banned. Discuss both views and give your own opinion.',
    planningHints: [
      'Show that you understand both the ethical and scientific arguments.',
      'Avoid emotional language that replaces analysis.',
      'Make your final position explicit and keep it consistent.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear personal stance',
      'Logical handling of ethical and practical arguments',
      'Precise scientific and moral vocabulary',
      'Controlled evaluative language',
    ],
  },
  {
    id: 'task-2-global-brands-local-culture',
    title: 'Global brands and local culture',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['global brands', 'local culture', 'shops', 'economy', 'identity', 'business'],
    prompt:
      'The spread of global brands is changing the character of towns and cities around the world. Do the advantages of this development outweigh the disadvantages?',
    planningHints: [
      'Compare economic convenience with cultural and commercial drawbacks.',
      'Reach a firm judgement by the conclusion rather than just listing pros and cons.',
      'Use examples about jobs, prices, tourism, or local identity.',
    ],
    rubricFocus: [
      'Clear overall judgement on both sides',
      'Well-grouped advantages and disadvantages',
      'Specific economic and cultural vocabulary',
      'Controlled comparative language',
    ],
  },
  {
    id: 'task-2-foreign-language-primary-school',
    title: 'Foreign languages in primary school',
    taskType: 'task-2',
    questionType: 'Advantages / disadvantages',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['foreign language', 'primary school', 'children', 'learning', 'curriculum', 'advantages'],
    prompt:
      'In many countries, children start learning a foreign language in primary school rather than secondary school. Do the advantages of this policy outweigh the disadvantages?',
    planningHints: [
      'Compare long-term language gains with possible curriculum pressure.',
      'Use examples about confidence, pronunciation, or teacher supply.',
      'State clearly whether the benefits are greater overall.',
    ],
    rubricFocus: [
      'Clear weighing of both sides',
      'Logical progression from benefit to drawback or vice versa',
      'Specific education and language-learning vocabulary',
      'Controlled cause-and-effect language',
    ],
  },
  {
    id: 'task-2-repair-vs-replace',
    title: 'Repairing old items versus buying new ones',
    taskType: 'task-2',
    questionType: 'Problem / solution',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['repair', 'replace', 'consumer goods', 'waste', 'cost', 'solution'],
    prompt:
      'In many countries, people now prefer to buy new products rather than repair old ones. Why is this happening, and what can be done to encourage repair?',
    planningHints: [
      'Separate the causes from the solutions clearly across paragraphs.',
      'Use examples about electronics, clothing, appliances, or business incentives.',
      'Offer practical solutions rather than vague advice.',
    ],
    rubricFocus: [
      'Clear explanation of causes and responses',
      'Logical paragraphing between problem and solution',
      'Specific consumer and environmental vocabulary',
      'Controlled cause-solution structures',
    ],
  },
  {
    id: 'task-2-flexible-working-hours',
    title: 'Flexible working hours',
    taskType: 'task-2',
    questionType: 'Discuss both views + opinion',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['flexible hours', 'employees', 'companies', 'productivity', 'work-life balance', 'management'],
    prompt:
      'Some people think all employees should have the right to flexible working hours, while others believe fixed schedules are better for businesses. Discuss both views and give your own opinion.',
    planningHints: [
      'Compare personal flexibility with organisational coordination needs.',
      'Use concrete examples from office, retail, or healthcare settings.',
      'Keep your own view visible throughout the essay.',
    ],
    rubricFocus: [
      'Balanced discussion with a clear opinion',
      'Logical treatment of worker and employer priorities',
      'Precise workplace and productivity vocabulary',
      'Controlled argument structures',
    ],
  },
  {
    id: 'task-2-city-tourism-limits',
    title: 'Limiting tourism in popular cities',
    taskType: 'task-2',
    questionType: 'Agree / disagree',
    recommendedMinutes: 40,
    suggestedWordCount: 250,
    keywordTargets: ['tourism', 'cities', 'limits', 'residents', 'economy', 'crowding'],
    prompt:
      'Some people think popular cities should limit the number of tourists they accept each year. To what extent do you agree or disagree?',
    planningHints: [
      'Make your level of agreement clear from the start.',
      'Balance economic benefits against crowding and resident welfare.',
      'Use examples about housing, transport, or heritage sites.',
    ],
    rubricFocus: [
      'Direct response to the extent question',
      'Clear economic versus social comparison',
      'Specific tourism and urban-policy vocabulary',
      'Controlled concession structures',
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
  'task-1-rent-prices-city-zones': `The table compares the average monthly rent for one-bedroom apartments in three parts of a city in 2014 and 2024.

Overall, rent increased in every zone over the ten-year period. The city centre remained the most expensive area in both years, whereas the outer suburbs were consistently the cheapest.

In 2014, an apartment in the city centre cost about $1,350 per month. This was notably higher than the figure for the inner suburbs, at around $1,080, and considerably above the outer suburbs, where the average rent stood at roughly $780. By 2024, all three figures had risen, with city-centre rent reaching approximately $1,980, the highest value shown in the table.

The inner suburbs also saw a substantial increase, climbing to around $1,540 per month. Meanwhile, the outer suburbs remained the least expensive location despite a clear rise to about $1,120. In absolute terms, the city centre experienced the largest increase over the decade. Overall, the same ranking was preserved throughout, but the gap between zones stayed wide as rents rose across the whole city.`,
  'task-1-museum-visitors-by-month': `The line graph shows how many people visited a history museum each month during one year.

Overall, visitor numbers followed a clear seasonal pattern. Attendance was lowest in winter, rose steadily towards late summer, and then fell again during the final part of the year. The peak occurred in August.

At the beginning of the year, the museum received about 2,400 visitors in January. This figure increased gradually through the next few months, reaching roughly 3,300 in April. The upward trend continued into summer, and visitor numbers climbed to around 4,600 in July before hitting a high of approximately 5,200 in August.

After that, attendance began to decline. The total dropped to just under 5,000 in September and then fell more noticeably to about 4,100 in October. By the end of the year, the figure had fallen back to around 2,700 in December, which was only slightly above the level recorded in January. In short, the museum was most popular in the warmest months and least busy during winter.`,
  'task-1-food-delivery-market-share': `The pie charts compare the market share of five food delivery providers in a city in 2018 and 2024.

Overall, QuickDish became the largest provider by 2024, while smaller companies lost market share. In addition, independent restaurant delivery accounted for a smaller proportion of the market at the end of the period.

In 2018, QuickDish held 24% of the market, which was similar to the shares of two other major providers. By 2024, however, its share had risen sharply to 34%, making it the clear market leader. At the same time, two smaller services remained relatively minor players, with LocalRunner representing only 9% in 2024.

Another notable change was the decline in independent restaurant delivery. This category made up a modest share in 2018 but fell to 12% by 2024, suggesting that platform-based ordering became more dominant. Overall, the charts indicate that the market became more concentrated over time, with one major company expanding while smaller competitors and traditional restaurant delivery lost ground.`,
  'task-2-rural-internet-access': `While some people believe rural funding should focus on physical services such as transport and hospitals, I believe fast internet access deserves major investment because it strengthens those same services rather than competing with them.

On the one hand, supporters of spending on roads and hospitals argue that rural residents face immediate disadvantages if they cannot reach a doctor quickly or travel to work and school efficiently. This is a strong argument because poor transport links can isolate communities, and weak healthcare systems create obvious risks for older people and low-income families. In areas with very long travel times, broadband alone cannot replace ambulances, clinics, or safe roads.

On the other hand, reliable high-speed internet can improve education, business activity, and even medical care at the same time. Rural students can attend remote lessons, farmers and small firms can access wider markets, and clinics can use telemedicine for follow-up consultations or specialist advice. In other words, digital infrastructure can multiply the value of existing services rather than simply adding one more convenience.

In my view, governments should not treat this as a choice between cables and care. The most effective policy is to protect essential hospital and transport funding while also expanding broadband, especially in places where poor connectivity limits school quality and local business growth. Fast internet is now basic infrastructure, and without it rural communities fall even further behind.

For these reasons, I believe strong investment in rural internet access is justified, provided it complements rather than replaces core public services.`,
  'task-2-public-exams-pressure': `I partly agree that public examinations create too much pressure, but I do not believe they should be removed completely in favour of continuous assessment.

There is no doubt that high-stakes exams can be stressful. When a student’s future depends heavily on a few papers taken over several days, anxiety can rise sharply and performance may not reflect true ability. Continuous assessment appears more humane because it spreads evaluation across a longer period and allows teachers to consider classroom effort, projects, and gradual improvement.

However, replacing national examinations entirely would create new problems. Public exams provide a common standard across schools, which is especially important in systems where teaching quality and resources vary widely. If grades depended only on internal assessment, parents and universities might question whether results from different schools were equally reliable. In addition, continuous assessment can increase pressure in another way because students may feel they are being judged all year without a clear end point.

For this reason, I believe the best solution is reform rather than abolition. Schools should reduce the weight of final exams by combining them with coursework, oral tasks, or timed class tests, while keeping an external assessment to preserve fairness. This balance would still reward steady work but would avoid making a single examination the only measure of success.

Overall, I agree that public examinations create excessive pressure, yet I disagree that they should disappear entirely. A mixed system is more balanced and credible.`,
  'task-2-foreign-language-primary-school': `In my opinion, the advantages of introducing a foreign language in primary school outweigh the disadvantages, provided that teaching is age-appropriate and well supported.

The main benefit of an early start is that younger children generally acquire pronunciation and listening patterns more naturally than older learners. At primary level, pupils are often less afraid of making mistakes, so they are more willing to repeat words, sing, role-play, and build basic speaking confidence. Starting early also gives schools more years to recycle vocabulary and grammar, which can produce stronger long-term competence by the time students reach secondary education.

Another advantage is cultural awareness. Even simple exposure to another language can make children more curious about other societies and less likely to view their own culture as the only normal one. In an increasingly international economy, this broader mindset is valuable.

Admittedly, there are drawbacks. Some schools lack trained language teachers, and poorly designed lessons can become superficial. In addition, adding another subject may place pressure on crowded primary timetables, particularly where literacy and numeracy standards are already weak.

Even so, these problems are manageable. Governments can provide specialist training, simple oral materials, and a gradual curriculum that does not overload young learners. The risks arise mainly from weak implementation, not from the policy itself.

For these reasons, I believe the advantages are greater overall. Early language study can strengthen both communication skills and cultural awareness if schools introduce it realistically.`,
  'task-2-repair-vs-replace': `In many countries, people replace products more quickly than in the past because new items are relatively cheap and repair has become less convenient. To reverse this trend, governments and businesses need to make repair both affordable and practical.

One reason for the shift is price. Mass production allows companies to sell electronics, household goods, and clothing at low cost, so consumers often conclude that replacing an item is more sensible than fixing it. This is especially true when spare parts are expensive or when repair labour costs nearly as much as a new purchase.

A second cause is design. Many modern products are not made to be opened, upgraded, or repaired easily. Batteries may be sealed, components may be glued in place, and independent repair shops may lack access to official parts or manuals. As a result, even willing customers face delays and uncertainty.

Several measures could encourage repair. First, governments can introduce right-to-repair rules requiring manufacturers to supply spare parts, repair information, and reasonable product access for a number of years. Second, tax reductions on repair services could make fixing appliances and electronics more attractive financially. Finally, companies should be encouraged to design durable products and offer trade-in or repair programmes that are easy for customers to use.

Overall, people replace goods because new products are cheap and repair is inconvenient. If repair becomes easier, cheaper, and more normal, consumers will be more willing to choose it.`,
  'task-2-flexible-working-hours': `Although fixed schedules are useful in some industries, I believe employees should have a much stronger right to flexible working hours because flexibility often improves both wellbeing and productivity when it is managed properly.

Those who support fixed schedules argue that businesses need everyone available at the same time. This is clearly true in settings such as retail, manufacturing, and emergency services, where coverage and coordination matter. A hospital, for example, cannot rely on staff choosing their own hours without limits, and a shop needs people present when customers arrive.

However, many jobs no longer depend on strict start and finish times. In office-based roles, what matters most is output, communication, and meeting deadlines rather than sitting at a desk at identical hours every day. Flexible schedules can help workers avoid long commutes, manage childcare, and work during the hours when they concentrate best. In turn, employers may benefit from higher morale, lower absence, and stronger staff retention.

In my view, the best approach is to treat flexibility as a default right that can be adjusted where genuine operational reasons exist. Companies should be allowed to set core contact hours or minimum coverage rules, but they should not assume that every role requires a rigid timetable. This respects both business needs and employee autonomy.

Overall, I believe flexible working hours should be widely available. Fixed schedules remain necessary in some sectors, but they should be the exception rather than the norm.`,
};

export const sampleResponse = sampleResponsesByPromptId[samplePrompt.id];

export function getSampleResponse(promptId: string) {
  const direct = sampleResponsesByPromptId[promptId];
  if (direct) {
    return direct;
  }

  const prompt = writingPromptBank.find((item) => item.id === promptId);
  if (!prompt) {
    return '';
  }

  return prompt.taskType === 'task-1'
    ? sampleResponsesByPromptId[sampleTask1Prompt.id] ?? ''
    : sampleResponsesByPromptId[samplePrompt.id] ?? '';
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
