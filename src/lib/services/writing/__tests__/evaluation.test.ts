import { describe, expect, it } from 'vitest';

import { samplePrompt, sampleResponsesByPromptId, sampleTask1Prompt } from '@/lib/fixtures/writing';
import { buildMockAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

import { evaluateWritingDataset, parseWritingEvalDataset, type WritingEvalDatasetInput } from '../evaluation';

function buildHumanRatedEssay(prompt = samplePrompt) {
  const response = sampleResponsesByPromptId[prompt.id]!;
  const submission = createSubmissionRecord({
    promptId: prompt.id,
    taskType: prompt.taskType,
    response,
    timeSpentMinutes: prompt.recommendedMinutes,
  });
  const report = buildMockAssessmentReport(prompt, submission);

  return {
    id: `human-rated-${prompt.id}`,
    taskType: prompt.taskType,
    promptId: prompt.id,
    response,
    overallBand: report.overallBand,
    criterionScores: Object.fromEntries(report.criterionScores.map((score) => [score.criterion, score.band])),
  };
}

describe('parseWritingEvalDataset', () => {
  it('parses prompt-bank and inline essays into a normalized dataset', () => {
    const dataset = parseWritingEvalDataset({
      version: 1,
      source: 'internal-set',
      essays: [
        buildHumanRatedEssay(samplePrompt),
        {
          id: 'inline-task-1',
          taskType: 'task-1',
          prompt: {
            id: 'external-task-1',
            title: 'External chart prompt',
            taskType: 'task-1',
            prompt: 'The chart below shows changes in commuter traffic over one week.',
          },
          response: sampleResponsesByPromptId[sampleTask1Prompt.id],
          overallBand: 6,
          criterionScores: {
            'Task Achievement': 6,
            'Coherence & Cohesion': 6,
            'Lexical Resource': 6,
            'Grammatical Range & Accuracy': 5.5,
          },
        },
      ],
    } satisfies WritingEvalDatasetInput);

    expect(dataset.source).toBe('internal-set');
    expect(dataset.essays).toHaveLength(2);
    expect(dataset.essays[0]).toMatchObject({
      promptId: samplePrompt.id,
      promptSource: 'prompt-bank',
      taskType: 'task-2',
    });
    expect(dataset.essays[1]).toMatchObject({
      promptId: 'external-task-1',
      promptSource: 'inline',
      taskType: 'task-1',
    });
  });

  it('accepts overall-only datasets when criterion scores are unavailable', () => {
    const dataset = parseWritingEvalDataset({
      version: 1,
      essays: [
        {
          id: 'overall-only-task-2',
          taskType: 'task-2',
          prompt: {
            title: 'Overall only prompt',
            taskType: 'task-2',
            prompt: 'Some people believe children should start school earlier.',
          },
          response: sampleResponsesByPromptId[samplePrompt.id],
          overallBand: 6,
        },
      ],
    });

    expect(dataset.essays[0]?.criterionScores).toEqual({});
  });

  it('rejects criterion keys that do not match the essay task type', () => {
    expect(() =>
      parseWritingEvalDataset({
        version: 1,
        essays: [
          {
            id: 'invalid-task-1',
            taskType: 'task-1',
            prompt: {
              title: 'External prompt',
              taskType: 'task-1',
              prompt: 'The chart below shows ...',
            },
            response: sampleResponsesByPromptId[sampleTask1Prompt.id],
            overallBand: 6,
            criterionScores: {
              'Task Response': 6,
              'Coherence & Cohesion': 6,
              'Lexical Resource': 6,
              'Grammatical Range & Accuracy': 6,
            },
          },
        ],
      }),
    ).toThrow(/unsupported criterion keys for task-1/i);
  });
});

describe('evaluateWritingDataset', () => {
  it('reports zero error when human scores match the mock scorer output', async () => {
    const dataset = parseWritingEvalDataset({
      version: 1,
      essays: [buildHumanRatedEssay(samplePrompt), buildHumanRatedEssay(sampleTask1Prompt)],
    });

    const report = await evaluateWritingDataset(dataset, { scorer: 'mock' });

    expect(report.summary.sampleCount).toBe(2);
    expect(report.summary.criterionLabeledSampleCount).toBe(2);
    expect(report.summary.overall.meanAbsoluteError).toBe(0);
    expect(report.summary.overall.meanSignedError).toBe(0);
    expect(report.summary.overall.withinHalfBandRate).toBe(1);
    expect(report.summary.taskCounts).toEqual({
      'task-1': 1,
      'task-2': 1,
    });
    expect(report.summary.byCriterion.every((entry) => entry.meanAbsoluteError === 0)).toBe(true);
    expect(report.samples.every((sample) => sample.scorerProvider === 'mock-rule-based')).toBe(true);
  });

  it('still evaluates overall-band accuracy when criterion labels are missing', async () => {
    const dataset = parseWritingEvalDataset({
      version: 1,
      essays: [
        {
          id: 'overall-only-task-2',
          taskType: 'task-2',
          prompt: {
            title: 'Overall only prompt',
            taskType: 'task-2',
            prompt: 'Some people believe children should start school earlier.',
          },
          response: sampleResponsesByPromptId[samplePrompt.id],
          overallBand: 6,
        },
      ],
    });

    const report = await evaluateWritingDataset(dataset, { scorer: 'mock' });

    expect(report.summary.sampleCount).toBe(1);
    expect(report.summary.criterionLabeledSampleCount).toBe(0);
    expect(report.summary.byCriterion).toEqual([]);
    expect(report.samples[0]?.criteria).toEqual([]);
  });
});
