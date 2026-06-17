import type { ReviewActivityLog } from '@/lib/services/review/types';

import { getStoragePort, type JsonStoragePort, type StorageFile } from './storage';

const REVIEW_ACTIVITY_FILE: StorageFile = 'reviewActivity';

function emptyLog(): ReviewActivityLog {
  return { days: {} };
}

export interface ReviewActivityRepository {
  read(): Promise<ReviewActivityLog>;
  recordReview(dateKey: string): Promise<void>;
}

export function createReviewActivityRepository(storage: JsonStoragePort = getStoragePort()): ReviewActivityRepository {
  async function read() {
    const stored = await storage.readJsonFile<ReviewActivityLog>(REVIEW_ACTIVITY_FILE, emptyLog());
    return { days: { ...stored.days } };
  }

  async function recordReview(dateKey: string) {
    await storage.updateJsonFile<ReviewActivityLog>(REVIEW_ACTIVITY_FILE, emptyLog(), (current) => {
      const days = { ...current.days };
      days[dateKey] = (days[dateKey] ?? 0) + 1;
      return { days };
    });
  }

  return {
    read,
    recordReview,
  };
}
