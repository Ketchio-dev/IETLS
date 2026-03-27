import { describe, expect, it } from 'vitest';

import { buildSummary, buildWarnings } from '../feedback-generator';

describe('feedback-generator', () => {
  it('keeps Task 1 summaries and warnings task-aware', () => {
    expect(buildSummary('task-1', { lower: 6, upper: 6.5 }, 149)).toContain('Task 1 estimate');
    expect(buildSummary('task-1', { lower: 6, upper: 6.5 }, 149)).not.toContain('Task 2');
    expect(buildWarnings('task-1', 149, 'medium')).toEqual([
      {
        code: 'practice-estimate',
        message: 'This is an AI-assisted practice estimate and should not be treated as an official IELTS score.',
      },
      {
        code: 'single-task-scope',
        message: 'This estimate covers only Task 1. Official IELTS Writing combines Task 1 and Task 2, and Task 2 carries more weight.',
      },
      {
        code: 'under-length',
        message: 'The response is below the usual Task 1 target length, which limits scoring confidence.',
      },
    ]);
  });

  it('keeps Task 2 under-length warnings on the 250-word gate', () => {
    expect(buildWarnings('task-2', 249, 'medium')[2]?.message).toContain('Task 2 target length');
  });

  it('surfaces single-task scope even when length is sufficient', () => {
    expect(buildWarnings('task-2', 260, 'high')).toContainEqual({
      code: 'single-task-scope',
      message: 'This estimate covers only Task 2. Official IELTS Writing combines Task 1 and Task 2, even though Task 2 carries more weight.',
    });
  });
});
