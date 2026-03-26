import { describe, expect, it } from 'vitest';

import { getAssessmentModule, getDefaultAssessmentModule, listAssessmentModules } from '../registry';
import { buildPracticeWorkspaceHref, writingAssessmentWorkspace } from '../workspace';

describe('assessment module registry', () => {
  it('registers the writing workspace through a shared module boundary', () => {
    const modules = listAssessmentModules();
    const writingModule = getAssessmentModule('writing');

    expect(modules).toHaveLength(1);
    expect(getDefaultAssessmentModule()).toBe(writingModule);
    expect(writingModule.workspace).toEqual(writingAssessmentWorkspace);
    expect(writingModule.workspace.assessmentApiPath).toBe('/api/writing/assessment');
    expect(typeof writingModule.loadPracticePageData).toBe('function');
    expect(typeof writingModule.loadDashboardPageData).toBe('function');
    expect(typeof writingModule.loadTaskData).toBe('function');
    expect(typeof writingModule.submitAssessment).toBe('function');
  });

  it('builds practice-shell resume links from the shared workspace config', () => {
    expect(buildPracticeWorkspaceHref(writingAssessmentWorkspace, {})).toBe('/');
    expect(
      buildPracticeWorkspaceHref(writingAssessmentWorkspace, {
        promptId: 'task-1-line-graph',
        attemptId: 'attempt-4',
      }),
    ).toBe('/?promptId=task-1-line-graph&attemptId=attempt-4');
  });
});
