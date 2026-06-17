import {
  createReadingAssessmentRepository,
  type ReadingAssessmentRepository,
} from '@/lib/server/reading-assessment-repository';
import { createReviewRepository, type ReviewRepository } from '@/lib/server/review-repository';
import type { ImportedReadingSet } from '@/lib/services/reading-imports/types';
import { isReadingAnswerCorrect } from '@/lib/services/reading/grading';

import { isReviewItemDue, scheduleReviewItem } from './scheduler';
import type {
  ReviewDeckSummary,
  ReviewItem,
  ReviewPageData,
  ReviewQuestionView,
  ReviewTypeWeakness,
  SubmitReviewResultInput,
  SubmitReviewResultResult,
} from './types';

const DEFAULT_DUE_LIMIT = 20;

interface ReviewApplicationServiceOptions {
  reviewRepository?: ReviewRepository;
  readingRepository?: ReadingAssessmentRepository;
  now?: () => string;
}

export function buildReviewDeckSummary(items: ReviewItem[], now: string): ReviewDeckSummary {
  const typeMap = new Map<string, ReviewTypeWeakness>();
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let nextDueAt: string | null = null;

  for (const item of items) {
    const bucket = typeMap.get(item.questionType) ?? { type: item.questionType, tracked: 0, due: 0, mastered: 0 };
    bucket.tracked += 1;

    if (isReviewItemDue(item, now)) {
      dueCount += 1;
      bucket.due += 1;
    }

    if (item.status === 'mastered') {
      masteredCount += 1;
      bucket.mastered += 1;
    } else if (item.status === 'learning') {
      learningCount += 1;
    } else {
      reviewCount += 1;
    }

    if (item.status !== 'mastered' && (nextDueAt === null || item.dueAt < nextDueAt)) {
      nextDueAt = item.dueAt;
    }

    typeMap.set(item.questionType, bucket);
  }

  const typeBreakdown = [...typeMap.values()].sort(
    (left, right) => right.due - left.due || right.tracked - left.tracked || left.type.localeCompare(right.type),
  );

  return {
    totalTracked: items.length,
    dueCount,
    learningCount,
    reviewCount,
    masteredCount,
    nextDueAt,
    weakestType: typeBreakdown.find((entry) => entry.due > 0) ?? typeBreakdown[0] ?? null,
    typeBreakdown,
  };
}

export function createReviewApplicationService({
  reviewRepository = createReviewRepository(),
  readingRepository = createReadingAssessmentRepository(),
  now = () => new Date().toISOString(),
}: ReviewApplicationServiceOptions = {}) {
  async function loadDeckSummary(): Promise<ReviewDeckSummary> {
    const items = await reviewRepository.listItems();
    return buildReviewDeckSummary(items, now());
  }

  async function loadReviewPageData(limit = DEFAULT_DUE_LIMIT): Promise<ReviewPageData> {
    const nowIso = now();
    const items = await reviewRepository.listItems();
    const dueItems = items.filter((item) => isReviewItemDue(item, nowIso)).slice(0, limit);

    const setCache = new Map<string, ImportedReadingSet | null>();
    const dueQuestions: ReviewQuestionView[] = [];

    for (const item of dueItems) {
      if (!setCache.has(item.setId)) {
        setCache.set(item.setId, await readingRepository.getSet(item.setId));
      }

      const set = setCache.get(item.setId) ?? null;
      const question = set?.questions.find((candidate) => candidate.id === item.questionId);

      if (!set || !question) {
        // The source set was removed or re-imported without this question; skip it
        // rather than surface an unanswerable card.
        continue;
      }

      dueQuestions.push({
        itemId: item.id,
        setId: item.setId,
        setTitle: set.title,
        questionId: item.questionId,
        type: question.type,
        prompt: question.prompt,
        options: [...question.options],
        evidenceHint: question.evidenceHint,
        status: item.status,
        lapses: item.lapses,
        dueAt: item.dueAt,
      });
    }

    return {
      summary: buildReviewDeckSummary(items, nowIso),
      dueQuestions,
      generatedAt: nowIso,
    };
  }

  async function submitReviewResult(input: SubmitReviewResultInput): Promise<SubmitReviewResultResult> {
    const itemId = typeof input.itemId === 'string' ? input.itemId.trim() : '';
    const answer = typeof input.answer === 'string' ? input.answer : '';

    if (!itemId) {
      return { ok: false, error: 'Provide the review itemId.', status: 400 };
    }

    const items = await reviewRepository.listItems();
    const item = items.find((candidate) => candidate.id === itemId);

    if (!item) {
      return { ok: false, error: 'Unknown review item.', status: 404 };
    }

    const set = await readingRepository.getSet(item.setId);
    const question = set?.questions.find((candidate) => candidate.id === item.questionId);

    if (!set || !question) {
      return { ok: false, error: 'The source question is no longer available.', status: 404 };
    }

    const nowIso = now();
    const isCorrect = isReadingAnswerCorrect(question, answer);
    const updated = scheduleReviewItem(item, isCorrect ? 'correct' : 'incorrect', nowIso);

    await reviewRepository.upsertItems([updated]);

    const remainingDueCount = items
      .map((candidate) => (candidate.id === updated.id ? updated : candidate))
      .filter((candidate) => isReviewItemDue(candidate, nowIso)).length;

    return {
      ok: true,
      payload: {
        itemId: updated.id,
        isCorrect,
        submittedAnswer: answer,
        acceptedAnswers: [...question.acceptedAnswers],
        explanation: question.explanation,
        evidenceHint: question.evidenceHint,
        status: updated.status,
        nextDueAt: updated.dueAt,
        intervalDays: updated.intervalDays,
        remainingDueCount,
      },
    };
  }

  return {
    loadDeckSummary,
    loadReviewPageData,
    submitReviewResult,
  };
}

const defaultReviewApplicationService = createReviewApplicationService();

export const loadReviewPageData = defaultReviewApplicationService.loadReviewPageData;
export const loadReviewDeckSummary = defaultReviewApplicationService.loadDeckSummary;
export const submitReviewResult = defaultReviewApplicationService.submitReviewResult;
