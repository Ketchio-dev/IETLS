import type { ConfidenceLevel } from '@/lib/domain';
import {
  getSampleSpeakingTranscript,
  sampleSpeakingAssessmentReport,
  sampleSpeakingAssessmentReportsByPromptId,
  sampleSpeakingPrompt,
  sampleSpeakingSavedSessions,
  speakingPromptBank,
} from '@/lib/fixtures/speaking';

import type {
  SpeakingAssessmentReport,
  SpeakingDashboardPageData,
  SpeakingDashboardSummary,
  SpeakingPracticePageData,
  SpeakingPrompt,
  SpeakingRecentSessionSummary,
  SpeakingSessionSnapshot,
  SpeakingTaskData,
  SubmitSpeakingAssessmentInput,
  SubmitSpeakingAssessmentResult,
} from './types';

type SearchParamValue = string | string[] | undefined;

interface SpeakingApplicationServiceOptions {
  promptBank?: SpeakingPrompt[];
  initialSavedSessions?: SpeakingSessionSnapshot[];
  fallbackReports?: Record<string, SpeakingAssessmentReport>;
  now?: () => string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getSingleSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function countWords(transcript: string) {
  return transcript.trim().split(/\s+/).filter(Boolean).length;
}

function buildRecentSessionSummary(session: SpeakingSessionSnapshot): SpeakingRecentSessionSummary {
  return {
    sessionId: session.sessionId,
    promptId: session.promptId,
    part: session.part,
    overallBand: session.report.overallBand,
    overallBandRange: session.report.overallBandRange,
    confidence: session.report.confidence,
    summary: session.report.summary,
    durationSeconds: session.durationSeconds,
    transcriptWordCount: session.transcriptWordCount,
    createdAt: session.createdAt,
  };
}

function roundBand(value: number) {
  return Math.round(value * 2) / 2;
}

function clampBand(value: number) {
  return Math.min(8, Math.max(4.5, roundBand(value)));
}

function calculateConfidence(wordCount: number, durationSeconds: number, prompt: SpeakingPrompt): ConfidenceLevel {
  if (wordCount < 35 || durationSeconds < Math.round(prompt.recommendedSeconds * 0.5)) {
    return 'low';
  }
  if (wordCount < 70 || durationSeconds < Math.round(prompt.recommendedSeconds * 0.8)) {
    return 'medium';
  }
  return 'high';
}

function buildMockSpeakingReport(
  prompt: SpeakingPrompt,
  transcript: string,
  durationSeconds: number,
  sessionId: string,
  generatedAt: string,
): SpeakingAssessmentReport {
  const wordCount = countWords(transcript);
  const uniqueWords = new Set(transcript.toLowerCase().match(/[a-z']+/g) ?? []).size;
  const keywordHits = (prompt.keywordTargets ?? []).filter((keyword) => transcript.toLowerCase().includes(keyword)).length;
  const durationRatio = durationSeconds / Math.max(prompt.recommendedSeconds, 1);
  const confidence = calculateConfidence(wordCount, durationSeconds, prompt);
  const confidenceReasons = [
    confidence === 'low'
      ? 'The response is shorter than a stable speaking estimate usually needs.'
      : 'The response length is sufficient for a lightweight alpha estimate.',
    'Pronunciation is inferred conservatively because audio analysis is not enabled in this local scaffold.',
  ];

  const fluency = clampBand(5 + Math.min(wordCount / 55, 1.5) + (durationRatio >= 0.85 ? 0.5 : 0));
  const lexical = clampBand(5 + Math.min(uniqueWords / 40, 1.25) + Math.min(keywordHits * 0.2, 0.75));
  const grammar = clampBand(
    5 + Math.min((transcript.match(/[,.]| and | because | although | however /gi) ?? []).length / 6, 1.25),
  );
  const pronunciation = clampBand(5 + (durationRatio >= 0.75 ? 0.5 : 0) + (confidence === 'high' ? 0.5 : 0));
  const criterionBands = [fluency, lexical, grammar, pronunciation];
  const overallBand = clampBand(criterionBands.reduce((sum, band) => sum + band, 0) / criterionBands.length);
  const overallBandRange = {
    lower: clampBand(overallBand - (confidence === 'high' ? 0.5 : 1)),
    upper: overallBand,
  };
  const shortResponse = wordCount < 40;
  const partLabel = prompt.part.replace('-', ' ').toUpperCase();

  return {
    reportId: `speaking-report-${sessionId}`,
    sessionId,
    promptId: prompt.id,
    part: prompt.part,
    overallBand,
    overallBandRange,
    confidence,
    confidenceReasons,
    summary: shortResponse
      ? `${partLabel} response stays on topic but needs a longer development arc to feel IELTS-like.`
      : `${partLabel} response is relevant and fairly sustained, with the clearest gains available in precision and extension.`,
    transcriptWordCount: wordCount,
    estimatedDurationSeconds: durationSeconds,
    criterionScores: [
      {
        criterion: 'Fluency & Coherence',
        band: fluency,
        bandRange: { lower: clampBand(fluency - 0.5), upper: fluency },
        confidence,
        rationale: shortResponse
          ? 'The answer is coherent but too brief to show full speaking control.'
          : 'The response maintains a sensible flow and does not collapse into disconnected points.',
      },
      {
        criterion: 'Lexical Resource',
        band: lexical,
        bandRange: { lower: clampBand(lexical - 0.5), upper: lexical },
        confidence,
        rationale:
          keywordHits > 0
            ? 'Topic vocabulary appears naturally, though more flexible paraphrase would push the score higher.'
            : 'Vocabulary is understandable, but the answer relies on general language more than topic-specific wording.',
      },
      {
        criterion: 'Grammatical Range & Accuracy',
        band: grammar,
        bandRange: { lower: clampBand(grammar - 0.5), upper: grammar },
        confidence,
        rationale: 'Sentence control looks stable in transcript form, with room for more varied clause patterns.',
      },
      {
        criterion: 'Pronunciation',
        band: pronunciation,
        bandRange: { lower: clampBand(pronunciation - 1), upper: pronunciation },
        confidence: 'low',
        rationale: 'Pronunciation remains conservative because this alpha scaffold has no audio-feature pipeline yet.',
      },
    ],
    strengths: [
      wordCount >= 70 ? 'The answer sustains enough detail to sound test-like.' : 'The answer remains relevant to the prompt.',
      keywordHits > 0 ? 'Topic-specific words support lexical relevance.' : 'The main idea is easy to follow.',
      durationRatio >= 0.85 ? 'Timing is close to the target speaking window.' : 'A timed second attempt could sound stronger quickly.',
    ],
    risks: [
      shortResponse ? 'Short answers cap confidence and fluency evidence.' : 'Some points could be developed with a clearer example or contrast.',
      'Pronunciation is still a low-confidence estimate without audio.',
    ],
    nextSteps: [
      'Repeat this prompt once and add one more concrete example before you finish.',
      prompt.part === 'part-2'
        ? 'Use the cue-card bullet points as a sequence so the long turn feels more structured.'
        : 'Give one direct answer, one reason, and one short example in each response.',
    ],
    warnings: [
      'Speaking alpha reports are local practice estimates, not official IELTS scores.',
      ...(shortResponse ? ['A longer answer would produce a more stable speaking estimate.'] : []),
      ...(confidence !== 'high'
        ? ['Confidence is reduced because the current response is shorter or less sustained than the target timing.']
        : []),
    ],
    providerLabel: 'Local mock scorer',
    scorerModel: 'gemini-3-flash-style-heuristic',
    usedMockScorer: true,
    generatedAt,
  };
}

function buildDashboardSummary(savedSessions: SpeakingSessionSnapshot[]): SpeakingDashboardSummary {
  if (savedSessions.length === 0) {
    return {
      totalSessions: 0,
      averageBand: null,
      bestBand: null,
      latestRange: null,
      averageDurationSeconds: 0,
      latestAttemptAt: null,
      lowConfidenceCount: 0,
      partBreakdown: { 'part-1': 0, 'part-2': 0, 'part-3': 0 },
    };
  }

  const totalSessions = savedSessions.length;
  const averageBand = roundBand(savedSessions.reduce((sum, session) => sum + session.report.overallBand, 0) / totalSessions);
  const bestBand = Math.max(...savedSessions.map((session) => session.report.overallBand));
  const averageDurationSeconds = Math.round(savedSessions.reduce((sum, session) => sum + session.durationSeconds, 0) / totalSessions);
  const lowConfidenceCount = savedSessions.filter((session) => session.report.confidence === 'low').length;
  const partBreakdown = savedSessions.reduce<SpeakingDashboardSummary['partBreakdown']>(
    (accumulator, session) => {
      accumulator[session.part] += 1;
      return accumulator;
    },
    { 'part-1': 0, 'part-2': 0, 'part-3': 0 },
  );

  return {
    totalSessions,
    averageBand,
    bestBand,
    latestRange: savedSessions[0]?.report.overallBandRange ?? null,
    averageDurationSeconds,
    latestAttemptAt: savedSessions[0]?.createdAt ?? null,
    lowConfidenceCount,
    partBreakdown,
  };
}

function buildStudyFocus(savedSessions: SpeakingSessionSnapshot[], prompts: SpeakingPrompt[]) {
  if (savedSessions.length === 0) {
    return [
      'Start with one Part 1 and one Part 2 response so the dashboard can compare short and long turns.',
      'Aim for one full timed response before worrying about detailed speaking criteria.',
    ];
  }

  const latest = savedSessions[0]!;
  const prompt = prompts.find((item) => item.id === latest.promptId);

  return [
    `Repeat ${prompt?.title ?? 'the latest prompt'} and add one more example before your conclusion.`,
    latest.report.confidence === 'low'
      ? 'Stay closer to the recommended timing window to increase scoring confidence.'
      : 'Keep the same timing discipline and improve precision in one weaker criterion.',
    'Treat pronunciation advice cautiously until audio-based scoring is added.',
  ];
}

export function createSpeakingApplicationService({
  promptBank = speakingPromptBank,
  initialSavedSessions = sampleSpeakingSavedSessions,
  fallbackReports = sampleSpeakingAssessmentReportsByPromptId,
  now = () => new Date().toISOString(),
}: SpeakingApplicationServiceOptions = {}) {
  let savedSessions = clone(initialSavedSessions).sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  function findPrompt(promptId?: string) {
    return promptBank.find((item) => item.id === promptId);
  }

  function getDefaultPrompt() {
    return findPrompt(sampleSpeakingPrompt.id) ?? promptBank[0] ?? sampleSpeakingPrompt;
  }

  function listRecentSessions(limit = 6) {
    return savedSessions.slice(0, limit).map(buildRecentSessionSummary);
  }

  async function loadPracticePageData(
    searchParams: Record<string, SearchParamValue> = {},
  ): Promise<SpeakingPracticePageData> {
    const requestedPromptId = getSingleSearchParam(searchParams.promptId);
    const requestedSessionId = getSingleSearchParam(searchParams.sessionId);
    const selectedSession = savedSessions.find((session) => session.sessionId === requestedSessionId) ?? null;
    const selectedPrompt =
      findPrompt(requestedPromptId) ??
      (selectedSession ? findPrompt(selectedSession.promptId) : null) ??
      getDefaultPrompt();

    return {
      prompts: clone(promptBank),
      prompt: selectedPrompt,
      initialReport: selectedSession?.report ?? fallbackReports[selectedPrompt.id] ?? sampleSpeakingAssessmentReport,
      initialTranscript: selectedSession?.transcript ?? getPromptTranscriptSeed(selectedPrompt.id),
      initialDurationSeconds: selectedSession?.durationSeconds ?? selectedPrompt.recommendedSeconds,
      initialRecentSessions: listRecentSessions(6),
      initialSavedSessions: clone(savedSessions),
      initialPromptId: selectedPrompt.id,
      initialSessionId: selectedSession?.sessionId ?? null,
      fallbackReports: clone(fallbackReports),
    };
  }

  async function loadDashboardPageData(): Promise<SpeakingDashboardPageData> {
    return {
      prompts: clone(promptBank),
      recentSessions: clone(savedSessions).slice(0, 8),
      summary: buildDashboardSummary(savedSessions),
      studyFocus: buildStudyFocus(savedSessions, promptBank),
    };
  }

  async function loadTaskData(): Promise<SpeakingTaskData> {
    return {
      prompt: getDefaultPrompt(),
      prompts: clone(promptBank),
    };
  }

  async function submitAssessment(input: SubmitSpeakingAssessmentInput): Promise<SubmitSpeakingAssessmentResult> {
    const promptId = getSingleSearchParam(input.promptId) ?? '';
    const transcript = (getSingleSearchParam(input.transcript) ?? '').trim();
    const prompt = findPrompt(promptId);

    if (!promptId || transcript.length < 30) {
      return {
        ok: false,
        error: 'Provide a promptId and at least 30 characters of transcript.',
        status: 400,
      };
    }

    if (!prompt) {
      return {
        ok: false,
        error: 'Unknown speaking prompt requested.',
        status: 404,
      };
    }

    const durationSeconds =
      typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
        ? Math.max(15, Math.round(input.durationSeconds))
        : prompt.recommendedSeconds;
    const createdAt = now();
    const sessionId = `speaking-live-${savedSessions.length + 1}`;
    const report = buildMockSpeakingReport(prompt, transcript, durationSeconds, sessionId, createdAt);
    const session: SpeakingSessionSnapshot = {
      sessionId,
      promptId: prompt.id,
      part: prompt.part,
      createdAt,
      durationSeconds,
      transcript,
      transcriptWordCount: countWords(transcript),
      report,
    };

    savedSessions = [session, ...savedSessions];

    return {
      ok: true,
      payload: {
        report,
        session,
        recentSessions: listRecentSessions(6),
        savedSessions: clone(savedSessions).slice(0, 12),
      },
    };
  }

  return {
    loadPracticePageData,
    loadDashboardPageData,
    loadTaskData,
    submitAssessment,
  };
}

export function getPromptTranscriptSeed(promptId: string) {
  return getSampleSpeakingTranscript(promptId);
}

export type {
  SpeakingAssessmentReport,
  SpeakingDashboardPageData,
  SpeakingPracticePageData,
  SpeakingPrompt,
  SpeakingRecentSessionSummary,
  SpeakingSessionSnapshot,
  SpeakingTaskData,
  SubmitSpeakingAssessmentInput,
  SubmitSpeakingAssessmentResult,
} from './types';

const defaultSpeakingApplicationService = createSpeakingApplicationService();

export const loadSpeakingPracticePageData = defaultSpeakingApplicationService.loadPracticePageData;
export const loadSpeakingDashboardPageData = defaultSpeakingApplicationService.loadDashboardPageData;
export const loadSpeakingTaskData = defaultSpeakingApplicationService.loadTaskData;
export const submitSpeakingAssessment = defaultSpeakingApplicationService.submitAssessment;
