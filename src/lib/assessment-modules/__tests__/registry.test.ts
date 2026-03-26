import { describe, expect, it, vi } from 'vitest';

import {
  WRITING_ASSESSMENT_MODULE_ID,
  createAssessmentModuleRegistry,
  getAssessmentModuleRegistry,
  type AssessmentModuleDefinition,
} from '../registry';

function createModuleSpies(): AssessmentModuleDefinition<typeof WRITING_ASSESSMENT_MODULE_ID> {
  return {
    id: WRITING_ASSESSMENT_MODULE_ID,
    loadDashboardPageData: vi.fn().mockResolvedValue({ kind: 'dashboard' }),
    loadPracticePageData: vi.fn().mockResolvedValue({ kind: 'practice' }),
    loadTaskData: vi.fn().mockResolvedValue({ kind: 'task' }),
    submitAssessment: vi.fn().mockResolvedValue({ ok: true, payload: { kind: 'submit' } }),
  } as unknown as AssessmentModuleDefinition<typeof WRITING_ASSESSMENT_MODULE_ID>;
}

describe('assessment module registry', () => {
  it('registers the writing module in the default catalog', () => {
    expect(getAssessmentModuleRegistry().listModuleIds()).toEqual([WRITING_ASSESSMENT_MODULE_ID]);
  });

  it('routes operations through the resolved assessment module', async () => {
    const assessmentModule = createModuleSpies();
    const registry = createAssessmentModuleRegistry([assessmentModule]);
    const searchParams = { promptId: 'prompt-1', attemptId: 'attempt-1' };
    const submission = {
      promptId: 'prompt-1',
      response: 'Long enough response text for the registry handoff.',
      timeSpentMinutes: 22,
    };

    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).loadPracticePageData(searchParams)).resolves.toEqual({
      kind: 'practice',
    });
    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).loadDashboardPageData()).resolves.toEqual({
      kind: 'dashboard',
    });
    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).loadTaskData()).resolves.toEqual({
      kind: 'task',
    });
    await expect(registry.requireModule(WRITING_ASSESSMENT_MODULE_ID).submitAssessment(submission)).resolves.toEqual({
      ok: true,
      payload: { kind: 'submit' },
    });

    expect(assessmentModule.loadPracticePageData).toHaveBeenCalledWith(searchParams);
    expect(assessmentModule.loadDashboardPageData).toHaveBeenCalledWith();
    expect(assessmentModule.loadTaskData).toHaveBeenCalledWith();
    expect(assessmentModule.submitAssessment).toHaveBeenCalledWith(submission);
  });
});
