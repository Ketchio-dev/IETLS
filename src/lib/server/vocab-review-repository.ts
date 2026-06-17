import type { VocabReviewItem } from '@/lib/services/vocab/types';

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';

const VOCAB_REVIEW_ITEMS_FILE: StorageFile = 'vocabReviewItems';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortItems(items: VocabReviewItem[]): VocabReviewItem[] {
  return items.slice().sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id));
}

export interface VocabReviewRepository {
  listItems(): Promise<VocabReviewItem[]>;
  upsertItems(items: VocabReviewItem[]): Promise<VocabReviewItem[]>;
}

export function createVocabReviewRepository(storage: JsonStoragePort = getStoragePort()): VocabReviewRepository {
  async function listItems() {
    const stored = await storage.readJsonFile<VocabReviewItem[]>(VOCAB_REVIEW_ITEMS_FILE, []);
    return sortItems(stored).map(clone);
  }

  async function upsertItems(items: VocabReviewItem[]) {
    if (items.length === 0) {
      return listItems();
    }

    const incomingById = new Map(items.map((item) => [item.id, clone(item)] as const));

    const updated = await storage.updateJsonFile(VOCAB_REVIEW_ITEMS_FILE, [] as VocabReviewItem[], (stored) => {
      const merged = stored.map((item) => incomingById.get(item.id) ?? item);
      const storedIds = new Set(stored.map((item) => item.id));

      for (const item of items) {
        if (!storedIds.has(item.id)) {
          merged.push(clone(item));
        }
      }

      return sortItems(merged);
    });

    return updated.map(clone);
  }

  return {
    listItems,
    upsertItems,
  };
}
