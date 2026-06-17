import type { ReviewItem } from '@/lib/services/review/types';

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';

const REVIEW_ITEMS_FILE: StorageFile = 'reviewItems';

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Soonest-due first, with a stable id tiebreak so ordering is deterministic. */
function sortItems(items: ReviewItem[]): ReviewItem[] {
  return items.slice().sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id));
}

export interface ReviewRepository {
  listItems(): Promise<ReviewItem[]>;
  upsertItems(items: ReviewItem[]): Promise<ReviewItem[]>;
}

export function createReviewRepository(storage: JsonStoragePort = getStoragePort()): ReviewRepository {
  async function listItems() {
    const stored = await storage.readJsonFile<ReviewItem[]>(REVIEW_ITEMS_FILE, []);
    return sortItems(stored).map(clone);
  }

  async function upsertItems(items: ReviewItem[]) {
    if (items.length === 0) {
      return listItems();
    }

    const incomingById = new Map(items.map((item) => [item.id, clone(item)] as const));

    const updated = await storage.updateJsonFile(REVIEW_ITEMS_FILE, [] as ReviewItem[], (stored) => {
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
