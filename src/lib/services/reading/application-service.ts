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

function shouldStartIncorrectRetry(value: SearchParamValue) {
  const normalized = getSingleSearchParam(value)?.trim().toLowerCase();
  return normalized === 'incorrect' || normalized === 'missed' || normalized === 'retry';
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
        ? 'This reading set looks strong. Keep the same pacing and double-check tricky completion answers before you lock them in.'
        : percentage >= 60
          ? 'This set is workable, but one weaker question type is still dragging down the final score.'
          : 'This set needs another pass with slower evidence checking and tighter answer validation.',
    accuracyByQuestionType,
    questionReviews,
    strengths: strongestType
      ? [`Best question type so far: ${strongestType.type} (${strongestType.correct}/${strongestType.total}).`]
      : ['Complete one full reading set to unlock stronger Reading guidance.'],
    risks: [
      weakestType ? `Weakest question type: ${weakestType.type} (${weakestType.correct}/${weakestType.total}).` : 'No question-type breakdown yet.',
      ...(skippedCount > 0 ? [`${skippedCount} question(s) were left blank.`] : []),
    ],
    nextSteps: [
      weakestType ? `Redo one ${weakestType.type} item and explain the evidence sentence out loud.` : 'Complete another reading set to compare question-type performance.',
      'Check every answer against the evidence hint before you submit the next attempt.',
      'Treat this as a set score, not an official IELTS Reading result.',
    ],
    warnings: [
      'Reading scores here are set results, not official IELTS scores.',
      'Answer quality depends on the source material and answer keys used in your reading bank.',
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
        : 'Add one reading set so the first real practice session can begin.',
      'Finish every question before you score if you want the clearest first benchmark.',
      'Stay focused on multiple choice, true/false/not given, and sentence completion until your set accuracy feels stable.',
    ];
  }

  const latest = attempts[0]!;
  const weakest = latest.report.accuracyByQuestionType.at(-1);
  const missedQuestions = latest.report.questionReviews.filter((review) => !review.isCorrect).length;

  return [
    missedQuestions > 0
      ? `Retry the ${missedQuestions} missed question${missedQuestions === 1 ? '' : 's'} from ${latest.setTitle} before you start a new set.`
      : weakest
        ? `Fix your weakest question type next: redo one ${weakest.type} item from ${latest.setTitle} and justify the answer from the passage.`
        : `Repeat ${latest.setTitle} once to build a second timing data point.`,
    latest.timeSpentSeconds > 1200
      ? 'Trim your next attempt time by focusing on evidence hints before revisiting the full passage.'
      : 'Keep the same pacing, but validate every completion answer against the exact wording in the text.',
      'Do not treat this set score as an official IELTS Reading estimate.',
    ];
}

function buildReadingStudyPlan(
  attempts: ReadingAttemptSnapshot[],
  availableSets: ImportedReadingSet[],
): ReadingDashboardPageData['studyPlan'] {
  const activeSet = availableSets[0] ?? null;

  if (attempts.length === 0) {
    return {
      summary: activeSet
        ? `Start with ${activeSet.title}. This first benchmark unlocks the rest of the Reading path.`
        : 'Add one Reading set before the curriculum can start.',
      horizonLabel: 'First Reading block',
      recommendedSessionLabel: activeSet ? `${activeSet.questions.length} questions` : undefined,
      steps: [
        {
          id: 'reading-first-benchmark',
          title: 'Complete your first Reading benchmark set',
          detail: activeSet
            ? `Work through ${activeSet.title} without checking answers until the end.`
            : 'Import one Reading set, then complete it under timed conditions.',
          actions: [
            'Answer every question before scoring.',
            'Keep your elapsed time visible so pacing data is meaningful.',
            'Review evidence hints only after submission.',
          ],
          phase: 'benchmark',
          status: activeSet ? 'current' : 'locked',
          completionSignal: 'One scored Reading set is saved.',
          moduleLabel: 'Reading',
          sessionLabel: 'Session 1',
          actionHref: activeSet ? `/reading?setId=${activeSet.id}` : undefined,
          actionLabel: activeSet ? 'Start first Reading set' : undefined,
        },
        {
          id: 'reading-first-review',
          title: 'Review the first miss pattern',
          detail: 'After the first score, fix missed questions before opening another set.',
          actions: [
            'Sort mistakes by question type.',
            'Say the exact evidence sentence before changing an answer.',
          ],
          phase: 'daily-session',
          status: 'locked',
          completionSignal: 'Every missed question from the first set has been reviewed once.',
          moduleLabel: 'Reading',
          sessionLabel: 'Review',
        },
      ],
      carryForward: ['Treat Reading scores as practice-set signals, not official band estimates.'],
    };
  }

  const latest = attempts[0]!;
  const missedCount = latest.report.questionReviews.filter((review) => !review.isCorrect).length;
  const weakest = latest.report.accuracyByQuestionType.at(-1);
  const nextFreshSet = availableSets.find((set) => !attempts.some((attempt) => attempt.setId === set.id))
    ?? availableSets.find((set) => set.id !== latest.setId)
    ?? activeSet;
  const isStable = attempts.length >= 3 && attempts.slice(0, 3).every((attempt) => attempt.report.percentage >= 75);

  return {
    summary: missedCount > 0
      ? `Today starts with ${missedCount} missed question${missedCount === 1 ? '' : 's'} from ${latest.setTitle}.`
      : `Today moves from ${latest.setTitle} into a fresh set while preserving evidence accuracy.`,
    horizonLabel: `Next ${Math.min(3, attempts.length + 1)} Reading blocks`,
    recommendedSessionLabel: `${latest.report.scoreLabel} latest set`,
    steps: [
      {
        id: 'reading-retry-missed',
        title: missedCount > 0 ? 'Retry missed questions first' : 'Confirm the latest set once',
        detail: missedCount > 0
          ? `Redo only the missed questions from ${latest.setTitle} before starting anything new.`
          : `${latest.setTitle} had no missed questions. Skim the evidence trail once before moving on.`,
        actions: missedCount > 0
          ? [
              'Open only the missed-question retry mode.',
              'Write down the evidence sentence before choosing the answer.',
              'Do not start a fresh set until this retry is complete.',
            ]
          : [
              'Re-read the evidence hints for the hardest items.',
              'Keep the same pacing pattern for the next set.',
            ],
        phase: 'daily-session',
        status: 'current',
        completionSignal: missedCount > 0
          ? 'All missed questions from the latest set are retried.'
          : 'The latest evidence review is complete.',
        moduleLabel: 'Reading',
        sessionLabel: 'Today',
        actionHref: missedCount > 0
          ? `/reading?attemptId=${latest.attemptId}&retry=incorrect`
          : `/reading?attemptId=${latest.attemptId}`,
        actionLabel: missedCount > 0 ? 'Retry missed questions' : 'Review latest set',
      },
      {
        id: 'reading-weakest-type',
        title: weakest ? `Repair ${weakest.type}` : 'Repair the weakest question type',
        detail: weakest
          ? `${weakest.type} is currently ${weakest.correct}/${weakest.total}. Make this the next micro-skill before a new score.`
          : 'Use the next set to identify which question type needs the most attention.',
        actions: [
          'Name the answer trap before selecting an option.',
          'Match the answer to exact passage wording, not memory.',
        ],
        phase: 'next-block',
        status: 'locked',
        completionSignal: weakest
          ? `${weakest.type} reaches at least 75% accuracy across saved attempts.`
          : 'A weakest question type is identified from a saved set.',
        moduleLabel: 'Reading',
        sessionLabel: 'Next block',
      },
      {
        id: 'reading-fresh-set',
        title: isStable ? 'Step up with a fresh set' : 'Build stability with one more set',
        detail: nextFreshSet
          ? `Use ${nextFreshSet.title} after the retry block so the score reflects new evidence, not memory.`
          : 'Add another Reading set when you want broader topic coverage.',
        actions: [
          'Keep one visible timer for the whole set.',
          'Finish all questions before checking the answer key.',
        ],
        phase: isStable ? 'complete' : 'next-block',
        status: 'locked',
        completionSignal: isStable
          ? 'Three recent Reading sets stay at 75%+ accuracy.'
          : 'One fresh Reading set is completed after the retry block.',
        moduleLabel: 'Reading',
        sessionLabel: isStable ? 'Checkpoint' : 'Session 2',
        actionHref: nextFreshSet ? `/reading?setId=${nextFreshSet.id}` : undefined,
        actionLabel: nextFreshSet ? 'Open next Reading set' : undefined,
      },
    ],
    carryForward: latest.report.strengths.length > 0
      ? latest.report.strengths.slice(0, 2)
      : ['Validate every Reading answer against a passage sentence.'],
  };
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
    const requestedRetryMode = shouldStartIncorrectRetry(searchParams.retry)
      && selectedAttempt?.report.questionReviews.some((review) => !review.isCorrect)
      ? 'incorrect'
      : 'all';
    const activeSet = importedBank.sets.find((set) => set.id === (requestedSetId ?? selectedAttempt?.setId))
      ?? importedBank.sets[0]
      ?? null;

    return {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      statusLabel: activeSet ? 'Reading set ready' : 'Awaiting import',
      summary: activeSet
        ? 'Use one-passage reading sets to train accuracy and pacing for the full IELTS Reading exam.'
        : 'Add your own reading materials to unlock the first practice set.',
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
      initialRetryMode: requestedRetryMode,
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
        ? 'Review reading practice by set, timing, and question type. Use each saved set to build accuracy and pacing for the full exam.'
        : 'Add one reading set to unlock the first practice dashboard.',
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
      studyPlan: buildReadingStudyPlan(savedAttempts, importedBank.sets),
    };
  }

  async function loadTaskData(): Promise<ReadingTaskData> {
    const [importSummary, importedBank] = await Promise.all([
      loadImportSummary(),
      repository.readImportedBank(),
    ]);

    return {
      moduleId: 'reading',
      title: importedBank.sets[0]?.title ?? 'Reading set required',
      description: importedBank.sets[0]
        ? 'The first reading practice set is ready for a timed one-passage session.'
        : 'Add a reading set to unlock the first real task payload.',
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
        error: 'Provide a setId and an answers object for the Reading set.',
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
