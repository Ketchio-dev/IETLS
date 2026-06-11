import { describe, expect, it } from 'vitest';

import type { CriterionScore, EvidenceSignal, FeedbackAction } from '@/lib/domain';

import {
  buildCriterionCoachingPlan,
  buildReportCriterionCoachingPlan,
  buildSummary,
  buildWarnings,
  generateFeedbackActions,
} from '../feedback-generator';

describe('feedback-generator', () => {
  it('keeps Task 1 summaries and warnings task-aware', () => {
    expect(buildSummary('task-1', { lower: 6, upper: 6.5 }, 149)).toContain('Below the minimum for Task 1');
    expect(buildSummary('task-1', { lower: 6, upper: 6.5 }, 149)).not.toContain('Task 2');
    expect(buildWarnings('task-1', 149, 'medium')).toEqual([
      {
        code: 'practice-estimate',
        message: 'AI-assisted practice estimate. Do not treat it as an official IELTS score.',
      },
      {
        code: 'single-task-scope',
        message: 'This estimate covers only Task 1. Official IELTS Writing combines Task 1 and Task 2, and Task 2 carries more weight.',
      },
      {
        code: 'under-length',
        message: 'Below the minimum for Task 1. Score reliability improves only after the response is expanded.',
      },
    ]);
  });

  it('keeps Task 2 under-length warnings on the 250-word gate', () => {
    expect(buildWarnings('task-2', 249, 'medium')[2]?.message).toContain('Below the minimum for Task 2');
  });

  it('surfaces single-task scope even when length is sufficient', () => {
    expect(buildWarnings('task-2', 260, 'high')).toContainEqual({
      code: 'single-task-scope',
      message: 'This estimate covers only Task 2. Official IELTS Writing combines Task 1 and Task 2, even though Task 2 carries more weight.',
    });
  });

  it('orders feedback actions by weakest criterion and tightens the revision title', () => {
    const scores: CriterionScore[] = [
      {
        criterion: 'Lexical Resource',
        band: 6.5,
        bandRange: { lower: 6, upper: 6.5 },
        rationale: 'Vocabulary is serviceable but repetitive.',
        confidence: 'medium',
      },
      {
        criterion: 'Task Response',
        band: 5.5,
        bandRange: { lower: 5.5, upper: 6 },
        rationale: 'Main ideas are only partly developed.',
        confidence: 'medium',
      },
      {
        criterion: 'Coherence & Cohesion',
        band: 6,
        bandRange: { lower: 6, upper: 6.5 },
        rationale: 'Paragraph flow is mixed.',
        confidence: 'medium',
      },
    ];
    const evidence: EvidenceSignal[] = [
      {
        id: 'task-response-weak',
        criterion: 'Task Response',
        label: 'Idea development',
        strength: 'weak',
        detail: 'One body paragraph is underdeveloped.',
        source: 'rubric-based',
      },
    ];

    const actions = generateFeedbackActions(scores, evidence);

    expect(actions[0]).toMatchObject({
      criterion: 'Task Response',
      title: '1. Raise Task Response toward Band 6.0',
      impact: 'high',
    });
    expect(actions[1]?.title).toContain('Coherence & Cohesion');
  });

  it('builds a criterion coaching plan with a targeted checklist', () => {
    const plan = buildCriterionCoachingPlan(
      'task-2',
      {
        criterion: 'Task Response',
        band: 6,
        bandRange: { lower: 6, upper: 6.5 },
        rationale: 'Position is clear but support is uneven.',
        confidence: 'medium',
      },
      {
        title: '1. Raise Task Response toward Band 6.5',
        criterion: 'Task Response',
        description: 'Add one more fully developed idea with a cause, consequence, and stakeholder impact.',
        impact: 'high',
      },
    );

    expect(plan.focusSummary).toContain('Band 6.5');
    expect(plan.whyItMatters).toContain('sets the ceiling');
    expect(plan.fixNow).toContain('Add one more fully developed idea');
    expect(plan.checkBeforeRescore).toContain('each body paragraph');
    expect(plan.checklist).toContain('State one clear position in the introduction and keep it stable.');
    expect(plan.checklist[1]).toContain('Add one more fully developed idea');
  });

  it('builds report-level criterion coaching from either the weakest or preferred criterion', () => {
    const report = {
      taskType: 'task-2' as const,
      criterionScores: [
        {
          criterion: 'Task Response',
          band: 6,
          bandRange: { lower: 6, upper: 6.5 },
          rationale: 'Position is present but development is uneven.',
          confidence: 'medium',
        },
        {
          criterion: 'Lexical Resource',
          band: 5.5,
          bandRange: { lower: 5.5, upper: 6 },
          rationale: 'Vocabulary is repetitive.',
          confidence: 'medium',
        },
      ] satisfies CriterionScore[],
      nextSteps: [
        {
          title: 'Raise Task Response',
          criterion: 'Task Response',
          description: 'Add one more fully developed idea with a cause, consequence, and stakeholder impact.',
          impact: 'high',
        },
        {
          title: 'Raise Lexical Resource',
          criterion: 'Lexical Resource',
          description: 'Replace repeated general words with prompt-specific policy vocabulary.',
          impact: 'medium',
        },
      ] satisfies FeedbackAction[],
    };

    const weakestPlan = buildReportCriterionCoachingPlan(report);
    const preferredPlan = buildReportCriterionCoachingPlan(report, 'Task Response');

    expect(weakestPlan?.criterion).toBe('Lexical Resource');
    expect(weakestPlan?.fixNow).toContain('prompt-specific policy vocabulary');
    expect(preferredPlan?.criterion).toBe('Task Response');
    expect(preferredPlan?.fixNow).toContain('fully developed idea');
  });

  it('falls back to the weakest report criterion when a preferred criterion is unavailable', () => {
    const report = {
      taskType: 'task-1' as const,
      criterionScores: [
        {
          criterion: 'Task Achievement',
          band: 6,
          bandRange: { lower: 6, upper: 6.5 },
          rationale: 'Overview needs clearer grouping.',
          confidence: 'medium',
        },
        {
          criterion: 'Lexical Resource',
          band: 5.5,
          bandRange: { lower: 5.5, upper: 6 },
          rationale: 'Vocabulary is repetitive.',
          confidence: 'medium',
        },
      ] satisfies CriterionScore[],
      nextSteps: [
        {
          title: 'Raise Lexical Resource',
          criterion: 'Lexical Resource',
          description: 'Replace repeated general words with prompt-specific chart vocabulary.',
          impact: 'medium',
        },
      ] satisfies FeedbackAction[],
    };

    const plan = buildReportCriterionCoachingPlan(report, 'Task Response');

    expect(plan?.criterion).toBe('Lexical Resource');
    expect(plan?.fixNow).toContain('prompt-specific chart vocabulary');
  });
});
