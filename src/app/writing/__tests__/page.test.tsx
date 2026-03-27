import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { sampleAssessmentReport, samplePrompt, sampleTask1Prompt, writingPromptBank } from '@/lib/fixtures/writing';
import type { WritingPracticePageData } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadDefaultAssessmentPracticePageData: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadDefaultAssessmentPracticePageData: mocks.loadDefaultAssessmentPracticePageData,
}));

vi.mock('@/components/writing/writing-practice-shell', () => ({
  WritingPracticeShell: (props: unknown) => {
    mocks.shellSpy(props);
    return null;
  },
}));

import WritingPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

function buildMinimalWritingPageData(): WritingPracticePageData {
  return {
    prompts: writingPromptBank,
    prompt: samplePrompt,
    initialHistory: [],
    initialSavedAssessments: [],
    initialAttemptId: undefined,
    initialPromptId: samplePrompt.id,
    initialReport: sampleAssessmentReport,
    fallbackReports: {},
  };
}

describe('WritingPage', () => {
  it('wraps content in the shared app-shell layout with a breadcrumb', async () => {
    mocks.loadDefaultAssessmentPracticePageData.mockResolvedValue(buildMinimalWritingPageData());
    const { container } = render(await WritingPage({ searchParams: Promise.resolve({}) }));

    expect(container.querySelector('main.app-shell')).not.toBeNull();
    const breadcrumb = container.querySelector('nav.page-breadcrumb.page-breadcrumb--writing');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb!.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(breadcrumb!.querySelector('a.breadcrumb-link')?.getAttribute('href')).toBe('/');
    expect(breadcrumb!.querySelector('.breadcrumb-current')?.textContent).toBe('Writing practice');
  });

  it('renders a writing overview header with counts and a dashboard shortcut', async () => {
    const pageData = buildMinimalWritingPageData();
    pageData.initialHistory = [
      {
        submissionId: 'attempt-task-1',
        promptId: samplePrompt.id,
        taskType: samplePrompt.taskType,
        overallBand: 6.5,
        overallBandRange: { lower: 6, upper: 6.5 },
        confidence: 'medium',
        estimatedWordCount: 182,
        summary: 'Recent attempt summary',
        createdAt: '2026-03-27T13:00:00.000Z',
      },
    ];
    mocks.loadDefaultAssessmentPracticePageData.mockResolvedValue(pageData);

    const { container } = render(await WritingPage({ searchParams: Promise.resolve({}) }));

    const header = container.querySelector('.practice-page-header--writing');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('Writing practice');
    expect(header!.textContent).toContain(`${writingPromptBank.length} prompts`);
    expect(header!.textContent).toContain('1 recent attempt');
    expect(header!.querySelector('a.practice-meta-link')?.getAttribute('href')).toBe('/dashboard');
  });

  it('hydrates the dashboard resume selection from the shared assessment workspace', async () => {
    const recentAttempts = [
      {
        submissionId: 'attempt-task-1',
        promptId: sampleTask1Prompt.id,
        taskType: sampleTask1Prompt.taskType,
        overallBand: 6.5,
        overallBandRange: { lower: 6, upper: 6.5 },
        confidence: 'medium' as const,
        estimatedWordCount: 181,
        summary: 'Resume target report summary',
        createdAt: '2026-03-26T15:00:00.000Z',
      },
    ];
    const savedAssessments = [
      {
        submissionId: 'attempt-task-1',
        promptId: sampleTask1Prompt.id,
        taskType: sampleTask1Prompt.taskType,
        createdAt: '2026-03-26T15:00:00.000Z',
        timeSpentMinutes: 19,
        wordCount: 181,
        report: {
          ...sampleAssessmentReport,
          promptId: sampleTask1Prompt.id,
          taskType: sampleTask1Prompt.taskType,
          summary: 'Resume target report summary',
        },
      },
    ];
    const pageData: WritingPracticePageData = {
      ...buildMinimalWritingPageData(),
      initialHistory: recentAttempts,
      initialSavedAssessments: savedAssessments,
      initialAttemptId: 'attempt-task-1',
      initialPromptId: sampleTask1Prompt.id,
      initialReport: savedAssessments[0]!.report,
    };

    mocks.loadDefaultAssessmentPracticePageData.mockResolvedValue(pageData);

    render(
      await WritingPage({
        searchParams: Promise.resolve({
          promptId: 'missing-prompt-id',
          attemptId: 'attempt-task-1',
        }),
      }),
    );

    expect(mocks.loadDefaultAssessmentPracticePageData).toHaveBeenCalledWith({
      promptId: 'missing-prompt-id',
      attemptId: 'attempt-task-1',
    });
    expect(mocks.shellSpy).toHaveBeenCalledTimes(1);
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });

  it('passes through an explicitly requested prompt when it exists', async () => {
    const pageData: WritingPracticePageData = {
      ...buildMinimalWritingPageData(),
      initialPromptId: sampleTask1Prompt.id,
    };
    mocks.loadDefaultAssessmentPracticePageData.mockResolvedValue(pageData);

    render(
      await WritingPage({
        searchParams: {
          promptId: sampleTask1Prompt.id,
        },
      }),
    );

    expect(mocks.loadDefaultAssessmentPracticePageData).toHaveBeenCalledWith({
      promptId: sampleTask1Prompt.id,
      attemptId: undefined,
    });
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
