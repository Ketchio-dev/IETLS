import { SpeakingDashboard } from '@/components/speaking/speaking-dashboard';
import { SPEAKING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { loadAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function SpeakingDashboardPage() {
  const pageData = await loadAssessmentDashboardPageData(SPEAKING_ASSESSMENT_MODULE_ID);

  return <SpeakingDashboard {...pageData} />;
}
