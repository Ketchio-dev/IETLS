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

  return <ReadingPracticeShell {...pageData} />;
}
