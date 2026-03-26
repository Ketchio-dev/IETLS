import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { sampleSpeakingAssessmentReport, sampleSpeakingSavedSessions, speakingPromptBank } from '@/lib/fixtures/speaking';
import type { SpeakingPracticePageData } from '@/lib/services/speaking/types';

const mocks = vi.hoisted(() => ({
  loadAssessmentPracticePageData: vi.fn(),
  shellSpy: vi.fn(),
}));

vi.mock('@/lib/server/assessment-workspace', () => ({
  loadAssessmentPracticePageData: mocks.loadAssessmentPracticePageData,
}));

vi.mock('@/components/speaking/speaking-practice-shell', () => ({
  SpeakingPracticeShell: (props: unknown) => {
    mocks.shellSpy(props);
    return null;
  },
}));

import SpeakingPage from '../page';

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpeakingPage', () => {
  it('hydrates the speaking route through the shared assessment workspace', async () => {
    const pageData: SpeakingPracticePageData = {
      prompts: speakingPromptBank,
      prompt: speakingPromptBank[0]!,
      initialReport: sampleSpeakingAssessmentReport,
      initialTranscript: sampleSpeakingSavedSessions[0]!.transcript,
      initialDurationSeconds: sampleSpeakingSavedSessions[0]!.durationSeconds,
      initialRecentSessions: [],
      initialSavedSessions: sampleSpeakingSavedSessions,
      initialPromptId: speakingPromptBank[1]!.id,
      initialSessionId: sampleSpeakingSavedSessions[0]!.sessionId,
      fallbackReports: {},
    };
    mocks.loadAssessmentPracticePageData.mockResolvedValue(pageData);

    render(
      await SpeakingPage({
        searchParams: Promise.resolve({
          promptId: speakingPromptBank[1]!.id,
          sessionId: sampleSpeakingSavedSessions[0]!.sessionId,
        }),
      }),
    );

    expect(mocks.loadAssessmentPracticePageData).toHaveBeenCalledWith(SPEAKING_ASSESSMENT_MODULE_ID, {
      promptId: speakingPromptBank[1]!.id,
      sessionId: sampleSpeakingSavedSessions[0]!.sessionId,
    });
    expect(mocks.shellSpy).toHaveBeenCalledWith(pageData);
  });
});
