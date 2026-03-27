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
    expect(screen.getByRole('link', { name: /open writing practice/i })).toHaveAttribute('href', '/writing');
    expect(screen.getAllByRole('link', { name: /start reading practice/i })[0]).toHaveAttribute('href', '/reading');
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

  it('renders reading and writing module cards in the primary section before secondary modules', async () => {
    const writingSummary: WritingDashboardSummary = {
      totalAttempts: 3,
      taskCounts: { 'task-1': 3 },
      latestRange: { lower: 6, upper: 6.5 },
      bestBand: 6.5,
      averageBand: 6.2,
      averageWordCount: 240,
      totalPracticeMinutes: 90,
      activeDays: 2,
      latestAttemptAt: '2026-03-26T10:00:00.000Z',
      providerBreakdown: [],
      criterionSummaries: [],
      strongestCriterion: null,
      weakestCriterion: null,
    };
    const writingPageData: WritingDashboardPageData = {
      prompts: writingPromptBank,
      recentSavedAttempts: [],
      summary: writingSummary,
      progress: {
        direction: 'stable',
        label: 'Stable',
        detail: 'Holding steady.',
        delta: 0,
        latestRange: { lower: 6, upper: 6.5 },
        attemptsConsidered: 3,
        averageWordCount: 240,
      },
      studyPlan: {
        version: 1,
        generatedAt: '2026-03-26T10:00:00.000Z',
        basedOnSubmissionId: null,
        attemptsConsidered: 3,
        headline: 'Keep going',
        focus: 'Focus area',
        horizonLabel: 'Next block',
        recommendedSessionLabel: 'Task 1',
        steps: [],
        carryForward: [],
      },
    };
    const readingPageData: ReadingDashboardPageData = {
      moduleId: 'reading',
      moduleLabel: 'IELTS Academic Reading',
      summary: 'Summary',
      routeBase: '/reading',
      importSummary: {
        sourceDir: 'data/private-reading-imports',
        importCommand: 'npm run reading:import-private',
        detectedSourceFiles: [],
        compiledSourceFiles: [],
        importedSetCount: 0,
        latestImportedAt: null,
        compiledOutputLabel: 'data/runtime/reading-private-imports.json',
        sets: [],
        warnings: [],
      },
      availableSets: [],
      recentAttempts: [],
      dashboardSummary: {
        totalAttempts: 0,
        averagePercentage: 0,
        bestScoreLabel: 'N/A',
        latestAttemptAt: null,
        averageTimeSpentSeconds: 0,
        strongestType: null,
        weakestType: null,
      },
      studyFocus: [],
    };
    const speakingPageData: SpeakingDashboardPageData = {
      prompts: speakingPromptBank,
      recentSessions: [],
      summary: {
        totalSessions: 0,
        averageBand: null,
        bestBand: null,
        latestRange: null,
        averageDurationSeconds: 0,
        latestAttemptAt: null,
        lowConfidenceCount: 0,
        sessionsWithAudio: 0,
        partBreakdown: {},
      },
      studyFocus: [],
    };
    const listeningPageData: PlaceholderAssessmentDashboardPageData = {
      moduleId: 'listening',
      moduleLabel: 'Listening',
      statusLabel: 'Placeholder',
      summary: 'Placeholder',
      dashboardTitle: 'Listening',
      dashboardDescription: 'Not ready.',
      routeBase: '/listening',
      statusCards: [
        { label: 'Scripts', value: 'N/A', detail: 'None.' },
        { label: 'Audio', value: 'N/A', detail: 'None.' },
        { label: 'Status', value: 'Planned', detail: 'Later.' },
      ],
      nextSteps: [],
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

    const { container } = render(await HomePage());

    // Reading and writing module cards appear in the primary section (first module-hub-grid)
    const moduleGrids = container.querySelectorAll('[aria-label]');
    const primaryGrid = container.querySelector('[aria-label="Primary IELTS practice modules"]');
    const secondaryGrid = container.querySelector('[aria-label="Secondary IELTS modules"]');

    expect(primaryGrid).not.toBeNull();
    expect(secondaryGrid).not.toBeNull();

    // Primary grid contains reading and writing
    const primaryModules = primaryGrid!.querySelectorAll('[data-module]');
    const primaryModuleIds = Array.from(primaryModules).map((el) => el.getAttribute('data-module'));
    expect(primaryModuleIds).toContain('reading');
    expect(primaryModuleIds).toContain('writing');
    expect(primaryModuleIds).not.toContain('speaking');
    expect(primaryModuleIds).not.toContain('listening');

    // Secondary grid contains speaking and listening
    const secondaryModules = secondaryGrid!.querySelectorAll('[data-module]');
    const secondaryModuleIds = Array.from(secondaryModules).map((el) => el.getAttribute('data-module'));
    expect(secondaryModuleIds).toContain('speaking');
    expect(secondaryModuleIds).toContain('listening');
    expect(secondaryModuleIds).not.toContain('reading');
    expect(secondaryModuleIds).not.toContain('writing');

    // Primary section appears before secondary section in DOM order
    const allGrids = Array.from(moduleGrids);
    const primaryIndex = allGrids.indexOf(primaryGrid!);
    const secondaryIndex = allGrids.indexOf(secondaryGrid!);
    expect(primaryIndex).toBeLessThan(secondaryIndex);

    // Hero CTA buttons link to reading and writing (not speaking/listening)
    const heroSection = container.querySelector('.home-hero');
    expect(heroSection).not.toBeNull();
    const heroLinks = heroSection!.querySelectorAll('a');
    const heroHrefs = Array.from(heroLinks).map((a) => a.getAttribute('href'));
    expect(heroHrefs).toContain('/reading');
    expect(heroHrefs).toContain('/writing');
    expect(heroHrefs).not.toContain('/speaking');
    expect(heroHrefs).not.toContain('/listening');

    // Hero eyebrow mentions Reading + Writing
    expect(screen.getByText('IELTS Academic Reading + Writing')).toBeInTheDocument();

    // Each module card renders an icon container
    const moduleIcons = container.querySelectorAll('.module-icon');
    expect(moduleIcons.length).toBeGreaterThanOrEqual(2);

    // Reading card renders stat cards with expected labels
    const readingCard = container.querySelector('[data-module="reading"]');
    expect(readingCard).not.toBeNull();
    expect(readingCard!.textContent).toContain('Passages');
    expect(readingCard!.textContent).toContain('Attempts');

    // Writing card renders stat cards with expected labels
    const writingCard = container.querySelector('[data-module="writing"]');
    expect(writingCard).not.toBeNull();
    expect(writingCard!.textContent).toContain('Saved attempts');
    expect(writingCard!.textContent).toContain('Prompt bank');
    expect(writingCard!.textContent).toContain('Average band');
  });
});
