import {
  createReadingAssessmentRepository,
  type ReadingAssessmentRepository,
} from '@/lib/server/reading-assessment-repository';
import {
  createReviewActivityRepository,
  type ReviewActivityRepository,
} from '@/lib/server/review-activity-repository';
import { createReviewRepository, type ReviewRepository } from '@/lib/server/review-repository';
import type { ImportedReadingSet } from '@/lib/services/reading-imports/types';
import { isReadingAnswerCorrect } from '@/lib/services/reading/grading';

import { buildReviewDashboardModel, buildReviewDeckSummary } from './dashboard';
import { isReviewItemDue, scheduleReviewItem } from './scheduler';
import { buildReviewStreak, toUtcDate } from './streak';
import type {
  ReviewDashboardData,
  ReviewDeckSummary,
  ReviewPageData,
  ReviewQuestionView,
  ReviewStreak,
  SubmitReviewResultInput,
  SubmitReviewResultResult,
} from './types';

export { buildReviewDeckSummary };

const DEFAULT_DUE_LIMIT = 20;

interface ReviewApplicationServiceOptions {
  reviewRepository?: ReviewRepository;
  readingRepository?: ReadingAssessmentRepository;
  reviewActivityRepository?: ReviewActivityRepository;
  now?: () => string;
}

export function createReviewApplicationService({
  reviewRepository = createReviewRepository(),
  readingRepository = createReadingAssessmentRepository(),
  reviewActivityRepository = createReviewActivityRepository(),
  now = () => new Date().toISOString(),
}: ReviewApplicationServiceOptions = {}) {
  async function loadStreak(): Promise<ReviewStreak> {
    const log = await reviewActivityRepository.read();
    return buildReviewStreak(log.days, now());
  }

  async function loadDeckSummary(): Promise<ReviewDeckSummary> {
    const items = await reviewRepository.listItems();
    return buildReviewDeckSummary(items, now());
  }

  async function loadDashboardData(): Promise<ReviewDashboardData> {
    const items = await reviewRepository.listItems();
    return buildReviewDashboardModel(items, now());
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

    // Log the review for streak/goal tracking; best-effort so it never fails grading.
    try {
      await reviewActivityRepository.recordReview(toUtcDate(nowIso));
    } catch (error) {
      console.error('[review] Failed to record review activity.', error);
    }

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
    loadDashboardData,
    loadStreak,
    loadReviewPageData,
    submitReviewResult,
  };
}

const defaultReviewApplicationService = createReviewApplicationService();

export const loadReviewPageData = defaultReviewApplicationService.loadReviewPageData;
export const loadReviewDeckSummary = defaultReviewApplicationService.loadDeckSummary;
export const loadReviewDashboardData = defaultReviewApplicationService.loadDashboardData;
export const loadReviewStreak = defaultReviewApplicationService.loadStreak;
export const submitReviewResult = defaultReviewApplicationService.submitReviewResult;
