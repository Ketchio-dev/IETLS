import type {
  PlaceholderAssessmentDashboardPageData,
  PlaceholderAssessmentModuleId,
  PlaceholderAssessmentPracticePageData,
  PlaceholderAssessmentTaskData,
  SubmitPlaceholderAssessmentResult,
} from './types';

interface PlaceholderAssessmentDefinition {
  moduleId: PlaceholderAssessmentModuleId;
  moduleLabel: string;
  statusLabel: string;
  summary: string;
  routeBase: string;
  practiceTitle: string;
  practiceDescription: string;
  dashboardTitle: string;
  dashboardDescription: string;
  plannedMilestones: string[];
  currentGuardrails: string[];
  statusCards: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  nextSteps: string[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createPlaceholderAssessmentApplicationService(definition: PlaceholderAssessmentDefinition) {
  async function loadPracticePageData(): Promise<PlaceholderAssessmentPracticePageData> {
    return {
      moduleId: definition.moduleId,
      moduleLabel: definition.moduleLabel,
      statusLabel: definition.statusLabel,
      summary: definition.summary,
      practiceTitle: definition.practiceTitle,
      practiceDescription: definition.practiceDescription,
      routeBase: definition.routeBase,
      plannedMilestones: clone(definition.plannedMilestones),
      currentGuardrails: clone(definition.currentGuardrails),
    };
  }

  async function loadDashboardPageData(): Promise<PlaceholderAssessmentDashboardPageData> {
    return {
      moduleId: definition.moduleId,
      moduleLabel: definition.moduleLabel,
      statusLabel: definition.statusLabel,
      summary: definition.summary,
      dashboardTitle: definition.dashboardTitle,
      dashboardDescription: definition.dashboardDescription,
      routeBase: definition.routeBase,
      statusCards: clone(definition.statusCards),
      nextSteps: clone(definition.nextSteps),
    };
  }

  async function loadTaskData(): Promise<PlaceholderAssessmentTaskData> {
    return {
      moduleId: definition.moduleId,
      title: definition.practiceTitle,
      description: definition.practiceDescription,
      plannedMilestones: clone(definition.plannedMilestones),
    };
  }

  async function submitAssessment(): Promise<SubmitPlaceholderAssessmentResult> {
    return {
      ok: false,
      error: `${definition.moduleLabel} is a placeholder module for now; no scoring pipeline is implemented yet.`,
      status: 501,
    };
  }

  return {
    loadPracticePageData,
    loadDashboardPageData,
    loadTaskData,
    submitAssessment,
  };
}

const readingPlaceholderService = createPlaceholderAssessmentApplicationService({
  moduleId: 'reading',
  moduleLabel: 'IELTS Academic Reading Placeholder',
  statusLabel: 'Placeholder',
  summary: 'A structural placeholder for future Academic Reading work routed through the shared assessment-module seam.',
  routeBase: '/reading',
  practiceTitle: 'Reading module placeholder',
  practiceDescription: 'This route proves the platform can register Reading without pretending the passage bank, item generation, or scoring engine already exists.',
  dashboardTitle: 'Reading dashboard placeholder',
  dashboardDescription: 'Use this placeholder dashboard as a seam check while Reading content, item stats, and scoring pipelines are still out of scope.',
  plannedMilestones: [
    'Introduce licensed or first-party passage sources before generating scored content.',
    'Add item metadata and ambiguity validation before shipping learner-facing question sets.',
    'Measure difficulty and retire weak questions once real attempt data exists.',
  ],
  currentGuardrails: [
    'No generated passages or scored question sets are exposed here yet.',
    'No exam-simulation claims are made until answer keys and ambiguity checks exist.',
  ],
  statusCards: [
    { label: 'Content', value: 'Not started', detail: 'Passage bank and question types are intentionally absent.' },
    { label: 'Scoring', value: 'Not started', detail: 'No raw-score, band conversion, or rationale pipeline yet.' },
    { label: 'Validation', value: 'Planned', detail: 'Future work needs ambiguity checks and item-stat tracking.' },
  ],
  nextSteps: [
    'Design passage licensing and ownership rules first.',
    'Add answer-span-backed item contracts before any scored drills.',
  ],
});

const listeningPlaceholderService = createPlaceholderAssessmentApplicationService({
  moduleId: 'listening',
  moduleLabel: 'IELTS Academic Listening Placeholder',
  statusLabel: 'Placeholder',
  summary: 'A structural placeholder for future Academic Listening work routed through the shared assessment-module seam.',
  routeBase: '/listening',
  practiceTitle: 'Listening module placeholder',
  practiceDescription: 'This route proves the platform can register Listening without implying that audio production, timing alignment, or scoring are ready.',
  dashboardTitle: 'Listening dashboard placeholder',
  dashboardDescription: 'Use this placeholder dashboard as a seam check while scripts, audio assets, and recording-order validation remain future work.',
  plannedMilestones: [
    'Start with script-first authoring before audio production.',
    'Map answers to recording order before exposing scored tasks.',
    'Add accent-balanced audio production and answer-variant handling later.',
  ],
  currentGuardrails: [
    'No audio library or replay workflow is exposed here yet.',
    'No listening score estimates are shown until timing and answer validation exist.',
  ],
  statusCards: [
    { label: 'Scripts', value: 'Not started', detail: 'No listening scripts or timing maps are published yet.' },
    { label: 'Audio', value: 'Not started', detail: 'No TTS/human audio pipeline is connected.' },
    { label: 'Validation', value: 'Planned', detail: 'Recording-order and answer-variant checks are future milestones.' },
  ],
  nextSteps: [
    'Create script-first content contracts before building audio.',
    'Add answer timeline validation before exposing scored drills.',
  ],
});

export const loadReadingPracticePageData = readingPlaceholderService.loadPracticePageData;
export const loadReadingDashboardPageData = readingPlaceholderService.loadDashboardPageData;
export const loadReadingTaskData = readingPlaceholderService.loadTaskData;
export const submitReadingAssessment = readingPlaceholderService.submitAssessment;

export const loadListeningPracticePageData = listeningPlaceholderService.loadPracticePageData;
export const loadListeningDashboardPageData = listeningPlaceholderService.loadDashboardPageData;
export const loadListeningTaskData = listeningPlaceholderService.loadTaskData;
export const submitListeningAssessment = listeningPlaceholderService.submitAssessment;

export type {
  PlaceholderAssessmentDashboardPageData,
  PlaceholderAssessmentModuleId,
  PlaceholderAssessmentPracticePageData,
  PlaceholderAssessmentTaskData,
  SubmitPlaceholderAssessmentInput,
  SubmitPlaceholderAssessmentResult,
} from './types';
