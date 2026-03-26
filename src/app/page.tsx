import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { sampleAssessmentReport, samplePrompt } from '@/lib/fixtures/writing';
import { listRecentAttempts, listSavedAssessments, seedPrompt } from '@/lib/server/writing-assessment-repository';

export default async function HomePage() {
  await seedPrompt(samplePrompt);
  const initialHistory = await listRecentAttempts(5);
  const initialSavedAssessments = await listSavedAssessments(5);

  return (
    <WritingPracticeShell
      initialHistory={initialHistory}
      initialReport={initialSavedAssessments[0]?.report ?? sampleAssessmentReport}
      initialSavedAssessments={initialSavedAssessments}
      prompt={samplePrompt}
    />
  );
}
