import { AssessmentPlaceholderDashboard } from '@/components/assessment/assessment-placeholder-dashboard';
import { LISTENING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function ListeningDashboardPage() {
  const pageData = await loadAssessmentDashboardPageData(LISTENING_ASSESSMENT_MODULE_ID);

  return <AssessmentPlaceholderDashboard {...pageData} />;
}
