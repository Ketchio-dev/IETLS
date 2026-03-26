import { describe, expect, it, vi } from 'vitest';

import {
  LISTENING_ASSESSMENT_MODULE_ID,
  READING_ASSESSMENT_MODULE_ID,
  SPEAKING_ASSESSMENT_MODULE_ID,
  WRITING_ASSESSMENT_MODULE_ID,
  createAssessmentModuleRegistry,
  getAssessmentModuleRegistry,
  type AssessmentModuleDefinition,
} from '../registry';

type ModuleId =
  | typeof WRITING_ASSESSMENT_MODULE_ID
  | typeof SPEAKING_ASSESSMENT_MODULE_ID
  | typeof READING_ASSESSMENT_MODULE_ID
  | typeof LISTENING_ASSESSMENT_MODULE_ID;

function createModuleSpies<TModuleId extends ModuleId>(id: TModuleId): AssessmentModuleDefinition<TModuleId> {
  return {
    id,
    loadDashboardPageData: vi.fn().mockResolvedValue({ kind: `${id}-dashboard` }),
    loadPracticePageData: vi.fn().mockResolvedValue({ kind: `${id}-practice` }),
    loadTaskData: vi.fn().mockResolvedValue({ kind: `${id}-task` }),
    submitAssessment: vi.fn().mockResolvedValue({ ok: false, error: `${id}-submit`, status: 501 }),
  } as unknown as AssessmentModuleDefinition<TModuleId>;
}

describe('assessment module registry', () => {
  it('registers all current IELTS skill modules in the default catalog', () => {
    expect(getAssessmentModuleRegistry().listModuleIds()).toEqual([
      WRITING_ASSESSMENT_MODULE_ID,
      SPEAKING_ASSESSMENT_MODULE_ID,
      READING_ASSESSMENT_MODULE_ID,
      LISTENING_ASSESSMENT_MODULE_ID,
    ]);
  });

  it('routes operations through whichever assessment module is resolved', async () => {
    const writingModule = createModuleSpies(WRITING_ASSESSMENT_MODULE_ID);
    const speakingModule = createModuleSpies(SPEAKING_ASSESSMENT_MODULE_ID);
    const readingModule = createModuleSpies(READING_ASSESSMENT_MODULE_ID);
    const listeningModule = createModuleSpies(LISTENING_ASSESSMENT_MODULE_ID);
    const registry = createAssessmentModuleRegistry([writingModule, speakingModule, readingModule, listeningModule]);

    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).loadPracticePageData({ promptId: 'prompt-1' })).resolves.toEqual({ kind: 'writing-practice' });
    await expect(registry.requireModule(SPEAKING_ASSESSMENT_MODULE_ID).loadTaskData()).resolves.toEqual({ kind: 'speaking-task' });
    await expect(registry.requireModule(READING_ASSESSMENT_MODULE_ID).loadDashboardPageData()).resolves.toEqual({ kind: 'reading-dashboard' });
    await expect(registry.requireModule(LISTENING_ASSESSMENT_MODULE_ID).submitAssessment({ note: 'stub' })).resolves.toEqual({
      ok: false,
      error: 'listening-submit',
      status: 501,
    });
  });
});
