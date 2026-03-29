import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  sampleAssessmentReport,
  sampleAssessmentReportsByPromptId,
  samplePrompt,
  sampleTask1Prompt,
  writingPromptBank,
} from '@/lib/fixtures/writing';
import type { WritingPrompt } from '@/lib/domain';
import { buildPromptRecommendations } from '@/lib/services/writing/prompt-recommendations';

import { WritingPracticeShell } from '../writing-practice-shell';

const task2PromptCount = writingPromptBank.filter((prompt) => prompt.taskType === 'task-2').length;

describe('WritingPracticeShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the prompt and updates the saved history after a submission', async () => {
    const updatedReport = {
      ...sampleAssessmentReport,
      overallBand: 7,
      overallBandRange: { lower: 6.5, upper: 7 },
      summary: 'Updated report summary',
      evaluationTrace: {
        ...sampleAssessmentReport.evaluationTrace,
        scorerProvider: 'openrouter',
        scorerModel: 'google/gemini-3-flash',
        configuredProvider: 'openrouter',
        usedMockFallback: false,
      },
    };

    const savedAssessments = [
      {
        submissionId: 'attempt-1',
        promptId: samplePrompt.id,
        taskType: samplePrompt.taskType,
        createdAt: '2026-03-26T16:00:00.000Z',
        timeSpentMinutes: 33,
        wordCount: 270,
        report: updatedReport,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        report: updatedReport,
        recentAttempts: [
          {
            submissionId: 'attempt-1',
            promptId: samplePrompt.id,
            taskType: samplePrompt.taskType,
            overallBand: 7,
            overallBandRange: { lower: 6.5, upper: 7.0 },
            confidence: 'medium',
            estimatedWordCount: 270,
            summary: 'Updated report summary',
            createdAt: '2026-03-26T16:00:00.000Z',
          },
        ],
        savedAssessments,
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    expect(screen.getAllByText(samplePrompt.title).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /score my essay/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/writing/assessment',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const summaryMatches = await screen.findAllByText('Updated report summary');
    expect(summaryMatches.length).toBeGreaterThan(0);
    expect(await screen.findByText(/1 for this prompt/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /turn this report into the next better draft/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /open next recommended prompt/i })).toBeInTheDocument();
  });

  it('keeps scoring disabled until the active task reaches its minimum word target', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    const submitButton = screen.getByRole('button', { name: /score my essay/i });
    expect(submitButton).toBeEnabled();
    expect(screen.getByText(/minimum reached/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /essay response/i }), {
      target: { value: 'Too short to score yet.' },
    });

    expect(screen.getByRole('button', { name: /score my essay/i })).toBeDisabled();
    expect(screen.getByText(/more to unlock scoring/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('tab', { name: /writing task 1/i })[0]!);

    expect(screen.getByRole('button', { name: /score my response/i })).toBeEnabled();
    expect(screen.getByText(/minimum reached/i)).toBeInTheDocument();
  });

  it('shows a first-run quick-start guide with minimum-word guidance', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    expect(screen.getByRole('heading', { name: /practice ielts writing with instant scoring feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /follow the same 3-step loop every time/i })).toBeInTheDocument();
    expect(screen.getByText(/1\. pick a task/i)).toBeInTheDocument();
    expect(screen.getAllByText(/writing task 2: at least 250 words/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /use the estimate as a practice guide, not an official result/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /turn this report into the next better draft/i })).toBeInTheDocument();
    expect(screen.getByText(/task 1 needs 150\+ words\. task 2 needs 250\+ words\./i)).toBeInTheDocument();
  });

  it('switches between prompts in the prompt bank', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    fireEvent.click(screen.getAllByRole('button', { name: /online education versus classroom learning/i })[0]);

    expect(screen.getAllByText(/some people think online education is now a better alternative/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Agree \/ disagree/i).length).toBeGreaterThan(0);
  });

  it('filters the prompt bank by question type, difficulty, theme, and topic search', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    fireEvent.change(screen.getByLabelText(/filter prompts by question type/i), {
      target: { value: 'Discuss both views + opinion' },
    });
    fireEvent.change(screen.getByLabelText(/filter prompts by difficulty/i), {
      target: { value: 'Stretch' },
    });
    fireEvent.change(screen.getByLabelText(/filter prompts by theme/i), {
      target: { value: 'Policy' },
    });

    expect(
      screen.getByText(new RegExp(`showing \\d+ of ${task2PromptCount} writing task 2 prompts`, 'i')),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Discuss both views \+ opinion/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /online education versus classroom learning/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Stretch/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Policy/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/search prompts by topic/i), {
      target: { value: 'tourist tax' },
    });

    expect(screen.getByText(new RegExp(`showing 1 of ${task2PromptCount} writing task 2 prompts`, 'i'))).toBeInTheDocument();
    expect(screen.getAllByText(/tourist taxes in popular destinations/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/search prompts by topic/i), {
      target: { value: 'zzz-unmatched-topic' },
    });

    expect(screen.getByText(/no prompts match this filter yet/i)).toBeInTheDocument();
  });

  it('renders a dashboard entry link without affecting practice-shell task switching', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    const dashboardLinks = screen.getAllByRole('link', { name: /open dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    fireEvent.click(screen.getAllByRole('tab', { name: /writing task 1/i })[0]!);

    expect(screen.getAllByText(sampleTask1Prompt.title).length).toBeGreaterThan(0);
    screen.getAllByRole('link', { name: /open dashboard/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  it('hydrates the requested prompt and saved attempt for dashboard resume links', () => {
    const resumeReport = {
      ...sampleAssessmentReportsByPromptId[sampleTask1Prompt.id],
      summary: 'Resume target report summary',
      promptId: sampleTask1Prompt.id,
      taskType: sampleTask1Prompt.taskType,
    };

    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialAttemptId: 'attempt-task-1',
      initialHistory: [
        {
          submissionId: 'attempt-task-1',
          promptId: sampleTask1Prompt.id,
          taskType: sampleTask1Prompt.taskType,
          overallBand: 6.5,
          overallBandRange: { lower: 6, upper: 6.5 },
          confidence: 'medium',
          estimatedWordCount: 181,
          summary: 'Resume target report summary',
          createdAt: '2026-03-26T15:00:00.000Z',
        },
      ],
      initialPromptId: sampleTask1Prompt.id,
      initialReport: resumeReport,
      initialSavedAssessments: [
        {
          submissionId: 'attempt-task-1',
          promptId: sampleTask1Prompt.id,
          taskType: sampleTask1Prompt.taskType,
          createdAt: '2026-03-26T15:00:00.000Z',
          timeSpentMinutes: 19,
          wordCount: 181,
          report: resumeReport,
        },
      ],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    expect(screen.getAllByText(sampleTask1Prompt.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/resume target report summary/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 for this prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/viewing report/i)).toBeInTheDocument();
  });

  it('switches to Task 1 and renders the structured visual task', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    fireEvent.click(screen.getAllByRole('tab', { name: /writing task 1/i })[0]!);

    expect(screen.getAllByText(sampleTask1Prompt.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/structured visual task/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/passengers at a london underground station/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('img', { name: /line chart for passengers at a london underground station/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('table', { name: /passengers at a london underground station data table/i }).length,
    ).toBeGreaterThan(0);
  });

  it('renders the Task 1 table prompt with a real table renderer', () => {
    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    fireEvent.click(screen.getAllByRole('tab', { name: /writing task 1/i })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: /water use in australia/i })[0]!);

    expect(
      screen.getByRole('table', { name: /water consumption in australia data table/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/agriculture \(2004\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/billions of litres/i).length).toBeGreaterThan(0);
  });

  it('jumps to the recommended next prompt to avoid repeating the active one', () => {
    const recommendations = buildPromptRecommendations({
      prompts: writingPromptBank.filter((prompt) => prompt.taskType === 'task-2'),
      savedAttempts: [],
      taskType: 'task-2',
      excludePromptId: samplePrompt.id,
    }, 3);

    render(createElement(WritingPracticeShell, {
      fallbackReports: sampleAssessmentReportsByPromptId,
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: writingPromptBank,
    }));

    expect(screen.getByText(/recommended next:/i)).toBeInTheDocument();
    if (recommendations[1]) {
      fireEvent.click(screen.getByRole('button', { name: /show another suggestion/i }));
      expect(screen.getAllByText(recommendations[1].prompt.title).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getByRole('button', { name: /jump to recommended prompt/i }));

    expect(recommendations[0] ?? recommendations[1]).toBeDefined();
    const expectedPrompt = recommendations[1]?.prompt ?? recommendations[0]!.prompt;
    expect(screen.getAllByText(expectedPrompt.title).length).toBeGreaterThan(0);
  });

  it('keeps prompt search working when a prompt is missing keyword targets', () => {
    const promptWithoutKeywords = {
      ...samplePrompt,
      id: 'task-2-missing-keywords',
      title: 'Transit pricing and city access',
      prompt:
        'Some people think cities should charge drivers to enter busy areas while others disagree. Discuss both views and give your opinion.',
      keywordTargets: undefined,
    } as unknown as WritingPrompt;

    render(createElement(WritingPracticeShell, {
      fallbackReports: {
        ...sampleAssessmentReportsByPromptId,
        [promptWithoutKeywords.id]: {
          ...sampleAssessmentReport,
          promptId: promptWithoutKeywords.id,
        },
      },
      initialHistory: [],
      initialReport: sampleAssessmentReport,
      initialSavedAssessments: [],
      prompt: samplePrompt,
      prompts: [promptWithoutKeywords, ...writingPromptBank],
    }));

    fireEvent.change(screen.getByLabelText(/search prompts by topic/i), {
      target: { value: 'transit pricing' },
    });

    expect(screen.getAllByText(/transit pricing and city access/i).length).toBeGreaterThan(0);
  });
});
