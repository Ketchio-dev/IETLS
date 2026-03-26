import { ReadingDashboard } from '@/components/reading/reading-dashboard';
import { READING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function ReadingDashboardPage() {
  const pageData = await loadAssessmentDashboardPageData(READING_ASSESSMENT_MODULE_ID);

  return <ReadingDashboard {...pageData} />;
}
