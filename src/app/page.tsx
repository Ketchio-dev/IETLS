import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { sampleAssessmentReport, sampleAssessmentReportsByPromptId, samplePrompt, writingPromptBank } from '@/lib/fixtures/writing';
import { listPrompts, listRecentAttempts, listSavedAssessments, seedPrompts } from '@/lib/server/writing-assessment-repository';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  await seedPrompts(writingPromptBank);
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const prompts = await listPrompts();
  const initialHistory = await listRecentAttempts(50);
  const initialSavedAssessments = await listSavedAssessments(50);
  const requestedPromptId = getSingleSearchParam(resolvedSearchParams.promptId);
  const requestedAttemptId = getSingleSearchParam(resolvedSearchParams.attemptId);
  const initialSelectedAssessment =
    initialSavedAssessments.find((attempt) => attempt.submissionId === requestedAttemptId) ?? null;
  const initialSelectedPromptId =
    prompts.some((item) => item.id === requestedPromptId)
      ? requestedPromptId
      : initialSelectedAssessment?.promptId ?? samplePrompt.id;

  return (
    <WritingPracticeShell
      initialHistory={initialHistory}
      initialAttemptId={initialSelectedAssessment?.submissionId}
      initialPromptId={initialSelectedPromptId}
      initialReport={initialSelectedAssessment?.report ?? initialSavedAssessments[0]?.report ?? sampleAssessmentReport}
      initialSavedAssessments={initialSavedAssessments}
      fallbackReports={sampleAssessmentReportsByPromptId}
      prompt={samplePrompt}
      prompts={prompts}
    />
  );
}
