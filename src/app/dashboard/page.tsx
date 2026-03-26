import { WRITING_ASSESSMENT_MODULE_ID } from '@/lib/assessment-modules/registry';
import { getAssessmentWorkspace } from '@/lib/assessment-workspace';
import { WritingDashboard } from '@/components/writing/writing-dashboard';

export default async function DashboardPage() {
  const pageData = await getAssessmentWorkspace().loadDashboardPageData(WRITING_ASSESSMENT_MODULE_ID);

  return <WritingDashboard {...pageData} />;
}
