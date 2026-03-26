import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { getAssessmentModule } from '@/lib/assessment-modules/registry';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const writingModule = getAssessmentModule('writing');
  const pageData = await writingModule.loadPracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });

  return <WritingPracticeShell {...pageData} />;
}
