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

function buildWritingPageData(overrides?: Partial<WritingDashboardSummary>): WritingDashboardPageData {
  const summary: WritingDashboardSummary = {
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
    ...overrides,
  };
  return {
    prompts: writingPromptBank,
    recentSavedAttempts: [],
    summary,
    progress: {
      direction: 'improving',
      label: 'Improving',
      detail: 'Recent attempts are trending upward.',
      delta: 0.4,
      latestRange: { lower: 6.5, upper: 7 },
      attemptsConsidered: 4,
      averageWordCount: 268,
    },
    studyPlan: {
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
    },
  };
}

function buildReadingPageData(overrides?: Partial<ReadingDashboardPageData['dashboardSummary']>): ReadingDashboardPageData {
  return {
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
      ...overrides,
    },
    studyFocus: ['Redo one evidence-based question.'],
  };
}

function buildSpeakingPageData(): SpeakingDashboardPageData {
  return {
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
}

function buildListeningPageData(): PlaceholderAssessmentDashboardPageData {
  return {
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
}

function setupMocks(
  writingData?: WritingDashboardPageData,
  readingData?: ReadingDashboardPageData,
  speakingData?: SpeakingDashboardPageData,
  listeningData?: PlaceholderAssessmentDashboardPageData,
) {
  mocks.loadDefaultAssessmentDashboardPageData.mockResolvedValue(writingData ?? buildWritingPageData());
  mocks.loadAssessmentDashboardPageData.mockImplementation(async (moduleId: string) => {
    switch (moduleId) {
      case READING_ASSESSMENT_MODULE_ID:
        return readingData ?? buildReadingPageData();
      case SPEAKING_ASSESSMENT_MODULE_ID:
        return speakingData ?? buildSpeakingPageData();
      case LISTENING_ASSESSMENT_MODULE_ID:
        return listeningData ?? buildListeningPageData();
      default:
        throw new Error(`Unexpected module id: ${moduleId}`);
    }
  });
}

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
    expect(screen.getByRole('heading', { name: /your reading .* writing command center/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reading and writing .* your daily practice tracks/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /speaking and listening .* available when you are ready/i })).toBeInTheDocument();
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
    expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
    expect(screen.getAllByText('9').length).toBeGreaterThan(0);
    expect(screen.getByText(/band 6\.5/i)).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('renders reading and writing module cards in the primary section before secondary modules', async () => {
    const writingSummary: WritingDashboardSummary = {
      totalAttempts: 3,
      taskCounts: { 'task-1': 3, 'task-2': 0 },
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
        direction: 'steady',
        label: 'Steady',
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
        partBreakdown: { 'part-1': 0, 'part-2': 0, 'part-3': 0 },
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

    // Hero eyebrow mentions IELTS Academic Prep
    expect(screen.getByText('IELTS Academic Prep')).toBeInTheDocument();

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

  it('renders route pills with Core status for reading/writing and secondary status for others', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const routePillRow = container.querySelector('[aria-label="Route status summary"]');
    expect(routePillRow).not.toBeNull();

    const pills = routePillRow!.querySelectorAll('.route-pill');
    expect(pills).toHaveLength(4);

    // Verify route pill order: reading, writing, speaking, listening
    const pillRouteIds = Array.from(pills).map((el) => el.getAttribute('data-route'));
    expect(pillRouteIds).toEqual(['reading', 'writing', 'speaking', 'listening']);

    // Reading and Writing are "Core"
    const readingPill = routePillRow!.querySelector('[data-route="reading"]');
    const writingPill = routePillRow!.querySelector('[data-route="writing"]');
    expect(readingPill!.textContent).toContain('Core');
    expect(writingPill!.textContent).toContain('Core');

    // Speaking is "Explore", Listening is "Seam"
    const speakingPill = routePillRow!.querySelector('[data-route="speaking"]');
    const listeningPill = routePillRow!.querySelector('[data-route="listening"]');
    expect(speakingPill!.textContent).toContain('Explore');
    expect(listeningPill!.textContent).toContain('Seam');
  });

  it('renders focus signal cards for reading momentum, writing band, and secondary routes', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const focusGrid = container.querySelector('[aria-label="Reading and writing focus signals"]');
    expect(focusGrid).not.toBeNull();

    const signals = focusGrid!.querySelectorAll('.focus-signal-card');
    expect(signals).toHaveLength(3);

    // First signal: reading
    const readingSignal = focusGrid!.querySelector('[data-signal="reading"]');
    expect(readingSignal).not.toBeNull();
    expect(readingSignal!.textContent).toContain('Reading');
    expect(readingSignal!.textContent).toContain('passages');

    // Second signal: writing
    const writingSignal = focusGrid!.querySelector('[data-signal="writing"]');
    expect(writingSignal).not.toBeNull();
    expect(writingSignal!.textContent).toContain('Writing');
    expect(writingSignal!.textContent).toContain('prompts');

    // Third signal: more modules available
    const listeningSignal = focusGrid!.querySelector('[data-signal="listening"]');
    expect(listeningSignal).not.toBeNull();
    expect(listeningSignal!.textContent).toContain('More modules');
    expect(listeningSignal!.textContent).toContain('Available');
  });

  it('renders hero metric row with primary track counts', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const metricRow = container.querySelector('.home-metric-row');
    expect(metricRow).not.toBeNull();

    const metricCards = metricRow!.querySelectorAll('.metric-card');
    expect(metricCards).toHaveLength(3);

    // Reading accuracy metric
    expect(metricCards[0]!.textContent).toContain('Reading accuracy');

    // Writing band metric
    expect(metricCards[1]!.textContent).toContain('Writing band');

    // Total sessions metric
    expect(metricCards[2]!.textContent).toContain('Total sessions');
  });

  it('renders reading before writing in the primary module card order', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const primaryGrid = container.querySelector('[aria-label="Primary IELTS practice modules"]');
    expect(primaryGrid).not.toBeNull();

    const primaryModules = primaryGrid!.querySelectorAll('[data-module]');
    const ids = Array.from(primaryModules).map((el) => el.getAttribute('data-module'));
    expect(ids[0]).toBe('reading');
    expect(ids[1]).toBe('writing');
  });

  it('gives primary module cards primary CTA buttons and secondary cards do not have primary CTAs for speaking/listening main routes', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    // Reading card has a primary button
    const readingCard = container.querySelector('[data-module="reading"]');
    expect(readingCard!.querySelector('.primary-button')).not.toBeNull();
    expect(readingCard!.querySelector('.primary-button')!.textContent).toBe('Start reading practice');

    // Writing card has a primary button
    const writingCard = container.querySelector('[data-module="writing"]');
    expect(writingCard!.querySelector('.primary-button')).not.toBeNull();
    expect(writingCard!.querySelector('.primary-button')!.textContent).toBe('Start writing practice');

    // Listening card has no primary button — only secondary
    const listeningCard = container.querySelector('[data-module="listening"]');
    expect(listeningCard!.querySelector('.primary-button')).toBeNull();
    expect(listeningCard!.querySelector('.secondary-link-button')).not.toBeNull();
  });

  it('renders section headings that reinforce the reading/writing-first hierarchy', async () => {
    setupMocks();
    render(await HomePage());

    // Primary IA heading
    const primaryHeading = screen.getByRole('heading', { name: /reading and writing .* your daily practice tracks/i });
    expect(primaryHeading).toBeInTheDocument();

    // Secondary IA heading
    const secondaryHeading = screen.getByRole('heading', { name: /speaking and listening .* available when you are ready/i });
    expect(secondaryHeading).toBeInTheDocument();

    // Section tag rows describe the focus
    expect(screen.getByText('Passage drills with deterministic scoring')).toBeInTheDocument();
    expect(screen.getByText('Timed essays with band tracking')).toBeInTheDocument();

    // Secondary tags are muted
    expect(screen.getByText('Speaking alpha with transcript support')).toBeInTheDocument();
    expect(screen.getByText('Listening placeholder for future content')).toBeInTheDocument();
  });

  it('renders primary module cards with "Primary practice track" eyebrow and secondary with distinct eyebrows', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const readingCard = container.querySelector('[data-module="reading"]');
    const writingCard = container.querySelector('[data-module="writing"]');
    const speakingCard = container.querySelector('[data-module="speaking"]');
    const listeningCard = container.querySelector('[data-module="listening"]');

    expect(readingCard!.querySelector('.eyebrow')!.textContent).toBe('Primary practice track');
    expect(writingCard!.querySelector('.eyebrow')!.textContent).toBe('Primary practice track');
    expect(speakingCard!.querySelector('.eyebrow')!.textContent).toBe('Experimental module');
    expect(listeningCard!.querySelector('.eyebrow')!.textContent).toBe('Secondary placeholder');
  });

  it('renders status badges: Full for primary modules, Alpha/Placeholder for secondary', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const readingBadge = container.querySelector('[data-module="reading"] .status-badge');
    const writingBadge = container.querySelector('[data-module="writing"] .status-badge');
    const speakingBadge = container.querySelector('[data-module="speaking"] .status-badge');
    const listeningBadge = container.querySelector('[data-module="listening"] .status-badge');

    expect(readingBadge!.getAttribute('data-status')).toBe('Full');
    expect(writingBadge!.getAttribute('data-status')).toBe('Full');
    expect(speakingBadge!.getAttribute('data-status')).toBe('Alpha');
    expect(listeningBadge!.getAttribute('data-status')).toBe('Placeholder');
  });

  it('renders all four module icons in the card headers', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const icons = container.querySelectorAll('.module-icon');
    expect(icons).toHaveLength(4);

    // Each icon contains an SVG
    icons.forEach((icon) => {
      expect(icon.querySelector('svg')).not.toBeNull();
    });
  });

  it('renders the quick-actions strip with reading and writing shortcuts', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const strip = container.querySelector('.quick-actions-strip');
    expect(strip).not.toBeNull();

    const quickCards = strip!.querySelectorAll('.quick-action-card');
    expect(quickCards).toHaveLength(4);

    // First two quick actions are reading and writing practice
    const hrefs = Array.from(quickCards).map((card) => card.getAttribute('href'));
    expect(hrefs[0]).toBe('/reading');
    expect(hrefs[1]).toBe('/writing');
    expect(hrefs[2]).toBe('/reading/dashboard');
    expect(hrefs[3]).toBe('/dashboard');

    // Quick action data attributes identify reading and writing
    const quickTypes = Array.from(quickCards).map((card) => card.getAttribute('data-quick'));
    expect(quickTypes).toEqual(['reading', 'writing', 'reading', 'writing']);

    // Each quick action card has an icon and text
    quickCards.forEach((card) => {
      expect(card.querySelector('.quick-action-icon')).not.toBeNull();
      expect(card.querySelector('.quick-action-text')).not.toBeNull();
    });
  });

  it('renders a section divider between primary and secondary modules', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    const divider = container.querySelector('.section-divider');
    expect(divider).not.toBeNull();
    expect(divider!.getAttribute('role')).toBe('separator');

    const label = divider!.querySelector('.section-divider-label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Secondary modules');

    // Divider sits between primary and secondary sections in DOM order
    const appShell = container.querySelector('.app-shell');
    const children = Array.from(appShell!.children);
    const dividerIndex = children.indexOf(divider!);
    const primarySection = container.querySelector('[aria-labelledby="primary-ia-heading"]');
    const secondarySection = container.querySelector('[aria-labelledby="secondary-ia-heading"]');
    const primaryIndex = children.indexOf(primarySection!);
    const secondaryIndex = children.indexOf(secondarySection!);
    expect(primaryIndex).toBeLessThan(dividerIndex);
    expect(dividerIndex).toBeLessThan(secondaryIndex);
  });

  it('gracefully renders "No data yet" when bands and accuracy are null', async () => {
    const writingData = buildWritingPageData({ averageBand: null, bestBand: null });
    const readingData = buildReadingPageData({ averagePercentage: null as unknown as number, totalAttempts: 0 });
    setupMocks(writingData, readingData);

    const { container } = render(await HomePage());

    // Writing band shows "No data yet" in the focus signal
    const writingSignal = container.querySelector('[data-signal="writing"]');
    expect(writingSignal).not.toBeNull();
    expect(writingSignal!.textContent).toContain('No data yet');

    // Writing module card also shows "No data yet" for average band
    const writingCard = container.querySelector('[data-module="writing"]');
    expect(writingCard).not.toBeNull();
    expect(writingCard!.textContent).toContain('No data yet');
  });

  it('renders the quick-actions strip with dynamic passage and prompt counts', async () => {
    const readingData = buildReadingPageData();
    const writingData = buildWritingPageData();
    setupMocks(writingData, readingData);

    const { container } = render(await HomePage());

    const strip = container.querySelector('.quick-actions-strip');
    expect(strip).not.toBeNull();

    // Reading practice card shows passage count
    const readingCard = strip!.querySelector('[data-quick="reading"]');
    expect(readingCard).not.toBeNull();
    expect(readingCard!.textContent).toContain('9 passages available');

    // Writing practice card shows prompt count
    const writingCard = strip!.querySelector('[data-quick="writing"]');
    expect(writingCard).not.toBeNull();
    expect(writingCard!.textContent).toContain('prompts ready');
  });

  it('renders section tags with muted styling only for secondary modules', async () => {
    setupMocks();
    const { container } = render(await HomePage());

    // Primary section tags do NOT have --muted modifier
    const primaryHeader = container.querySelector('.primary-section-header');
    expect(primaryHeader).not.toBeNull();
    const primaryTags = primaryHeader!.querySelectorAll('.section-tag');
    primaryTags.forEach((tag) => {
      expect(tag.classList.contains('section-tag--muted')).toBe(false);
    });

    // Secondary section tags DO have --muted modifier
    const secondaryHeader = container.querySelector('.secondary-section-header');
    expect(secondaryHeader).not.toBeNull();
    const secondaryTags = secondaryHeader!.querySelectorAll('.section-tag');
    expect(secondaryTags.length).toBeGreaterThan(0);
    secondaryTags.forEach((tag) => {
      expect(tag.classList.contains('section-tag--muted')).toBe(true);
    });
  });
});
