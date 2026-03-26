import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { getAssessmentWorkspace } from '@/lib/assessment-workspace';
import { WritingDashboard } from '@/components/writing/writing-dashboard';
import { loadDefaultAssessmentDashboardPageData } from '@/lib/server/assessment-workspace';

export default async function DashboardPage() {
  const pageData = await loadDefaultAssessmentDashboardPageData();

  return <WritingDashboard {...pageData} />;
}
