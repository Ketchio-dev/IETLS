import Link from 'next/link';

import { ReadingPracticeShell } from '@/components/reading/reading-practice-shell';
import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

export default async function ReadingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageData = await loadAssessmentPracticePageData(READING_ASSESSMENT_MODULE_ID, resolvedSearchParams);

  return (
    <main className="app-shell">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Reading practice</span>
      </nav>
      <ReadingPracticeShell {...pageData} />
    </main>
  );
}
