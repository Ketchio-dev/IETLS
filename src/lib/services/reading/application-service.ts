import { randomUUID } from 'node:crypto';

import {
  createReadingAssessmentRepository,
  type ReadingAssessmentRepository,
} from '@/lib/server/reading-assessment-repository';
import {
  loadReadingPrivateImportSummary,
  type ReadingPrivateImportRepository,
} from '@/lib/server/reading-private-import-repository';
import type { ImportedReadingQuestion, ImportedReadingSet } from '@/lib/services/reading-imports/types';
import { isReadingAnswerCorrect } from '@/lib/services/reading/grading';

import type {
  ReadingAccuracyByType,
  ReadingAssessmentReport,
  ReadingAttemptSnapshot,
  ReadingAttemptSummary,
  ReadingDashboardPageData,
  ReadingDashboardSummary,
  ReadingPracticePageData,
  ReadingTaskData,
  SubmitReadingAssessmentInput,
  SubmitReadingAssessmentResult,
} from './types';

type SearchParamValue = string | string[] | undefined;

interface ReadingApplicationServiceOptions {
  repository?: ReadingAssessmentRepository;
  loadImportSummary?: ReadingPrivateImportRepository['loadSummary'];
  now?: () => string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getSingleSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function summarizeAttempt(attempt: ReadingAttemptSnapshot): ReadingAttemptSummary {
  return {
    attemptId: attempt.attemptId,
    setId: attempt.setId,
    setTitle: attempt.setTitle,
    createdAt: attempt.createdAt,
    rawScore: attempt.report.rawScore,
    maxScore: attempt.report.maxScore,
    percentage: attempt.report.percentage,
    scoreLabel: attempt.report.scoreLabel,
    timeSpentSeconds: attempt.timeSpentSeconds,
  };
}

function buildTypeAccuracy(reviews: ReadingAssessmentReport['questionReviews']): ReadingAccuracyByType[] {
  const grouped = new Map<string, { correct: number; total: number }>();

  for (const review of reviews) {
    const bucket = grouped.get(review.type) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (review.isCorrect) {
      bucket.correct += 1;
    }
    grouped.set(review.type, bucket);
  }

  return Array.from(grouped.entries())
    .map(([type, stats]) => ({
      type,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100),
    }))
    .sort((left, right) => right.accuracy - left.accuracy || left.type.localeCompare(right.type));
}

function scoreQuestion(question: ImportedReadingQuestion, submittedAnswer: string) {
  const isCorrect = isReadingAnswerCorrect(question, submittedAnswer);

  return {
    questionId: question.id,
    type: question.type,
    prompt: question.prompt,
    userAnswer: submittedAnswer,
    acceptedAnswers: clone(question.acceptedAnswers),
    isCorrect,
    explanation: question.explanation,
    evidenceHint: question.evidenceHint,
  };
}

function buildReport(
  set: ImportedReadingSet,
  answers: Record<string, string>,
  timeSpentSeconds: number,
  generatedAt: string,
): ReadingAssessmentReport {
  const questionReviews = set.questions.map((question) => scoreQuestion(question, answers[question.id] ?? ''));
  const rawScore = questionReviews.filter((review) => review.isCorrect).length;
  const maxScore = set.questions.length;
  const percentage = maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 100);
  const accuracyByQuestionType = buildTypeAccuracy(questionReviews);
  const strongestType = accuracyByQuestionType[0];
  const weakestType = accuracyByQuestionType.at(-1);
  const skippedCount = questionReviews.filter((review) => review.userAnswer.trim().length === 0).length;

  return {
    reportId: `reading-report-${randomUUID()}`,
    attemptId: `reading-attempt-${randomUUID()}`,
    setId: set.id,
    setTitle: set.title,
    rawScore,
    maxScore,
    percentage,
    scoreLabel: `${rawScore}/${maxScore}`,
    summary:
      percentage >= 80
        ? 'This private Reading drill looks strong. Keep the same pacing and verify difficult completion answers carefully.'
        : percentage >= 60
          ? 'This drill is workable, but one weaker question type is still pulling down the total score.'
          : 'This drill needs another pass with slower evidence checking and tighter answer validation.',
    accuracyByQuestionType,
    questionReviews,
    strengths: strongestType
      ? [`Best question type so far: ${strongestType.type} (${strongestType.correct}/${strongestType.total}).`]
      : ['Complete one full imported drill to unlock stronger Reading guidance.'],
    risks: [
      weakestType ? `Weakest question type: ${weakestType.type} (${weakestType.correct}/${weakestType.total}).` : 'No question-type breakdown yet.',
      ...(skippedCount > 0 ? [`${skippedCount} question(s) were left blank.`] : []),
    ],
    nextSteps: [
      weakestType ? `Redo one ${weakestType.type} item and explain the evidence sentence out loud.` : 'Complete another imported drill to compare question-type performance.',
      'Check every answer against the evidence hint before you submit the next attempt.',
      'Keep this as a private/local practice score, not an official IELTS Reading result.',
    ],
    warnings: [
      'Reading scores here are deterministic private drill results, not official IELTS scores.',
      'Imported content quality depends on your local source material and answer keys.',
    ],
    generatedAt,
  };
}

function buildDashboardSummary(attempts: ReadingAttemptSnapshot[]): ReadingDashboardSummary {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averagePercentage: null,
      bestScoreLabel: null,
      latestAttemptAt: null,
      averageTimeSpentSeconds: 0,
      strongestType: null,
      weakestType: null,
    };
  }

  const averagePercentage = Math.round(
    attempts.reduce((sum, attempt) => sum + attempt.report.percentage, 0) / attempts.length,
  );
  const bestAttempt = attempts.reduce((best, current) =>
    current.report.percentage > best.report.percentage ? current : best,
  );
  const averageTimeSpentSeconds = Math.round(
    attempts.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / attempts.length,
  );

  const aggregate = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    for (const bucket of attempt.report.accuracyByQuestionType) {
      const current = aggregate.get(bucket.type) ?? { correct: 0, total: 0 };
      current.correct += bucket.correct;
      current.total += bucket.total;
      aggregate.set(bucket.type, current);
    }
  }

  const summaryBuckets = Array.from(aggregate.entries()).map(([type, stats]) => ({
    type,
    correct: stats.correct,
    total: stats.total,
    accuracy: stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100),
  }));
  summaryBuckets.sort((left, right) => right.accuracy - left.accuracy || left.type.localeCompare(right.type));

  return {
    totalAttempts: attempts.length,
    averagePercentage,
    bestScoreLabel: bestAttempt.report.scoreLabel,
    latestAttemptAt: attempts[0]?.createdAt ?? null,
    averageTimeSpentSeconds,
    strongestType: summaryBuckets[0] ?? null,
    weakestType: summaryBuckets.at(-1) ?? null,
  };
}

function buildStudyFocus(attempts: ReadingAttemptSnapshot[], activeSet: ImportedReadingSet | null) {
  if (attempts.length === 0) {
    return [
      activeSet
        ? `Start with ${activeSet.title} and aim to finish within ${Math.round(activeSet.passageWordCount / 4)} seconds of your target pace.`
        : 'Import one local reading set so the first real drill can begin.',
      'Check that every question includes an explanation and evidence hint before trusting the score.',
      'Keep release 1 focused on MCQ, T/F/NG, and sentence completion only.',
    ];
  }

  const latest = attempts[0]!;
  const weakest = latest.report.accuracyByQuestionType.at(-1);

  return [
    weakest
      ? `Redo one ${weakest.type} item from ${latest.setTitle} and justify the answer from the passage.`
      : `Repeat ${latest.setTitle} once to build a second timing data point.`,
    latest.timeSpentSeconds > 1200
      ? 'Trim your next attempt time by focusing on evidence hints before revisiting the full passage.'
      : 'Keep the same pacing, but validate every completion answer against the exact wording in the text.',
    'Do not treat this private drill score as an official IELTS Reading estimate.',
  ];
}

export function createReadingApplicationService({
  repository = createReadingAssessmentRepository(),
  loadImportSummary = loadReadingPrivateImportSummary,
  now = () => new Date().toISOString(),
}: ReadingApplicationServiceOptions = {}) {
  async function loadPracticePageData(
    searchParams: Record<string, SearchParamValue> = {},
  ): Promise<ReadingPracticePageData> {
    const [importSummary, importedBank, savedAttempts] = await Promise.all([
      loadImportSummary(),
      repository.readImportedBank(),
      repository.listSavedAttempts(12),
    ]);

    const requestedSetId = getSingleSearchParam(searchParams.setId);
    const requestedAttemptId = getSingleSearchParam(searchParams.attemptId);
    const selectedAttempt = savedAttempts.find((attempt) => attempt.attemptId === requestedAttemptId) ?? null;
    const activeSet = importedBank.sets.find((set) => set.id === (requestedSetId ?? selectedAttempt?.setId))
      ?? importedBank.sets[0]
      ?? null;

    return {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      statusLabel: activeSet ? 'Private drill ready' : 'Awaiting import',
      summary: activeSet
        ? 'One-passage private Reading drills are now available from your local import bank. This route does not yet simulate the full 60-minute three-passage test.'
        : 'Import your own local Reading materials to unlock the first passage-centred drill.',
      routeBase: '/reading',
      importedSets: clone(importedBank.sets),
      availableSets: importedBank.sets.map((set) => ({
        id: set.id,
        title: set.title,
        sourceLabel: set.sourceLabel,
        sourceFile: set.sourceFile,
        importedAt: set.importedAt,
        questionCount: set.questions.length,
        passageWordCount: set.passageWordCount,
        types: Array.from(new Set(set.questions.map((question) => question.type))),
      })),
      activeSet,
      importSummary,
      initialReport: selectedAttempt?.report ?? null,
      initialAnswers: selectedAttempt?.answers ?? {},
      initialTimeSpentSeconds: selectedAttempt?.timeSpentSeconds ?? 0,
      recentAttempts: savedAttempts.slice(0, 6).map(summarizeAttempt),
      savedAttempts,
      initialSetId: activeSet?.id ?? null,
      initialAttemptId: selectedAttempt?.attemptId ?? null,
    };
  }

  async function loadDashboardPageData(): Promise<ReadingDashboardPageData> {
    const [importSummary, importedBank, savedAttempts] = await Promise.all([
      loadImportSummary(),
      repository.readImportedBank(),
      repository.listSavedAttempts(12),
    ]);

    return {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      summary: importedBank.sets.length > 0
        ? 'Review private Reading drill performance by imported set, timing, and question type. This dashboard tracks drills, not a full three-passage mock.'
        : 'Import one local Reading set to unlock the first real Reading drill dashboard.',
      routeBase: '/reading',
      importSummary,
      availableSets: importedBank.sets.map((set) => ({
        id: set.id,
        title: set.title,
        sourceLabel: set.sourceLabel,
        sourceFile: set.sourceFile,
        importedAt: set.importedAt,
        questionCount: set.questions.length,
        passageWordCount: set.passageWordCount,
        types: Array.from(new Set(set.questions.map((question) => question.type))),
      })),
      recentAttempts: savedAttempts.slice(0, 8),
      dashboardSummary: buildDashboardSummary(savedAttempts),
      studyFocus: buildStudyFocus(savedAttempts, importedBank.sets[0] ?? null),
    };
  }

  async function loadTaskData(): Promise<ReadingTaskData> {
    const [importSummary, importedBank] = await Promise.all([
      loadImportSummary(),
      repository.readImportedBank(),
    ]);

    return {
      moduleId: 'reading',
      title: importedBank.sets[0]?.title ?? 'Reading drill import required',
      description: importedBank.sets[0]
        ? 'The first imported private Reading drill is ready for a timed one-passage session.'
        : 'Import a local Reading set to expose the first real Reading task payload.',
      activeSet: importedBank.sets[0] ?? null,
      importedSets: clone(importedBank.sets),
      availableSets: importedBank.sets.map((set) => ({
        id: set.id,
        title: set.title,
        sourceLabel: set.sourceLabel,
        sourceFile: set.sourceFile,
        importedAt: set.importedAt,
        questionCount: set.questions.length,
        passageWordCount: set.passageWordCount,
        types: Array.from(new Set(set.questions.map((question) => question.type))),
      })),
      importSummary,
    };
  }

  async function submitAssessment(input: SubmitReadingAssessmentInput): Promise<SubmitReadingAssessmentResult> {
    const setId = getSingleSearchParam(input.setId) ?? '';
    const answers = input.answers;
    const timeSpentSeconds = typeof input.timeSpentSeconds === 'number' ? input.timeSpentSeconds : 0;

    if (!setId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return {
        ok: false,
        error: 'Provide a setId and an answers object for the Reading drill.',
        status: 400,
      };
    }

    const set = await repository.getSet(setId);
    if (!set) {
      return {
        ok: false,
        error: 'Unknown Reading set requested.',
        status: 404,
      };
    }

    const answerRecord = Object.fromEntries(
      Object.entries(answers as Record<string, unknown>).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );

    const generatedAt = now();
    const draftReport = buildReport(set, answerRecord, timeSpentSeconds, generatedAt);
    const attempt: ReadingAttemptSnapshot = {
      attemptId: draftReport.attemptId,
      setId: set.id,
      setTitle: set.title,
      createdAt: generatedAt,
      timeSpentSeconds,
      answers: answerRecord,
      report: draftReport,
    };

    const savedAttempts = await repository.saveAttempt(attempt, 12);

    return {
      ok: true,
      payload: {
        report: attempt.report,
        attempt,
        recentAttempts: savedAttempts.slice(0, 6).map(summarizeAttempt),
        savedAttempts,
      },
    };
  }

  return {
    loadPracticePageData,
    loadDashboardPageData,
    loadTaskData,
    submitAssessment,
  };
}

const defaultReadingApplicationService = createReadingApplicationService();

export const loadReadingPracticePageData = defaultReadingApplicationService.loadPracticePageData;
export const loadReadingDashboardPageData = defaultReadingApplicationService.loadDashboardPageData;
export const loadReadingTaskData = defaultReadingApplicationService.loadTaskData;
export const submitReadingAssessment = defaultReadingApplicationService.submitAssessment;
