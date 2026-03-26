import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { loadWritingPracticePageData } from '@/lib/services/writing/application-service';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadWritingPracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });

  return <WritingPracticeShell {...pageData} />;
}
