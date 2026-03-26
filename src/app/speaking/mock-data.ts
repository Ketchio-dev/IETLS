import {
  getSampleSpeakingTranscript,
  sampleSpeakingAssessmentReport,
  sampleSpeakingAssessmentReportsByPromptId,
  sampleSpeakingPrompt,
  sampleSpeakingRecentSessions,
  sampleSpeakingSavedSessions,
  speakingPromptBank,
} from '@/lib/fixtures/speaking';
import type {
  SpeakingAssessmentReport,
  SpeakingDashboardPageData,
  SpeakingPracticePageData,
  SpeakingPrompt,
  SpeakingSessionSnapshot,
} from '@/lib/services/speaking/types';
import { createSpeakingApplicationService } from '@/lib/services/speaking/application-service';

export type { SpeakingAssessmentReport, SpeakingDashboardPageData, SpeakingPracticePageData, SpeakingPrompt };

export function getSampleSpeakingPracticePageData(
  promptId?: string,
  sessionId?: string,
): SpeakingPracticePageData {
  const prompt = speakingPromptBank.find((item) => item.id === promptId) ?? sampleSpeakingPrompt;
  const selectedSession = sampleSpeakingSavedSessions.find((item) => item.sessionId === sessionId) ?? null;

  return {
    prompts: speakingPromptBank,
    prompt,
    initialReport:
      selectedSession?.report ?? sampleSpeakingAssessmentReportsByPromptId[prompt.id] ?? sampleSpeakingAssessmentReport,
    initialTranscript: selectedSession?.transcript ?? getSampleSpeakingTranscript(prompt.id),
    initialDurationSeconds: selectedSession?.durationSeconds ?? prompt.recommendedSeconds,
    initialRecentSessions: sampleSpeakingRecentSessions,
    initialSavedSessions: sampleSpeakingSavedSessions,
    initialPromptId: prompt.id,
    initialSessionId: selectedSession?.sessionId ?? null,
    fallbackReports: sampleSpeakingAssessmentReportsByPromptId,
  };
}

export async function getSampleSpeakingDashboardPageData(): Promise<SpeakingDashboardPageData> {
  const service = createSpeakingApplicationService();
  return service.loadDashboardPageData();
}

export function getSampleSpeakingSession(sessionId?: string): SpeakingSessionSnapshot | undefined {
  return sampleSpeakingSavedSessions.find((session) => session.sessionId === sessionId);
}
