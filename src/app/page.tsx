import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { getAssessmentWorkspace } from '@/lib/assessment-workspace';
import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { loadDefaultAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadDefaultAssessmentPracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });

  return <WritingPracticeShell {...pageData} />;
}
