import { describe, expect, it, vi } from 'vitest';

import {
  SPEAKING_ASSESSMENT_MODULE_ID,
  WRITING_ASSESSMENT_MODULE_ID,
  createAssessmentModuleRegistry,
  getAssessmentModuleRegistry,
  type AssessmentModuleDefinition,
} from '../registry';

function createModuleSpies<TModuleId extends typeof WRITING_ASSESSMENT_MODULE_ID | typeof SPEAKING_ASSESSMENT_MODULE_ID>(
  id: TModuleId,
): AssessmentModuleDefinition<TModuleId> {
  return {
    id,
    loadDashboardPageData: vi.fn().mockResolvedValue({ kind: `${id}-dashboard` }),
    loadPracticePageData: vi.fn().mockResolvedValue({ kind: `${id}-practice` }),
    loadTaskData: vi.fn().mockResolvedValue({ kind: `${id}-task` }),
    submitAssessment: vi.fn().mockResolvedValue({ ok: true, payload: { kind: `${id}-submit` } }),
  } as unknown as AssessmentModuleDefinition<TModuleId>;
}

describe('assessment module registry', () => {
  it('registers writing and speaking in the default catalog', () => {
    expect(getAssessmentModuleRegistry().listModuleIds()).toEqual([
      WRITING_ASSESSMENT_MODULE_ID,
      SPEAKING_ASSESSMENT_MODULE_ID,
    ]);
  });

  it('routes operations through whichever assessment module is resolved', async () => {
    const writingModule = createModuleSpies(WRITING_ASSESSMENT_MODULE_ID);
    const speakingModule = createModuleSpies(SPEAKING_ASSESSMENT_MODULE_ID);
    const registry = createAssessmentModuleRegistry([writingModule, speakingModule]);
    const searchParams = { promptId: 'prompt-1', attemptId: 'attempt-1' };

    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).loadPracticePageData(searchParams)).resolves.toEqual({
      kind: 'writing-practice',
    });
    await expect(registry.requireModule(SPEAKING_ASSESSMENT_MODULE_ID).loadTaskData()).resolves.toEqual({
      kind: 'speaking-task',
    });
    await expect(
      registry.requireModule(SPEAKING_ASSESSMENT_MODULE_ID).submitAssessment({ transcript: 'placeholder' }),
    ).resolves.toEqual({
      ok: true,
      payload: { kind: 'speaking-submit' },
    });

    expect(writingModule.loadPracticePageData).toHaveBeenCalledWith(searchParams);
    expect(speakingModule.loadTaskData).toHaveBeenCalledWith();
    expect(speakingModule.submitAssessment).toHaveBeenCalledWith({ transcript: 'placeholder' });
  });
});
