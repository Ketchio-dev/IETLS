import {
  createReviewActivityRepository,
  type ReviewActivityRepository,
} from '@/lib/server/review-activity-repository';
import {
  createVocabReviewRepository,
  type VocabReviewRepository,
} from '@/lib/server/vocab-review-repository';
import { vocabularyDeck } from '@/lib/fixtures/vocabulary';
import { isReviewItemDue, scheduleReviewItem } from '@/lib/services/review/scheduler';
import { toUtcDate } from '@/lib/services/review/streak';

import { buildVocabOptions, isVocabAnswerCorrect } from './options';
import { deriveVocabSeed } from './seed';
import { buildVocabDeckSummary } from './summary';
import type {
  SubmitVocabReviewInput,
  SubmitVocabReviewResult,
  VocabCardView,
  VocabDeckSummary,
  VocabPageData,
  VocabReviewItem,
  VocabWord,
} from './types';

const DEFAULT_DUE_LIMIT = 15;

interface VocabApplicationServiceOptions {
  vocabRepository?: VocabReviewRepository;
  reviewActivityRepository?: ReviewActivityRepository;
  words?: VocabWord[];
  now?: () => string;
}

export function createVocabApplicationService({
  vocabRepository = createVocabReviewRepository(),
  reviewActivityRepository = createReviewActivityRepository(),
  words = vocabularyDeck,
  now = () => new Date().toISOString(),
}: VocabApplicationServiceOptions = {}) {
  const wordById = new Map(words.map((word) => [word.id, word] as const));

  async function ensureSeeded(nowIso: string): Promise<VocabReviewItem[]> {
    const items = await vocabRepository.listItems();
    const additions = deriveVocabSeed(words, new Set(items.map((item) => item.id)), nowIso);
    return additions.length === 0 ? items : vocabRepository.upsertItems(additions);
  }

  async function loadSummary(): Promise<VocabDeckSummary> {
    const nowIso = now();
    return buildVocabDeckSummary(await ensureSeeded(nowIso), nowIso);
  }

  async function loadPageData(limit = DEFAULT_DUE_LIMIT): Promise<VocabPageData> {
    const nowIso = now();
    const items = await ensureSeeded(nowIso);
    const dueItems = items.filter((item) => isReviewItemDue(item, nowIso)).slice(0, limit);

    const dueCards: VocabCardView[] = [];
    for (const item of dueItems) {
      const word = wordById.get(item.wordId);
      if (!word) {
        continue;
      }

      dueCards.push({
        itemId: item.id,
        wordId: word.id,
        word: word.word,
        partOfSpeech: word.partOfSpeech,
        options: buildVocabOptions(word),
        status: item.status,
        dueAt: item.dueAt,
      });
    }

    return {
      summary: buildVocabDeckSummary(items, nowIso),
      dueCards,
      generatedAt: nowIso,
    };
  }

  async function submitResult(input: SubmitVocabReviewInput): Promise<SubmitVocabReviewResult> {
    const itemId = typeof input.itemId === 'string' ? input.itemId.trim() : '';
    const answer = typeof input.answer === 'string' ? input.answer : '';

    if (!itemId) {
      return { ok: false, error: 'Provide the vocab itemId.', status: 400 };
    }

    const nowIso = now();
    const items = await ensureSeeded(nowIso);
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) {
      return { ok: false, error: 'Unknown vocab item.', status: 404 };
    }

    const word = wordById.get(item.wordId);
    if (!word) {
      return { ok: false, error: 'The source word is no longer available.', status: 404 };
    }

    const isCorrect = isVocabAnswerCorrect(word, answer);
    const updated = scheduleReviewItem(item, isCorrect ? 'correct' : 'incorrect', nowIso);

    await vocabRepository.upsertItems([updated]);

    // Vocab reviews feed the same activity log as Reading reviews, so streaks
    // reflect the learner's whole review habit. Best-effort — never fail grading.
    try {
      await reviewActivityRepository.recordReview(toUtcDate(nowIso));
    } catch (error) {
      console.error('[vocab] Failed to record review activity.', error);
    }

    const remainingDueCount = items
      .map((candidate) => (candidate.id === updated.id ? updated : candidate))
      .filter((candidate) => isReviewItemDue(candidate, nowIso)).length;

    return {
      ok: true,
      payload: {
        itemId: updated.id,
        word: word.word,
        isCorrect,
        submittedAnswer: answer,
        correctDefinition: word.definition,
        example: word.example,
        status: updated.status,
        nextDueAt: updated.dueAt,
        intervalDays: updated.intervalDays,
        remainingDueCount,
      },
    };
  }

  return {
    loadSummary,
    loadPageData,
    submitResult,
  };
}

const defaultVocabApplicationService = createVocabApplicationService();

export const loadVocabPageData = defaultVocabApplicationService.loadPageData;
export const loadVocabDeckSummary = defaultVocabApplicationService.loadSummary;
export const submitVocabReviewResult = defaultVocabApplicationService.submitResult;
