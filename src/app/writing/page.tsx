import Link from 'next/link';

import { WritingPracticeShell } from '@/components/writing/writing-practice-shell';
import { loadDefaultAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WritingPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const pageData = await loadDefaultAssessmentPracticePageData({
    promptId: getSingleSearchParam(resolvedSearchParams.promptId),
    attemptId: getSingleSearchParam(resolvedSearchParams.attemptId),
  });

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Writing practice</span>
      </nav>
      <WritingPracticeShell {...pageData} />
    </main>
  );
}
