import type {
  SpeakingAssessmentReport,
  SpeakingAudioArtifact,
  SpeakingPrompt,
  SpeakingRecentSessionSummary,
  SpeakingSessionSnapshot,
} from '@/lib/services/speaking/types';

function countWords(transcript: string) {
  return transcript.trim().split(/\s+/).filter(Boolean).length;
}

function createMissingAudioArtifact(): SpeakingAudioArtifact {
  return {
    status: 'missing',
    source: 'none',
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    durationSeconds: null,
  };
}

export const speakingPromptBank: SpeakingPrompt[] = [
  {
    id: 'speaking-part-1-city-living',
    title: 'Part 1 • City living',
    part: 'part-1',
    topic: 'Home and city life',
    prompt: 'Do you enjoy living in your current city? Why or why not?',
    followUps: [
      'What is the most convenient thing about your area?',
      'Would you like to move to a quieter place in the future?',
    ],
    recommendedSeconds: 45,
    keywordTargets: ['city', 'area', 'transport', 'convenient', 'community'],
    focusAreas: ['Answer directly', 'Extend each answer with one reason', 'Avoid one-sentence replies'],
  },
  {
    id: 'speaking-part-2-teacher',
    title: 'Part 2 • Describe a teacher',
    part: 'part-2',
    topic: 'People and education',
    prompt: 'Describe a teacher who helped you learn something important.',
    cueCard: [
      'who this person was',
      'what they taught you',
      'how they helped you',
      'and explain why you still remember this teacher',
    ],
    followUps: [
      'Why do some students remember teachers for many years?',
      'Is a good teacher always a strict teacher?',
    ],
    recommendedSeconds: 120,
    keywordTargets: ['teacher', 'learn', 'class', 'support', 'confidence'],
    focusAreas: ['Keep a clear story arc', 'Use past tense accurately', 'Sustain the full long turn'],
  },
  {
    id: 'speaking-part-3-technology',
    title: 'Part 3 • Technology and communication',
    part: 'part-3',
    topic: 'Society and technology',
    prompt: 'How has technology changed the way people communicate at work?',
    followUps: [
      'Does digital communication always improve teamwork?',
      'Should companies train staff to communicate differently online?',
    ],
    recommendedSeconds: 90,
    keywordTargets: ['technology', 'communication', 'work', 'teams', 'online'],
    focusAreas: ['Compare old and new behaviour', 'Support claims with a workplace example', 'Use abstract vocabulary precisely'],
  },
];

export const sampleSpeakingPrompt = speakingPromptBank[0]!;

export const sampleTranscriptsByPromptId: Record<string, string> = {
  'speaking-part-1-city-living':
    'Yes, I do. I live in a medium-sized city, so it is busy enough to have good transport and cafes, but it is still manageable. The most convenient thing is that my office and gym are both nearby, so daily life feels efficient.',
  'speaking-part-2-teacher':
    'I would like to talk about my high-school English teacher. She taught me how to organise ideas before I started writing, and that changed the way I studied. Before her classes, I usually memorised things without understanding them. She showed me how to make a simple plan, use examples, and check my grammar after finishing a paragraph. Because of that, I became much more confident and I still use the same technique in university.',
  'speaking-part-3-technology':
    'Technology has made workplace communication much faster because people can send updates immediately through chat or video calls. However, speed is not always the same as clarity. In some offices, people send too many short messages and misunderstand each other, so I think companies still need clear communication rules.',
};

export function getSampleSpeakingTranscript(promptId: string) {
  return sampleTranscriptsByPromptId[promptId] ?? '';
}

function buildAudioArtifact(index: number): SpeakingAudioArtifact {
  if (index !== 2) {
    return createMissingAudioArtifact();
  }

  return {
    status: 'attached',
    source: 'upload',
    fileName: 'teacher-response.m4a',
    mimeType: 'audio/mp4',
    sizeBytes: 1_248_000,
    durationSeconds: 114,
  };
}

function buildSampleSpeakingReport(
  prompt: SpeakingPrompt,
  sessionId: string,
  createdAt: string,
  transcript: string,
  durationSeconds: number,
  overallBand: number,
  audioArtifact: SpeakingAudioArtifact,
): SpeakingAssessmentReport {
  const transcriptWordCount = countWords(transcript);
  const evidenceMode = audioArtifact.status === 'attached' ? 'transcript-plus-audio-metadata' : 'transcript-only';

  return {
    reportId: `speaking-report-${sessionId}`,
    sessionId,
    promptId: prompt.id,
    part: prompt.part,
    overallBand,
    overallBandRange: { lower: Math.max(4.5, overallBand - 0.5), upper: Math.min(8, overallBand) },
    confidence: prompt.part === 'part-2' ? 'medium' : 'high',
    confidenceReasons: ['Mock local speaking alpha report', 'Transcript-first evidence with metadata-only audio readiness'],
    summary:
      prompt.part === 'part-2'
        ? 'The response keeps a clear narrative and enough development to sound plausible for a sustained long turn.'
        : 'The response is clear and relevant, but a fuller example or contrast would create a stronger IELTS-style answer.',
    transcriptWordCount,
    estimatedDurationSeconds: durationSeconds,
    evidenceMode,
    criterionScores: [
      {
        criterion: 'Fluency & Coherence',
        band: overallBand,
        bandRange: { lower: Math.max(4.5, overallBand - 0.5), upper: overallBand },
        confidence: 'medium',
        rationale: 'Ideas progress logically and the answer sounds sustained enough for a practice estimate.',
      },
      {
        criterion: 'Lexical Resource',
        band: overallBand,
        bandRange: { lower: Math.max(4.5, overallBand - 0.5), upper: overallBand },
        confidence: 'medium',
        rationale: 'Topic vocabulary is relevant, though some paraphrasing could be more varied.',
      },
      {
        criterion: 'Grammatical Range & Accuracy',
        band: Math.max(5, overallBand - 0.5),
        bandRange: { lower: Math.max(4.5, overallBand - 1), upper: overallBand },
        confidence: 'medium',
        rationale: 'Sentence control is generally stable, with room for more complex forms.',
      },
      {
        criterion: 'Pronunciation',
        band: Math.max(5.5, overallBand - 0.5),
        bandRange: { lower: Math.max(5, overallBand - 1), upper: overallBand },
        confidence: 'low',
        rationale: 'Pronunciation remains a low-confidence estimate in this alpha because it is inferred from transcript and timing only.',
      },
    ],
    strengths: ['Relevant topic coverage', 'Plausible speaking pace for timed practice', 'Clear next revision target'],
    risks: ['Pronunciation remains low-confidence', 'More precise examples would raise the ceiling'],
    nextSteps: [
      'Repeat the prompt once and add one extra supporting example.',
      'Notice where your answer becomes generic and replace that section with a concrete detail.',
    ],
    warnings: [
      'Speaking alpha reports are local practice estimates, not official IELTS scores.',
      'Pronunciation is estimated conservatively until real audio analysis is added.',
      ...(audioArtifact.status === 'attached' ? ['Only audio metadata is attached in the sample data; raw audio is not persisted.'] : []),
    ],
    providerLabel: 'Local mock scorer',
    scorerModel: 'gemini-3-flash-style-heuristic',
    usedMockScorer: true,
    generatedAt: createdAt,
  };
}

function buildSession(prompt: SpeakingPrompt, index: number, overallBand: number): SpeakingSessionSnapshot {
  const sessionId = `speaking-session-${index}`;
  const createdAt = `2026-03-${String(26 - index).padStart(2, '0')}T1${index}:10:00.000Z`;
  const transcript = getSampleSpeakingTranscript(prompt.id);
  const durationSeconds = prompt.recommendedSeconds - (prompt.part === 'part-2' ? 10 : 5);
  const audioArtifact = buildAudioArtifact(index);
  const report = buildSampleSpeakingReport(prompt, sessionId, createdAt, transcript, durationSeconds, overallBand, audioArtifact);

  return {
    sessionId,
    promptId: prompt.id,
    part: prompt.part,
    createdAt,
    durationSeconds,
    transcript,
    transcriptWordCount: countWords(transcript),
    transcriptSource: 'seed',
    audioArtifact,
    report,
  };
}

export const sampleSpeakingSavedSessions: SpeakingSessionSnapshot[] = [
  buildSession(speakingPromptBank[2]!, 1, 6.5),
  buildSession(speakingPromptBank[1]!, 2, 6.5),
  buildSession(speakingPromptBank[0]!, 3, 6.0),
];

export const sampleSpeakingRecentSessions: SpeakingRecentSessionSummary[] = sampleSpeakingSavedSessions.map((session) => ({
  sessionId: session.sessionId,
  promptId: session.promptId,
  part: session.part,
  overallBand: session.report.overallBand,
  overallBandRange: session.report.overallBandRange,
  confidence: session.report.confidence,
  summary: session.report.summary,
  durationSeconds: session.durationSeconds,
  transcriptWordCount: session.transcriptWordCount,
  audioStatus: session.audioArtifact.status,
  evidenceMode: session.report.evidenceMode,
  createdAt: session.createdAt,
}));

export const sampleSpeakingAssessmentReportsByPromptId = Object.fromEntries(
  speakingPromptBank.map((prompt, index) => {
    const existing = sampleSpeakingSavedSessions.find((session) => session.promptId === prompt.id);
    const sessionId = existing?.sessionId ?? `speaking-sample-${index + 1}`;
    const createdAt = existing?.createdAt ?? `2026-03-26T1${index}:00:00.000Z`;
    const transcript = existing?.transcript ?? getSampleSpeakingTranscript(prompt.id);
    const durationSeconds = existing?.durationSeconds ?? prompt.recommendedSeconds;
    const overallBand = existing?.report.overallBand ?? 6.0;
    const audioArtifact = existing?.audioArtifact ?? createMissingAudioArtifact();

    return [prompt.id, buildSampleSpeakingReport(prompt, sessionId, createdAt, transcript, durationSeconds, overallBand, audioArtifact)];
  }),
) as Record<string, SpeakingAssessmentReport>;

export const sampleSpeakingAssessmentReport = sampleSpeakingAssessmentReportsByPromptId[sampleSpeakingPrompt.id]!;
