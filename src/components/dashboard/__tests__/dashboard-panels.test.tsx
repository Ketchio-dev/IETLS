import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DashboardMetricGrid,
  StudyPlanPanel,
  formatBandRange,
  formatCountLabel,
  formatTaskTypeList,
} from '../index';

afterEach(() => {
  cleanup();
});

describe('dashboard presentation helpers', () => {
  it('formats shared dashboard labels', () => {
    expect(formatBandRange({ lower: 6.5, upper: 7 })).toBe('Band 6.5-7.0');
    expect(formatBandRange(null)).toBe('No scored range yet');
    expect(formatTaskTypeList(['task-1', 'task-2', 'task-1'])).toBe('Task 1 + Task 2');
    expect(formatTaskTypeList(undefined)).toBe('All writing tasks');
    expect(formatCountLabel(1, 'metric')).toBe('1 metric');
    expect(formatCountLabel(3, 'metric')).toBe('3 metrics');
  });
});

describe('dashboard presentation components', () => {
  it('renders the metric grid with snapshot cards', () => {
    render(createElement(DashboardMetricGrid, {
      title: 'Writing dashboard',
      description: 'A compact dashboard snapshot for the latest attempt set.',
      metrics: [
        {
          id: 'overall-band',
          label: 'Overall band',
          value: 'Band 6.5',
          detail: 'Stable over the last three saved reports.',
          badge: 'Latest range 6.0-7.0',
        },
        {
          id: 'attempt-volume',
          label: 'Attempts reviewed',
          value: '4',
          detail: 'Enough evidence to suggest one high-impact focus block.',
          eyebrow: 'Attempts',
        },
      ],
    }));

    expect(screen.getByRole('heading', { name: /writing dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/band 6.5/i)).toBeInTheDocument();
    expect(screen.getByText(/latest range 6.0-7.0/i)).toBeInTheDocument();
    expect(screen.getByText(/enough evidence to suggest one high-impact focus block/i)).toBeInTheDocument();
  });

  it('renders a study plan with focus steps and carry-forward habits', () => {
    render(createElement(StudyPlanPanel, {
      plan: {
        summary: 'Prioritise overview control and comparison language across the next two sessions.',
        horizonLabel: 'Next 7 days',
        recommendedSessionLabel: '2 x 35 min',
        steps: [
          {
            id: 'overview',
            title: 'Sharpen the Task 1 overview',
            detail: 'The latest report suggests the overview exists but still misses the clearest comparison.',
            actions: [
              'Draft two overview sentences before writing the body paragraphs.',
              'Underline the biggest contrast in the chart before starting.',
            ],
            criterion: 'Task Achievement',
            taskTypes: ['task-1'],
            targetRange: { lower: 6, upper: 6.5 },
            sessionLabel: 'Session 1',
          },
          {
            id: 'support',
            title: 'Keep sentence control stable',
            detail: 'Grammar is holding steady, so protect it while adding clearer comparisons.',
            actions: ['Reuse one proofread pass for verb tense and subject agreement.'],
            criterion: 'Grammatical Range & Accuracy',
            taskTypes: ['task-1', 'task-2'],
            targetRange: null,
            sessionLabel: 'Session 2',
          },
        ],
        carryForward: ['Keep introductions to one concise purpose sentence.'],
      },
    }));

    expect(screen.getByRole('heading', { name: /recommended study plan/i })).toBeInTheDocument();
    expect(screen.getByText(/next 7 days/i)).toBeInTheDocument();
    expect(screen.getByText(/2 x 35 min/i)).toBeInTheDocument();
    expect(screen.getByText(/sharpen the task 1 overview/i)).toBeInTheDocument();
    expect(screen.getByText(/task 1 \+ task 2/i)).toBeInTheDocument();
    expect(screen.getByText(/keep introductions to one concise purpose sentence/i)).toBeInTheDocument();
  });

  it('renders the empty study-plan state without focus cards', () => {
    render(createElement(StudyPlanPanel, { plan: null }));

    expect(screen.getByText(/complete a few scored attempts to unlock a more specific study plan/i)).toBeInTheDocument();
    expect(screen.queryByText(/keep carrying forward/i)).not.toBeInTheDocument();
  });
});
