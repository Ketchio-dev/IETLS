import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LISTENING_ASSESSMENT_MODULE_ID,
  READING_ASSESSMENT_MODULE_ID,
  SPEAKING_ASSESSMENT_MODULE_ID,
} from '@/lib/assessment-modules/registry';
import type { PlaceholderAssessmentDashboardPageData } from '@/lib/services/assessment-placeholders/application-service';
import type { ReadingDashboardPageData } from '@/lib/services/reading/types';
import { sampleSpeakingSavedSessions, speakingPromptBank } from '@/lib/fixtures/speaking';
import type { SpeakingDashboardPageData } from '@/lib/services/speaking/types';
import type { ProgressSummary, StudyPlanSnapshot, WritingDashboardSummary } from '@/lib/domain';
import { writingPromptBank } from '@/lib/fixtures/writing';
import type { WritingDashboardPageData } from '@/lib/services/writing/application-service';

const mocks = vi.hoisted(() => ({
  loadDefaultAssessmentDashboardPageData: vi.fn(),
  loadAssessmentDashboardPageData: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadDefaultAssessmentDashboardPageData: mocks.loadDefaultAssessmentDashboardPageData,
  loadAssessmentDashboardPageData: mocks.loadAssessmentDashboardPageData,
}));

import HomePage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('prioritizes reading and writing while keeping speaking and listening secondary', async () => {
    const writingSummary: WritingDashboardSummary = {
      totalAttempts: 12,
      taskCounts: { 'task-1': 4, 'task-2': 8 },
      latestRange: { lower: 6.5, upper: 7 },
      bestBand: 7,
      averageBand: 6.6,
      averageWordCount: 254,
      totalPracticeMinutes: 318,
      activeDays: 7,
      latestAttemptAt: '2026-03-26T17:00:00.000Z',
      providerBreakdown: [],
      criterionSummaries: [],
      strongestCriterion: null,
      weakestCriterion: null,
    };
    const writingProgress: ProgressSummary = {
      direction: 'improving',
      label: 'Improving',
      detail: 'Recent attempts are trending upward.',
      delta: 0.4,
      latestRange: { lower: 6.5, upper: 7 },
      attemptsConsidered: 4,
      averageWordCount: 268,
    };
    const writingStudyPlan: StudyPlanSnapshot = {
      version: 2,
      generatedAt: '2026-03-26T17:10:00.000Z',
      basedOnSubmissionId: null,
      attemptsConsidered: 12,
      headline: 'Keep writing momentum steady',
      focus: 'Resume the strongest recent prompt first.',
      horizonLabel: 'Next 3 blocks',
      recommendedSessionLabel: 'Task 2 first',
      steps: [],
      carryForward: [],
    };
    const writingPageData: WritingDashboardPageData = {
      prompts: writingPromptBank,
      recentSavedAttempts: [],
      summary: writingSummary,
      progress: writingProgress,
      studyPlan: writingStudyPlan,
    };
    const readingPageData: ReadingDashboardPageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      summary: 'Reading summary',
      routeBase: '/reading',
      importSummary: {
        sourceDir: 'data/private-reading-imports',
        importCommand: 'npm run reading:import-private',
        detectedSourceFiles: ['set-a.json'],
        compiledSourceFiles: ['set-a.json'],
        importedSetCount: 9,
        latestImportedAt: '2026-03-26T17:30:00.000Z',
        compiledOutputLabel: 'data/runtime/reading-private-imports.json',
        sets: [],
        warnings: [],
      },
      availableSets: Array.from({ length: 9 }, (_, index) => ({
        id: `set-${index + 1}`,
        title: `Set ${index + 1}`,
        sourceLabel: 'Private import',
        sourceFile: `set-${index + 1}.json`,
        importedAt: '2026-03-26T17:30:00.000Z',
        questionCount: 12,
        passageWordCount: 720,
        types: ['true_false_not_given'],
      })),
      recentAttempts: [],
      dashboardSummary: {
        totalAttempts: 5,
        averagePercentage: 71,
        bestScoreLabel: '9/12',
        latestAttemptAt: '2026-03-26T18:00:00.000Z',
        averageTimeSpentSeconds: 948,
        strongestType: null,
        weakestType: null,
      },
      studyFocus: ['Redo one evidence-based question.'],
    };
    const speakingPageData: SpeakingDashboardPageData = {
      prompts: speakingPromptBank,
      recentSessions: sampleSpeakingSavedSessions,
      summary: {
        totalSessions: 4,
        averageBand: 6.4,
        bestBand: 6.5,
        latestRange: { lower: 6, upper: 6.5 },
        averageDurationSeconds: 94,
        latestAttemptAt: sampleSpeakingSavedSessions[0]!.createdAt,
        lowConfidenceCount: 1,
        sessionsWithAudio: 2,
        partBreakdown: { 'part-1': 2, 'part-2': 1, 'part-3': 1 },
      },
      studyFocus: ['Repeat the latest cue card with one clearer example.'],
    };
    const listeningPageData: PlaceholderAssessmentDashboardPageData = {
      moduleId: 'listening',
      moduleLabel: 'IELTS Academic Listening Placeholder',
      statusLabel: 'Placeholder',
      summary: 'Listening summary',
      dashboardTitle: 'Listening dashboard placeholder',
      dashboardDescription: 'Listening is not production-ready yet.',
      routeBase: '/listening',
      statusCards: [
        { label: 'Scripts', value: 'Not started', detail: 'No scripts yet.' },
        { label: 'Audio', value: 'Not started', detail: 'No audio yet.' },
        { label: 'Validation', value: 'Planned', detail: 'Validation later.' },
      ],
      nextSteps: ['Create script contracts first.'],
    };

    mocks.loadDefaultAssessmentDashboardPageData.mockResolvedValue(writingPageData);
    mocks.loadAssessmentDashboardPageData.mockImplementation(async (moduleId: string) => {
      switch (moduleId) {
        case READING_ASSESSMENT_MODULE_ID:
          return readingPageData;
        case SPEAKING_ASSESSMENT_MODULE_ID:
          return speakingPageData;
        case LISTENING_ASSESSMENT_MODULE_ID:
          return listeningPageData;
        default:
          throw new Error(`Unexpected module id: ${moduleId}`);
      }
    });

    render(await HomePage());

    expect(mocks.loadDefaultAssessmentDashboardPageData).toHaveBeenCalledWith();
    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(READING_ASSESSMENT_MODULE_ID);
    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID);
    expect(mocks.loadAssessmentDashboardPageData).toHaveBeenCalledWith(LISTENING_ASSESSMENT_MODULE_ID);
    expect(screen.getByRole('heading', { name: /start with reading and writing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reading and writing stay at the center of the app/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /speaking and listening remain available, but secondary/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start reading practice/i })).toHaveAttribute('href', '/reading');
    expect(screen.getByRole('link', { name: /open writing practice/i })).toHaveAttribute('href', '/writing');
    expect(screen.getByRole('link', { name: /open alpha/i })).toHaveAttribute('href', '/speaking');
    expect(screen.getByRole('link', { name: /open placeholder/i })).toHaveAttribute('href', '/listening');
    expect(screen.getAllByText('Primary practice track')).toHaveLength(2);
    expect(screen.getByText('Experimental module')).toBeInTheDocument();
    expect(screen.getByText('Secondary placeholder')).toBeInTheDocument();
    expect(screen.getAllByText('Full')).toHaveLength(2);
    expect(screen.getAllByText('Alpha')).toHaveLength(1);
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(screen.getByText('2 core routes')).toBeInTheDocument();
    expect(screen.getAllByText('9').length).toBeGreaterThan(0);
    expect(screen.getByText(/band 6\.5/i)).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });
});
