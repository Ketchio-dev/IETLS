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

import { WritingPracticeShell } from '../writing-practice-shell';

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
    fireEvent.click(screen.getByRole('button', { name: /generate practice estimate/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/writing/assessment',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const summaryMatches = await screen.findAllByText('Updated report summary');
    expect(summaryMatches.length).toBeGreaterThan(0);
    expect(await screen.findByText(/1 for this prompt/i)).toBeInTheDocument();
    const providerMatches = await screen.findAllByText(/Openrouter/i);
    expect(providerMatches.length).toBeGreaterThan(0);
    const modelMatches = await screen.findAllByText(/google\/gemini-3-flash/i);
    expect(modelMatches.length).toBeGreaterThan(0);
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

  it('switches to Task 1 and renders the structured visual brief', () => {
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
    expect(screen.getByText(/structured visual brief/i)).toBeInTheDocument();
    expect(screen.getByText(/passengers at a london underground station/i)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /line chart for passengers at a london underground station/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /passengers at a london underground station data table/i }),
    ).toBeInTheDocument();
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
});
