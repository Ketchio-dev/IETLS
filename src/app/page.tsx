import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { loadAssessmentWorkspacePracticePageData } from '@/lib/server/assessment-module-registry';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadAssessmentWorkspacePracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });

  return <WritingPracticeShell {...pageData} />;
}
