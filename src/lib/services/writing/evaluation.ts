import type { CriterionName, Task1VisualPrompt, WritingPrompt, WritingTaskType } from '@/lib/domain';
import { writingPromptBank } from '@/lib/fixtures/writing';
import { buildAssessmentReport, buildMockAssessmentReport, createSubmissionRecord } from '@/lib/services/assessment';

const DEFAULT_RECOMMENDED_MINUTES_BY_TASK: Record<WritingTaskType, number> = {
  'task-1': 20,
  'task-2': 40,
};

const DEFAULT_SUGGESTED_WORD_COUNT_BY_TASK: Record<WritingTaskType, number> = {
  'task-1': 150,
  'task-2': 250,
};

const VALID_CRITERIA_BY_TASK: Record<WritingTaskType, CriterionName[]> = {
  'task-1': [
    'Task Achievement',
    'Coherence & Cohesion',
    'Lexical Resource',
    'Grammatical Range & Accuracy',
  ],
  'task-2': [
    'Task Response',
    'Coherence & Cohesion',
    'Lexical Resource',
    'Grammatical Range & Accuracy',
  ],
};

export interface WritingEvalPromptInput {
  id?: string;
  title?: string;
  taskType?: WritingTaskType;
  recommendedMinutes?: number;
  suggestedWordCount?: number;
  questionType?: string;
  keywordTargets?: string[];
  prompt?: string;
  planningHints?: string[];
  rubricFocus?: string[];
  visual?: Task1VisualPrompt;
}

export interface WritingEvalEssayInput {
  id: string;
  taskType?: WritingTaskType;
  promptId?: string;
  prompt?: WritingEvalPromptInput;
  response: string;
  overallBand: number;
  criterionScores?: Partial<Record<CriterionName, number>>;
  source?: string;
  notes?: string[];
  timeSpentMinutes?: number;
  wordCount?: number;
  raterId?: string;
  secondRaterId?: string;
  adjudicated?: boolean;
}

export interface WritingEvalDatasetInput {
  version: number;
  source?: string;
  essays: WritingEvalEssayInput[];
}

export interface WritingEvalEssay {
  id: string;
  taskType: WritingTaskType;
  promptId: string;
  prompt: WritingPrompt;
  response: string;
  overallBand: number;
  criterionScores: Partial<Record<CriterionName, number>>;
  source: string | null;
  notes: string[];
  timeSpentMinutes: number;
  wordCount: number;
  raterId: string | null;
  secondRaterId: string | null;
  adjudicated: boolean | null;
  promptSource: 'prompt-bank' | 'inline';
}

export interface WritingEvalDataset {
  version: number;
  source: string | null;
  essays: WritingEvalEssay[];
}

export interface WritingEvalScoreComparison {
  expectedBand: number;
  predictedBand: number;
  error: number;
  absoluteError: number;
}

export interface WritingEvalCriterionResult extends WritingEvalScoreComparison {
  criterion: CriterionName;
}

export interface WritingEvalSampleResult {
  id: string;
  promptId: string;
  taskType: WritingTaskType;
  promptTitle: string;
  promptSource: WritingEvalEssay['promptSource'];
  source: string | null;
  wordCount: number;
  timeSpentMinutes: number;
  scorerProvider: string;
  scorerModel: string;
  usedMockFallback: boolean;
  underLength: boolean;
  overall: WritingEvalScoreComparison;
  criteria: WritingEvalCriterionResult[];
}

export interface WritingEvalMetricSummary {
  count: number;
  meanAbsoluteError: number;
  meanSignedError: number;
  rootMeanSquaredError: number;
  withinHalfBandRate: number;
  withinOneBandRate: number;
}

export interface WritingEvalReport {
  datasetVersion: number;
  datasetSource: string | null;
  scorerMode: 'mock' | 'configured';
  generatedAt: string;
  summary: {
    sampleCount: number;
    taskCounts: Record<WritingTaskType, number>;
    promptSourceCounts: Record<WritingEvalEssay['promptSource'], number>;
    criterionLabeledSampleCount: number;
    underLengthCount: number;
    configuredScoreCount: number;
    explicitMockScoreCount: number;
    mockFallbackCount: number;
    overall: WritingEvalMetricSummary;
    byTask: Array<WritingEvalMetricSummary & { taskType: WritingTaskType }>;
    byCriterion: Array<WritingEvalMetricSummary & { criterion: CriterionName }>;
  };
  samples: WritingEvalSampleResult[];
}

interface ParseWritingEvalDatasetOptions {
  promptBank?: WritingPrompt[];
}

interface EvaluateWritingDatasetOptions {
  scorer?: 'mock' | 'configured';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function roundMetric(value: number, precision = 3) {
  return Number(value.toFixed(precision));
}

function countWords(response: string) {
  const matches = response.trim().match(/\b[\w'-]+\b/g);
  return matches?.length ?? 0;
}

function assertNonEmptyString(value: unknown, fieldPath: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldPath} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(value: unknown, fieldPath: string) {
  if (value === undefined) {
    return null;
  }

  return assertNonEmptyString(value, fieldPath);
}

function assertStringArray(value: unknown, fieldPath: string) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldPath} must be an array of strings.`);
  }

  return value.map((entry, index) => assertNonEmptyString(entry, `${fieldPath}[${index}]`));
}

function assertTaskType(value: unknown, fieldPath: string): WritingTaskType {
  if (value !== 'task-1' && value !== 'task-2') {
    throw new Error(`${fieldPath} must be either "task-1" or "task-2".`);
  }

  return value;
}

function assertBand(value: unknown, fieldPath: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 9) {
    throw new Error(`${fieldPath} must be a finite band score between 0 and 9.`);
  }

  const halfStep = Math.round(value * 2) / 2;
  if (Math.abs(value - halfStep) > 1e-9) {
    throw new Error(`${fieldPath} must use 0.5 band increments.`);
  }

  return value;
}

function assertFiniteNonNegativeNumber(value: unknown, fieldPath: string, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldPath} must be a finite, non-negative number.`);
  }

  return value;
}

function assertOptionalBoolean(value: unknown, fieldPath: string) {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldPath} must be a boolean when provided.`);
  }

  return value;
}

function parsePrompt(input: unknown, fallbackTaskType: WritingTaskType | null, fieldPath: string): WritingPrompt {
  if (!isRecord(input)) {
    throw new Error(`${fieldPath} must be an object.`);
  }

  const taskType = input.taskType ? assertTaskType(input.taskType, `${fieldPath}.taskType`) : fallbackTaskType;
  if (!taskType) {
    throw new Error(`${fieldPath}.taskType is required when the essay does not resolve to an existing promptId.`);
  }

  const promptText = assertNonEmptyString(input.prompt, `${fieldPath}.prompt`);

  return {
    id: readOptionalString(input.id, `${fieldPath}.id`) ?? `external-${taskType}-${Math.random().toString(36).slice(2, 10)}`,
    title:
      readOptionalString(input.title, `${fieldPath}.title`) ??
      `${taskType === 'task-1' ? 'External Task 1' : 'External Task 2'} prompt`,
    taskType,
    recommendedMinutes: assertFiniteNonNegativeNumber(
      input.recommendedMinutes,
      `${fieldPath}.recommendedMinutes`,
      DEFAULT_RECOMMENDED_MINUTES_BY_TASK[taskType],
    ),
    suggestedWordCount: assertFiniteNonNegativeNumber(
      input.suggestedWordCount,
      `${fieldPath}.suggestedWordCount`,
      DEFAULT_SUGGESTED_WORD_COUNT_BY_TASK[taskType],
    ),
    questionType:
      readOptionalString(input.questionType, `${fieldPath}.questionType`) ??
      (taskType === 'task-1' ? 'External Task 1 prompt' : 'External Task 2 prompt'),
    keywordTargets: assertStringArray(input.keywordTargets, `${fieldPath}.keywordTargets`),
    prompt: promptText,
    planningHints: assertStringArray(input.planningHints, `${fieldPath}.planningHints`),
    rubricFocus: assertStringArray(input.rubricFocus, `${fieldPath}.rubricFocus`),
    visual: input.visual as Task1VisualPrompt | undefined,
  };
}

function parseCriterionScores(
  value: unknown,
  taskType: WritingTaskType,
  fieldPath: string,
): Partial<Record<CriterionName, number>> {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(`${fieldPath} must be an object keyed by IELTS criterion names.`);
  }

  const allowedCriteria = VALID_CRITERIA_BY_TASK[taskType];
  const unexpected = Object.keys(value).filter((criterion) => !allowedCriteria.includes(criterion as CriterionName));
  if (unexpected.length > 0) {
    throw new Error(`${fieldPath} contains unsupported criterion keys for ${taskType}: ${unexpected.join(', ')}.`);
  }

  return Object.fromEntries(
    Object.entries(value).map(([criterion, bandValue]) => [criterion, assertBand(bandValue, `${fieldPath}.${criterion}`)]),
  ) as Partial<Record<CriterionName, number>>;
}

export function parseWritingEvalDataset(
  input: unknown,
  { promptBank = writingPromptBank }: ParseWritingEvalDatasetOptions = {},
): WritingEvalDataset {
  if (!isRecord(input)) {
    throw new Error('Writing eval dataset must be a JSON object.');
  }

  if (input.version !== 1) {
    throw new Error('Writing eval dataset version must be 1.');
  }

  if (!Array.isArray(input.essays) || input.essays.length === 0) {
    throw new Error('Writing eval dataset must include a non-empty essays array.');
  }

  const promptById = new Map(promptBank.map((prompt) => [prompt.id, prompt]));
  const essays = input.essays.map((entry, index) => {
    const fieldPath = `essays[${index}]`;
    if (!isRecord(entry)) {
      throw new Error(`${fieldPath} must be an object.`);
    }

    const id = assertNonEmptyString(entry.id, `${fieldPath}.id`);
    const explicitTaskType = entry.taskType ? assertTaskType(entry.taskType, `${fieldPath}.taskType`) : null;
    const promptId = readOptionalString(entry.promptId, `${fieldPath}.promptId`);
    const promptFromBank = promptId ? promptById.get(promptId) ?? null : null;
    const inlinePrompt = entry.prompt ? parsePrompt(entry.prompt, explicitTaskType, `${fieldPath}.prompt`) : null;
    const prompt = promptFromBank ?? inlinePrompt;

    if (!prompt) {
      throw new Error(`${fieldPath} must provide either a known promptId or an inline prompt object.`);
    }

    if (explicitTaskType && explicitTaskType !== prompt.taskType) {
      throw new Error(`${fieldPath}.taskType must match the resolved prompt task type.`);
    }

    const taskType = prompt.taskType;
    const response = assertNonEmptyString(entry.response, `${fieldPath}.response`);
    const overallBand = assertBand(entry.overallBand, `${fieldPath}.overallBand`);
    const criterionScores = parseCriterionScores(entry.criterionScores, taskType, `${fieldPath}.criterionScores`);
    const wordCount = assertFiniteNonNegativeNumber(entry.wordCount, `${fieldPath}.wordCount`, countWords(response));

    return {
      id,
      taskType,
      promptId: promptId ?? prompt.id,
      prompt: promptFromBank ? promptFromBank : { ...prompt, id: promptId ?? prompt.id },
      response,
      overallBand,
      criterionScores,
      source: readOptionalString(entry.source, `${fieldPath}.source`) ?? readOptionalString(input.source, 'source'),
      notes: assertStringArray(entry.notes, `${fieldPath}.notes`),
      timeSpentMinutes: assertFiniteNonNegativeNumber(
        entry.timeSpentMinutes,
        `${fieldPath}.timeSpentMinutes`,
        DEFAULT_RECOMMENDED_MINUTES_BY_TASK[taskType],
      ),
      wordCount,
      raterId: readOptionalString(entry.raterId, `${fieldPath}.raterId`),
      secondRaterId: readOptionalString(entry.secondRaterId, `${fieldPath}.secondRaterId`),
      adjudicated: assertOptionalBoolean(entry.adjudicated, `${fieldPath}.adjudicated`),
      promptSource: promptFromBank ? 'prompt-bank' : 'inline',
    } satisfies WritingEvalEssay;
  });

  return {
    version: 1,
    source: readOptionalString(input.source, 'source'),
    essays,
  };
}

function compareBands(expectedBand: number, predictedBand: number): WritingEvalScoreComparison {
  const error = roundMetric(predictedBand - expectedBand);
  return {
    expectedBand,
    predictedBand,
    error,
    absoluteError: roundMetric(Math.abs(error)),
  };
}

function summarizeComparisons(comparisons: WritingEvalScoreComparison[]): WritingEvalMetricSummary {
  if (comparisons.length === 0) {
    return {
      count: 0,
      meanAbsoluteError: 0,
      meanSignedError: 0,
      rootMeanSquaredError: 0,
      withinHalfBandRate: 0,
      withinOneBandRate: 0,
    };
  }

  const count = comparisons.length;
  const sumAbsoluteError = comparisons.reduce((sum, comparison) => sum + comparison.absoluteError, 0);
  const sumSignedError = comparisons.reduce((sum, comparison) => sum + comparison.error, 0);
  const squaredError = comparisons.reduce((sum, comparison) => sum + comparison.error ** 2, 0);

  return {
    count,
    meanAbsoluteError: roundMetric(sumAbsoluteError / count),
    meanSignedError: roundMetric(sumSignedError / count),
    rootMeanSquaredError: roundMetric(Math.sqrt(squaredError / count)),
    withinHalfBandRate: roundMetric(comparisons.filter((item) => item.absoluteError <= 0.5).length / count),
    withinOneBandRate: roundMetric(comparisons.filter((item) => item.absoluteError <= 1).length / count),
  };
}

export async function evaluateWritingDataset(
  dataset: WritingEvalDataset,
  { scorer = 'mock' }: EvaluateWritingDatasetOptions = {},
): Promise<WritingEvalReport> {
  const taskCounts: Record<WritingTaskType, number> = {
    'task-1': 0,
    'task-2': 0,
  };
  const promptSourceCounts: Record<WritingEvalEssay['promptSource'], number> = {
    'prompt-bank': 0,
    inline: 0,
  };
  const overallComparisons: WritingEvalScoreComparison[] = [];
  const comparisonsByTask = new Map<WritingTaskType, WritingEvalScoreComparison[]>();
  const comparisonsByCriterion = new Map<CriterionName, WritingEvalScoreComparison[]>();
  const samples: WritingEvalSampleResult[] = [];
  let criterionLabeledSampleCount = 0;
  let underLengthCount = 0;
  let configuredScoreCount = 0;
  let explicitMockScoreCount = 0;
  let mockFallbackCount = 0;

  for (const essay of dataset.essays) {
    taskCounts[essay.taskType] += 1;
    promptSourceCounts[essay.promptSource] += 1;

    const submission = createSubmissionRecord({
      promptId: essay.prompt.id,
      taskType: essay.taskType,
      response: essay.response,
      timeSpentMinutes: essay.timeSpentMinutes,
    });
    const report =
      scorer === 'mock'
        ? buildMockAssessmentReport(essay.prompt, submission)
        : await buildAssessmentReport(essay.prompt, submission);

    if (scorer === 'mock') {
      explicitMockScoreCount += 1;
    } else if (report.evaluationTrace.usedMockFallback) {
      mockFallbackCount += 1;
    } else {
      configuredScoreCount += 1;
    }

    const overall = compareBands(essay.overallBand, report.overallBand);
    overallComparisons.push(overall);
    const taskBucket = comparisonsByTask.get(essay.taskType) ?? [];
    taskBucket.push(overall);
    comparisonsByTask.set(essay.taskType, taskBucket);

    const availableCriteria = VALID_CRITERIA_BY_TASK[essay.taskType].filter(
      (criterion) => essay.criterionScores[criterion] !== undefined,
    );
    if (availableCriteria.length > 0) {
      criterionLabeledSampleCount += 1;
    }

    const criteria = availableCriteria.map((criterion) => {
      const predicted = report.criterionScores.find((score) => score.criterion === criterion);
      if (!predicted) {
        throw new Error(`Scorer did not return ${criterion} for essay ${essay.id}.`);
      }

      const comparison = compareBands(essay.criterionScores[criterion]!, predicted.band);
      const criterionBucket = comparisonsByCriterion.get(criterion) ?? [];
      criterionBucket.push(comparison);
      comparisonsByCriterion.set(criterion, criterionBucket);

      return {
        criterion,
        ...comparison,
      };
    });

    const underLength = report.warnings.some((warning) => warning.code === 'under-length');
    if (underLength) {
      underLengthCount += 1;
    }

    samples.push({
      id: essay.id,
      promptId: essay.promptId,
      taskType: essay.taskType,
      promptTitle: essay.prompt.title,
      promptSource: essay.promptSource,
      source: essay.source,
      wordCount: essay.wordCount,
      timeSpentMinutes: essay.timeSpentMinutes,
      scorerProvider: report.evaluationTrace.scorerProvider,
      scorerModel: report.evaluationTrace.scorerModel,
      usedMockFallback: report.evaluationTrace.usedMockFallback,
      underLength,
      overall,
      criteria,
    });
  }

  return {
    datasetVersion: dataset.version,
    datasetSource: dataset.source,
    scorerMode: scorer,
    generatedAt: new Date().toISOString(),
    summary: {
      sampleCount: dataset.essays.length,
      taskCounts,
      promptSourceCounts,
      criterionLabeledSampleCount,
      underLengthCount,
      configuredScoreCount,
      explicitMockScoreCount,
      mockFallbackCount,
      overall: summarizeComparisons(overallComparisons),
      byTask: (Object.entries(taskCounts) as Array<[WritingTaskType, number]>)
        .filter(([, count]) => count > 0)
        .map(([taskType]) => ({ taskType, ...summarizeComparisons(comparisonsByTask.get(taskType) ?? []) })),
      byCriterion: [...comparisonsByCriterion.entries()].map(([criterion, comparisons]) => ({
        criterion,
        ...summarizeComparisons(comparisons),
      })),
    },
    samples,
  };
}
