import { AssessmentPlaceholderShell } from '@/components/assessment/assessment-placeholder-shell';
import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentPracticePageData } from '@/lib/server/assessment-workspace';

export default async function ReadingPage() {
  const pageData = await loadAssessmentPracticePageData(READING_ASSESSMENT_MODULE_ID, {});

  return <AssessmentPlaceholderShell {...pageData} />;
}
