import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { sampleAssessmentReport, sampleAssessmentReportsByPromptId, samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import { listPrompts, listRecentAttempts, listSavedAssessments, seedPrompts } from '@/lib/server/writing-assessment-repository';

export default async function HomePage() {
  await seedPrompts(writingPromptBank);
  const prompts = await listPrompts();
  const initialHistory = await listRecentAttempts(5);
  const initialSavedAssessments = await listSavedAssessments(5);

  return (
    <WritingPracticeShell
      initialHistory={initialHistory}
      initialReport={initialSavedAssessments[0]?.report ?? sampleAssessmentReport}
      initialSavedAssessments={initialSavedAssessments}
      fallbackReports={sampleAssessmentReportsByPromptId}
      prompt={samplePrompt}
      prompts={prompts}
    />
  );
}
