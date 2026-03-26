import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { sampleSpeakingAssessmentReport, sampleSpeakingSavedSessions, speakingPromptBank } from '@/lib/fixtures/speaking';

import { SpeakingPracticeShell } from '../speaking-practice-shell';

describe('SpeakingPracticeShell', () => {
  it('renders the prompt bank, transcript workspace, and recent sessions summary', () => {
    render(
      <SpeakingPracticeShell
        prompts={speakingPromptBank}
        prompt={speakingPromptBank[0]!}
        initialReport={sampleSpeakingAssessmentReport}
        initialTranscript={sampleSpeakingSavedSessions[0]!.transcript}
        initialDurationSeconds={sampleSpeakingSavedSessions[0]!.durationSeconds}
        initialRecentSessions={sampleSpeakingSavedSessions.map((session) => ({
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
        }))}
        initialSavedSessions={sampleSpeakingSavedSessions}
        initialPromptId={speakingPromptBank[0]!.id}
        initialSessionId={sampleSpeakingSavedSessions[0]!.sessionId}
        fallbackReports={{ [speakingPromptBank[0]!.id]: sampleSpeakingAssessmentReport }}
      />,
    );

    expect(screen.getByRole('heading', { name: /run a timed speaking practice flow/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /speaking transcript/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /inspect recent speaking attempts/i })).toBeInTheDocument();
    expect(screen.getAllByText(/part 1 • city living/i).length).toBeGreaterThan(0);
  });
});
